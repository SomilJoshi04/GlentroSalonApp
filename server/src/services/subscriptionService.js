const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Subscription = require('../models/Subscription');
const VendorSubscription = require('../models/VendorSubscription');
const SubscriptionSetting = require('../models/SubscriptionSetting');
const razorpay = require('../utils/razorpay');

/**
 * Helper to get active subscription settings
 */
const getSubscriptionSettings = async () => {
  let settings = await SubscriptionSetting.findOne({ singletonObj: 'SINGLETON' });
  if (!settings) {
    settings = await SubscriptionSetting.create({ singletonObj: 'SINGLETON' });
  }
  return settings;
};

/**
 * 1. getVendorSubscriptionStatus(vendorId)
 * Central source of truth.
 * Returns: { status: 'TRIAL_ACTIVE' | 'PAID_ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'NO_SUBSCRIPTION', plan: object, endDate: Date }
 */
const getVendorSubscriptionStatus = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error('Vendor not found');

  const settings = await getSubscriptionSettings();

  // Find the currently active or most recently expired subscription
  const currentSub = await VendorSubscription.findOne({
    vendor: vendorId,
    status: { $in: ['ACTIVE', 'EXPIRED'] }
  }).sort({ endDate: -1 }).populate('plan');

  if (!currentSub) {
    return { status: 'NO_SUBSCRIPTION', plan: null, endDate: null };
  }

  const now = new Date();
  
  if (currentSub.endDate > now && currentSub.status === 'ACTIVE') {
    return {
      status: currentSub.type === 'TRIAL' ? 'TRIAL_ACTIVE' : 'PAID_ACTIVE',
      plan: currentSub.plan,
      endDate: currentSub.endDate,
      currentSubId: currentSub._id,
    };
  }

  // It is expired. Check grace period.
  // Grace period applies after the endDate.
  if (currentSub.status === 'ACTIVE') {
    // Has passed endDate but status not yet updated by cron
    await VendorSubscription.findByIdAndUpdate(currentSub._id, { status: 'EXPIRED' });
    currentSub.status = 'EXPIRED';
  }

  const gracePeriodDays = currentSub.gracePeriodDays !== undefined ? currentSub.gracePeriodDays : settings.gracePeriodDays;
  const graceEnd = new Date(currentSub.endDate);
  graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);

  if (now <= graceEnd) {
    return {
      status: 'GRACE_PERIOD',
      plan: currentSub.plan,
      endDate: currentSub.endDate, // Keep original end date
      graceEnd,
      currentSubId: currentSub._id,
    };
  }

  return {
    status: 'EXPIRED',
    plan: currentSub.plan,
    endDate: currentSub.endDate,
    currentSubId: currentSub._id,
  };
};

/**
 * 2. startFreeTrial(vendorId)
 */
