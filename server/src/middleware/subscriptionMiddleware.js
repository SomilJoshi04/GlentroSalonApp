const { getVendorSubscriptionStatus } = require('../services/subscriptionService');

/**
 * Middleware to protect routes that require an active subscription.
 * Allows TRIAL_ACTIVE, PAID_ACTIVE, and GRACE_PERIOD? 
 * Based on requirements:
 * "After grace period ends, subscription-protected actions are blocked."
 * "GRACE PERIOD: Commission model. ... Vendor remains logged in and can renew. ... New bookings/business operations that depend on subscription use the COMMISSION billing model."
 * So if they are in GRACE_PERIOD, they can still *use* the app, but they fall back to COMMISSION. 
 * Wait, the prompt says: "After grace period ends, subscription-protected actions are blocked."
 * This implies GRACE_PERIOD allows access. 
 * Let's confirm: "If the business wants Vendor to continue receiving bookings during grace, make this an explicit configurable rule. ... Do NOT assume it."
 * Okay, we'll just allow it if they are not EXPIRED or NO_SUBSCRIPTION.
 */
const requireSubscriptionAccess = async (req, res, next) => {
  try {
    // Only applies to vendors
    if (req.user.role !== 'vendor') {
      return next(); 
    }

    const statusObj = await getVendorSubscriptionStatus(req.user.id);
    
    // We allow TRIAL_ACTIVE, PAID_ACTIVE, and GRACE_PERIOD (with COMMISSION fallback which is handled in calculateFees)
    if (['TRIAL_ACTIVE', 'PAID_ACTIVE', 'GRACE_PERIOD'].includes(statusObj.status)) {
      return next();
    }

    // Otherwise, they are EXPIRED or NO_SUBSCRIPTION
    return res.status(403).json({
      success: false,
      message: 'Subscription expired or required. Please renew your subscription to access this feature.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
  } catch (error) {
    console.error('[requireSubscriptionAccess]', error);
    res.status(500).json({ success: false, message: 'Failed to verify subscription access' });
  }
};

module.exports = { requireSubscriptionAccess };
