const Vendor = require('../models/Vendor');
const Commission = require('../models/Commission');
const PlatformFee = require('../models/PlatformFee');

/**
 * Calculate charges for a booking based on vendor's plan
 */
const calculateCharges = async (vendorId, bookingAmount) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error('Vendor not found');

  // Get platform fee
  const platformFeeDoc = await PlatformFee.findOne({ isActive: true });
  const platformFeePercentage = platformFeeDoc ? platformFeeDoc.feePercentage : 5;
  const platformFee = Math.round((bookingAmount * platformFeePercentage) / 100 * 100) / 100;

  let commission = 0;
  let commissionRate = 0;

  // Check if vendor has active subscription
  if (vendor.hasActiveSubscription()) {
    // Subscription vendor - no commission, only platform fee
    commission = 0;
  } else {
    // Commission plan vendor
    const commissionDoc = await Commission.findOne({ vendor: vendorId, isActive: true });
    commissionRate = commissionDoc ? commissionDoc.percentage : vendor.commissionRate || 0;
    commission = Math.round((bookingAmount * commissionRate) / 100 * 100) / 100;
  }

  const vendorPayout = Math.round((bookingAmount - commission - platformFee) * 100) / 100;

  return {
    commission,
    commissionRate,
    platformFee,
    platformFeePercentage,
    vendorPayout,
    hasSubscription: vendor.hasActiveSubscription(),
  };
};

module.exports = { calculateCharges };
