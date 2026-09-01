const mongoose = require('mongoose');
const CashSettlement = require('../models/CashSettlement');
const VendorCashLedger = require('../models/VendorCashLedger');
const VendorLedger = require('../models/VendorLedger');
const { creditWalletFromSettlement } = require('./withdrawalService');
const { syncVendorCashSuspension } = require('./vendorCashService');

/**
 * Runs the settlement allocation inside a transaction.
 * Separated so the retry wrapper can call it multiple times.
 */
const _runAllocationTransaction = async (settlementId, paymentId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lockedSettlement = await CashSettlement.findById(settlementId).session(session);
    if (!lockedSettlement || lockedSettlement.status === 'PAID') {
      await session.abortTransaction();
      session.endSession();
      return { alreadyProcessed: true };
    }

    let remainingSettlementToAllocate = lockedSettlement.amountPaise;
    let totalWalletCreditPaise = 0;
    const allocatedCashLedgers = [];

    const unsettledLedgers = await VendorCashLedger.find({
      vendor: lockedSettlement.vendor,
      cashStatus: { $in: ['UNSETTLED', 'PARTIALLY_SETTLED'] },
    })
      .sort({ createdAt: 1, _id: 1 })
      .session(session);

    for (const ledger of unsettledLedgers) {
      if (remainingSettlementToAllocate <= 0) break;

      const canSettleFromThisLedger = Math.min(remainingSettlementToAllocate, ledger.remainingUnsettledAmountPaise);
      let vendorShareToCredit = 0;
      
      if (canSettleFromThisLedger === ledger.remainingUnsettledAmountPaise) {
        vendorShareToCredit = ledger.remainingVendorNetSharePaise;
        ledger.cashStatus = 'SETTLED';
      } else {
        vendorShareToCredit = Math.floor((canSettleFromThisLedger * ledger.vendorNetSharePaise) / ledger.grossAmountPaise);
        ledger.cashStatus = 'PARTIALLY_SETTLED';
      }

      ledger.settledAmountPaise += canSettleFromThisLedger;
      ledger.remainingUnsettledAmountPaise -= canSettleFromThisLedger;
      ledger.remainingVendorNetSharePaise -= vendorShareToCredit;
      
      ledger.settlementAllocations.push({
        settlementId: lockedSettlement._id,
        amountPaise: canSettleFromThisLedger,
        vendorSharePaise: vendorShareToCredit,
      });

      await ledger.save({ session });
      remainingSettlementToAllocate -= canSettleFromThisLedger;
      totalWalletCreditPaise += vendorShareToCredit;
      allocatedCashLedgers.push({
        cashLedgerId: ledger._id,
        amountPaise: canSettleFromThisLedger,
        vendorSharePaise: vendorShareToCredit,
      });
    }

    lockedSettlement.status = 'PAID';
    lockedSettlement.razorpayPaymentId = paymentId || lockedSettlement.razorpayPaymentId;
    lockedSettlement.paidAt = new Date();
    lockedSettlement.verifiedAt = new Date();
    lockedSettlement.vendorWalletCreditPaise = totalWalletCreditPaise;
    lockedSettlement.allocatedCashLedgers = allocatedCashLedgers;
    await lockedSettlement.save({ session });

    await VendorLedger.create(
      [
        {
          vendor: lockedSettlement.vendor,
          settlement: lockedSettlement._id,
          entryType: 'CASH_SETTLEMENT_PAID',
          amount: lockedSettlement.amountPaise / 100,
          amountPaise: lockedSettlement.amountPaise,
          direction: 'DEBIT',
          paymentMethod: 'ONLINE',
          description: `[Webhook] Cash Limit Settlement`,
          metadata: { settlementId: lockedSettlement._id },
        },
      ],
      { session }
    );

    await creditWalletFromSettlement({
      vendorId: lockedSettlement.vendor,
      settlementId: lockedSettlement._id,
      amountPaise: totalWalletCreditPaise,
      description: `Vendor Net Share credited from Cash Settlement #${lockedSettlement._id}`,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    // Sync suspension state AFTER commit (outside transaction)
    await syncVendorCashSuspension(lockedSettlement.vendor);

    return { alreadyProcessed: false, success: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Retry wrapper — MongoDB recommends retrying on TransientTransactionError (WriteConflict code 112)
 * Uses exponential backoff: 100ms → 200ms → 400ms → 800ms → 1600ms
 */
const processCashSettlementAllocation = async (settlementId, paymentId, maxRetries = 5) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await _runAllocationTransaction(settlementId, paymentId);
    } catch (error) {
      const isTransient =
        error.errorLabels?.includes('TransientTransactionError') ||
        error.code === 112 || // WriteConflict
        error.codeName === 'WriteConflict';

      attempt++;
      if (isTransient && attempt < maxRetries) {
        const delayMs = Math.min(100 * Math.pow(2, attempt - 1), 1600); // 100, 200, 400, 800, 1600ms
        console.warn(`[CashSettle] WriteConflict on attempt ${attempt}, retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        // Either not transient or exhausted retries — rethrow
        console.error(`[CashSettle] Failed after ${attempt} attempt(s):`, error.message);
        throw error;
      }
    }
  }
};

module.exports = {
  processCashSettlementAllocation
};

