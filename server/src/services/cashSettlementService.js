const mongoose = require('mongoose');
const CashSettlement = require('../models/CashSettlement');
const VendorCashLedger = require('../models/VendorCashLedger');
const VendorLedger = require('../models/VendorLedger');
const { creditWalletFromSettlement } = require('./withdrawalService');
const { syncVendorCashSuspension } = require('./vendorCashService');

const processCashSettlementAllocation = async (settlementId, paymentId) => {
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

    await syncVendorCashSuspension(lockedSettlement.vendor);

    return { alreadyProcessed: false, success: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = {
  processCashSettlementAllocation
};
