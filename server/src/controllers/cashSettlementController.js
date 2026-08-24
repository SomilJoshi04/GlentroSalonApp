const CashSettlement = require('../models/CashSettlement');
const VendorLedger = require('../models/VendorLedger');
const { getVendorFinancials, syncVendorCashSuspension } = require('../services/vendorCashService');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config/env');

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * Get authoritative cash settlement status for vendor
 */
const getStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const financials = await getVendorFinancials(vendorId);
    
    res.json({
      success: true,
      data: financials,
    });
  } catch (error) {
    console.error('Error fetching cash settlement status:', error);
    res.status(500).json({ success: false, message: 'Server error fetching status' });
  }
};

/**
 * Create a new Razorpay order to pay outstanding cash settlement
 */
const createSettlement = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Cancel any existing abandoned PENDING settlements for this vendor 
    // to avoid "No outstanding cash settlement required" error on retry.
    await CashSettlement.updateMany(
      { vendor: vendorId, status: 'PENDING' },
      { $set: { status: 'CANCELLED' } }
    );

    const financials = await getVendorFinancials(vendorId);

    if (financials.settlementRemainingPaise <= 0) {
      return res.status(400).json({ success: false, message: 'No outstanding cash settlement required' });
    }

    const amountPaise = financials.settlementRemainingPaise;

    // Create Razorpay Order
    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `cs_${Date.now()}_${vendorId.toString().substring(0, 5)}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order || !order.id) {
      return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }

    // Create CashSettlement record
    const settlement = await CashSettlement.create({
      vendor: vendorId,
      amountPaise,
      razorpayOrderId: order.id,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      data: {
        settlementId: settlement.settlementId,
        razorpayOrderId: order.id,
        amountPaise,
        currency: 'INR',
        keyId: RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('Error creating cash settlement:', error);
    res.status(500).json({ success: false, message: 'Server error creating settlement' });
  }
};

/**
 * Verify Razorpay payment and mark settlement as PAID
 */
const verifySettlement = async (req, res) => {
  const session = await CashSettlement.startSession();
  session.startTransaction();

  try {
    const vendorId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Find the pending settlement
    const settlement = await CashSettlement.findOne({
      razorpayOrderId: razorpay_order_id,
      vendor: vendorId,
    }).session(session);

    if (!settlement) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Settlement not found or does not belong to you' });
    }

    // Idempotency check
    if (settlement.status === 'PAID') {
      await session.abortTransaction();
      return res.json({ success: true, message: 'Settlement already marked as paid' });
    }

    // Verify payment from Razorpay API
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!payment || payment.status !== 'captured' || payment.amount !== settlement.amountPaise) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Payment not captured or amount mismatch' });
    }

    // Update settlement
    settlement.status = 'PAID';
    settlement.razorpayPaymentId = razorpay_payment_id;
    settlement.paidAt = new Date();
    settlement.verifiedAt = new Date();
    await settlement.save({ session });

    // Record in VendorLedger
    await VendorLedger.create(
      [
        {
          vendor: vendorId,
          entryType: 'CASH_SETTLEMENT_PAID',
          amount: settlement.amountPaise / 100, // Legacy fallback
          amountPaise: settlement.amountPaise,
          direction: 'DEBIT', // From vendor's perspective (reducing cash held)
          paymentMethod: 'ONLINE',
          description: 'Cash Limit Settlement',
          metadata: { settlementId: settlement._id },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Out of transaction: re-calculate and sync suspension
    await syncVendorCashSuspension(vendorId);

    res.json({
      success: true,
      message: 'Settlement successful',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error verifying cash settlement:', error);
    res.status(500).json({ success: false, message: 'Server error verifying settlement' });
  }
};

module.exports = {
  getStatus,
  createSettlement,
  verifySettlement,
};