const startFreeTrial = async (vendorId) => {
  const settings = await getSubscriptionSettings();

  if (!settings.systemEnabled) {
    throw new Error('Subscription system is currently disabled');
  }

  if (!settings.freeTrialEnabled) {
    throw new Error('Free trial is currently disabled');
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error('Vendor not found');

  if (vendor.trialUsed && settings.allowTrialOnce) {
    throw new Error('TRIAL_ALREADY_USED');
  }

  // Check if they currently have any subscription
  const currentStatus = await getVendorSubscriptionStatus(vendorId);
  if (['TRIAL_ACTIVE', 'PAID_ACTIVE', 'GRACE_PERIOD'].includes(currentStatus.status)) {
    throw new Error('Vendor already has an active subscription or is in grace period');
  }

  // Start Trial
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + settings.trialDurationDays);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const trialRecord = await VendorSubscription.create([{
      vendor: vendorId,
      type: 'TRIAL',
      status: 'ACTIVE',
      startDate,
      endDate,
      gracePeriodDays: settings.gracePeriodDays,
      durationSnapshot: settings.trialDurationDays,
      durationUnitSnapshot: 'DAYS',
    }], { session });

    await Vendor.findByIdAndUpdate(vendorId, {
      trialUsed: true,
      trialStartedAt: startDate,
      trialEndsAt: endDate,
    }, { session });

    await session.commitTransaction();
    session.endSession();

    return trialRecord[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * 3. createSubscriptionOrder(vendorId, planId)
 */
const createSubscriptionOrder = async (vendorId, planId) => {
  const plan = await Subscription.findById(planId);
  if (!plan || !plan.isActive) throw new Error('Subscription plan not found or inactive');

  const amountPaise = plan.pricePaise || Math.round(plan.price * 100);
  const currency = plan.currency || 'INR';

  if (!razorpay) throw new Error('Razorpay is not configured');

  const options = {
    amount: amountPaise,
    currency,
    receipt: `sub_req_${vendorId}_${Date.now()}`,
    notes: {
      vendorId: vendorId.toString(),
      planId: planId.toString(),
      type: 'VENDOR_SUBSCRIPTION',
    },
  };

  const order = await razorpay.orders.create(options);
  
  return {
    orderId: order.id,
    amountPaise,
    currency,
    plan,
    keyId: process.env.RAZORPAY_KEY_ID
  };
};

/**
 * 4. verifySubscriptionPayment(paymentData)
 */
const verifySubscriptionPayment = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature, vendorId, planId }) => {
  const crypto = require('crypto');
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(razorpayOrderId + '|' + razorpayPaymentId)
    .digest('hex');

  if (generatedSignature !== razorpaySignature) {
    throw new Error('PAYMENT_VERIFICATION_FAILED');
  }

  // Verify payment via Razorpay API to be absolutely sure
  const payment = await razorpay.payments.fetch(razorpayPaymentId);
  if (payment.status !== 'captured') {
    throw new Error('Payment not captured');
  }

  if (payment.notes.vendorId !== vendorId.toString()) {
    throw new Error('Vendor ID mismatch in payment notes');
  }

  // Idempotency: Check if already processed
  const existingRecord = await VendorSubscription.findOne({ razorpayPaymentId });
  if (existingRecord) {
    return { success: true, message: 'Already processed', record: existingRecord };
  }

  const plan = await Subscription.findById(planId);
  if (!plan) throw new Error('Plan not found');

  const settings = await getSubscriptionSettings();

  // Determine dates
  const currentStatus = await getVendorSubscriptionStatus(vendorId);
  let startDate = new Date();
  
  // If they have an active PAID subscription, queue it up after the end date.
  if (currentStatus.status === 'PAID_ACTIVE' && currentStatus.endDate > startDate) {
    startDate = new Date(currentStatus.endDate);
  }

  // NOTE: If they are on TRIAL, we start immediately (and the trial is effectively replaced/overwritten).

  const endDate = new Date(startDate);
  const durationValue = plan.duration;
  const durationUnit = plan.durationUnit || 'MONTHS';

  if (durationUnit === 'MONTHS') {
    endDate.setMonth(endDate.getMonth() + durationValue);
  } else if (durationUnit === 'YEARS') {
    endDate.setFullYear(endDate.getFullYear() + durationValue);
  } else if (durationUnit === 'DAYS') {
    endDate.setDate(endDate.getDate() + durationValue);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // If trial is active, we can mark it expired to avoid overlapping active states
    if (currentStatus.status === 'TRIAL_ACTIVE' && currentStatus.currentSubId) {
      await VendorSubscription.findByIdAndUpdate(currentStatus.currentSubId, {
        status: 'EXPIRED'
      }, { session });
    }

    const pricePaise = plan.pricePaise || Math.round(plan.price * 100);

    const subscriptionRecord = await VendorSubscription.create([{
      vendor: vendorId,
      plan: planId,
      type: 'PAID',
      status: 'ACTIVE',
      startDate,
      endDate,
      pricePaise,
      currency: plan.currency || 'INR',
      planNameSnapshot: plan.name,
      durationSnapshot: durationValue,
      durationUnitSnapshot: durationUnit,
      razorpayOrderId,
      razorpayPaymentId,
      gracePeriodDays: settings.gracePeriodDays,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return { success: true, record: subscriptionRecord[0] };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * 5. handleWebhook(payload)
 * We only need to process if payment verification failed in frontend.
 * Same logic as verifySubscriptionPayment but from webhook data.
 */
const handleSubscriptionWebhook = async (payload) => {
  // Extract payment entity
  const payment = payload.payload.payment.entity;
  
  if (payment.notes && payment.notes.type === 'VENDOR_SUBSCRIPTION') {
    const razorpayPaymentId = payment.id;
    const razorpayOrderId = payment.order_id;
    const vendorId = payment.notes.vendorId;
    const planId = payment.notes.planId;

    // Check if already processed
    const existingRecord = await VendorSubscription.findOne({ razorpayPaymentId });
    if (existingRecord) {
      console.log(`[Subscription Webhook] Payment ${razorpayPaymentId} already processed.`);
      return true;
    }

    try {
      // Create mock signature if needed, or bypass signature check since webhook itself is verified in controller
      // We'll refactor slightly to allow internal call
      const plan = await Subscription.findById(planId);
      const settings = await getSubscriptionSettings();
      
      const currentStatus = await getVendorSubscriptionStatus(vendorId);
      let startDate = new Date();
      if (currentStatus.status === 'PAID_ACTIVE' && currentStatus.endDate > startDate) {
        startDate = new Date(currentStatus.endDate);
      }

      const endDate = new Date(startDate);
      const durationValue = plan.duration;
      const durationUnit = plan.durationUnit || 'MONTHS';

      if (durationUnit === 'MONTHS') {
        endDate.setMonth(endDate.getMonth() + durationValue);
      } else if (durationUnit === 'YEARS') {
        endDate.setFullYear(endDate.getFullYear() + durationValue);
      } else if (durationUnit === 'DAYS') {
        endDate.setDate(endDate.getDate() + durationValue);
      }

      if (currentStatus.status === 'TRIAL_ACTIVE' && currentStatus.currentSubId) {
        await VendorSubscription.findByIdAndUpdate(currentStatus.currentSubId, { status: 'EXPIRED' });
      }

      const pricePaise = plan.pricePaise || Math.round(plan.price * 100);

      await VendorSubscription.create({
        vendor: vendorId,
        plan: planId,
        type: 'PAID',
        status: 'ACTIVE',
        startDate,
        endDate,
        pricePaise,
        currency: plan.currency || 'INR',
        planNameSnapshot: plan.name,
        durationSnapshot: durationValue,
        durationUnitSnapshot: durationUnit,
        razorpayOrderId,
        razorpayPaymentId,
        gracePeriodDays: settings.gracePeriodDays,
      });

      console.log(`[Subscription Webhook] Successfully processed subscription for vendor ${vendorId}`);
      return true;
    } catch (err) {
      console.error(`[Subscription Webhook] Error processing payment ${razorpayPaymentId}:`, err);
      return false; // let razorpay retry
    }
  }
  return true;
};

// Also export a backward-compatible check if needed, but better to use getVendorSubscriptionStatus
module.exports = {
  getSubscriptionSettings,
  getVendorSubscriptionStatus,
  startFreeTrial,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  handleSubscriptionWebhook,
};
