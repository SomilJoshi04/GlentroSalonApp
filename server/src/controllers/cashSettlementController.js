const CashSettlement = require('../models/CashSettlement');
const VendorLedger = require('../models/VendorLedger');
const { getVendorFinancials, syncVendorCashSuspension } = require('../services/vendorCashService');
const razorpay = require('../utils/razorpay');
const crypto = require('crypto');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config/env');

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

    let amountPaise = financials.settlementRemainingPaise;

    if (req.body && req.body.amountPaise) {
      const requestedPaise = parseInt(req.body.amountPaise, 10);
      if (isNaN(requestedPaise) || requestedPaise <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid settlement amount' });
      }

      // Minimum allowed is the required excess cash (to lift suspension)
      if (requestedPaise < financials.settlementRemainingPaise) {
        return res.status(400).json({ 
          success: false, 
          message: `Amount must be at least ₹${(financials.settlementRemainingPaise / 100).toFixed(2)} to clear the limit.` 
        });
      }

      // Maximum allowed is the total physical cash they actually hold
      if (requestedPaise > financials.cashHeldPaise) {
        return res.status(400).json({ 
          success: false, 
          message: `Amount cannot exceed your total cash held (₹${(financials.cashHeldPaise / 100).toFixed(2)}).` 
        });
      }

      amountPaise = requestedPaise;
    }

    if (amountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'No outstanding cash settlement required' });
    }

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Online payments are currently disabled or not configured on this server.',
      });
    }

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
  try {
    const vendorId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log(`[CashSettle] Verify called: order=${razorpay_order_id}, payment=${razorpay_payment_id}`);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    if (!razorpay || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Online payments are currently disabled or not configured on this server.',
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[CashSettle] Signature mismatch!');
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
    console.log('[CashSettle] Signature verified ✅');

    // Find the pending settlement
    const settlement = await CashSettlement.findOne({
      razorpayOrderId: razorpay_order_id,
      vendor: vendorId,
    });

    if (!settlement) {
      console.error(`[CashSettle] Settlement not found for order=${razorpay_order_id}, vendor=${vendorId}`);
      return res.status(404).json({ success: false, message: 'Settlement not found or does not belong to you' });
    }
    console.log(`[CashSettle] Settlement found: id=${settlement._id}, status=${settlement.status}, amount=${settlement.amountPaise}`);

    // Idempotency check
    if (settlement.status === 'PAID') {
      return res.json({ success: true, message: 'Settlement already marked as paid' });
    }

    // Verify payment from Razorpay API
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log(`[CashSettle] Razorpay payment: status=${payment?.status}, amount=${payment?.amount}`);
    
    // Accept both 'captured' (production) and 'authorized' (test mode)
    const isValidStatus = payment && (payment.status === 'captured' || payment.status === 'authorized');
    // Allow 1 paise tolerance for rounding differences
    const isAmountMatch = payment && Math.abs(payment.amount - settlement.amountPaise) <= 1;
    
    if (!isValidStatus || !isAmountMatch) {
      console.error(`[CashSettle] ❌ Verify failed: status=${payment?.status}, amount=${payment?.amount}, expected=${settlement.amountPaise}`);
      return res.status(400).json({ 
        success: false, 
        message: `Payment not verified. Status: ${payment?.status}, Amount: ₹${(payment?.amount/100).toFixed(2)}, Expected: ₹${(settlement.amountPaise/100).toFixed(2)}`
      });
    }
    console.log('[CashSettle] Payment valid ✅ — processing allocation...');

    // Call the unified allocation service (handles FIFO and Wallet Credit)
    const { processCashSettlementAllocation } = require('../services/cashSettlementService');
    const result = await processCashSettlementAllocation(settlement._id, razorpay_payment_id);

    if (result.alreadyProcessed) {
      return res.json({ success: true, message: 'Settlement already marked as paid' });
    }

    console.log('[CashSettle] ✅ Settlement processed successfully');
    res.json({
      success: true,
      message: 'Settlement successful',
    });
  } catch (error) {
    console.error('Error verifying cash settlement:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error verifying settlement' });
  }
};


module.exports = {
  getStatus,
  createSettlement,
  verifySettlement,
};
