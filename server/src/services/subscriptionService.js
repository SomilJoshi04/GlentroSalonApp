const Vendor = require('../models/Vendor');
const Subscription = require('../models/Subscription');

/**
 * Check if vendor has active subscription
 */
const checkVendorSubscription = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId).populate('subscriptionPlan.plan');
  if (!vendor) throw new Error('Vendor not found');

  const hasActive = vendor.hasActiveSubscription();
  return {
    hasSubscription: hasActive,
    plan: hasActive ? vendor.subscriptionPlan.plan : null,
    startDate: vendor.subscriptionPlan?.startDate,
    endDate: vendor.subscriptionPlan?.endDate,
  };
};

/**
 * Assign subscription plan to vendor
 */
const assignSubscription = async (vendorId, planId) => {
  const plan = await Subscription.findById(planId);
  if (!plan || !plan.isActive) throw new Error('Subscription plan not found or inactive');

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + plan.duration);

  await Vendor.findByIdAndUpdate(vendorId, {
    subscriptionPlan: {
      plan: plan._id,
      startDate,
      endDate,
      isActive: true,
    },
  });

  return {
    plan,
    startDate,
    endDate,
  };
};

/**
 * Cancel vendor subscription
 */
const cancelSubscription = async (vendorId) => {
  await Vendor.findByIdAndUpdate(vendorId, {
    'subscriptionPlan.isActive': false,
  });
};

module.exports = {
  checkVendorSubscription,
  assignSubscription,
  cancelSubscription,
};
