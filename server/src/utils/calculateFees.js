const PlatformFee = require('../models/PlatformFee');

/**
 * Calculate cancellation fee based on time until appointment
 * 
 * Business Rule:
 * - >= 60 minutes before: No cancellation fee
 * - < 60 minutes before: Cancellation fee applies (percentage from PlatformFee)
 * 
 * @param {Object} booking - Booking document
 * @returns {Object} { canCancel, cancellationFee, feePercentage }
 */
const calculateCancellationFee = async (booking) => {
  const now = new Date();
  const bookingDateTime = new Date(booking.bookingDate);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  const minutesUntilAppointment = (bookingDateTime - now) / (1000 * 60);

  // Get platform fee settings
  const platformFee = await PlatformFee.findOne({ isActive: true });
  const cancellationFeePercentage = platformFee ? platformFee.cancellationFeePercentage : 25;

  if (minutesUntilAppointment >= 60) {
    return {
      canCancel: true,
      cancellationFee: 0,
      feePercentage: 0,
      minutesUntilAppointment: Math.round(minutesUntilAppointment),
    };
  }

  // Within 59 minutes - fee applies
  const fee = (booking.finalAmount * cancellationFeePercentage) / 100;
  return {
    canCancel: true,
    cancellationFee: Math.round(fee * 100) / 100,
    feePercentage: cancellationFeePercentage,
    minutesUntilAppointment: Math.round(minutesUntilAppointment),
  };
};

/**
 * Calculate booking total with optional coupon discount
 * 
 * @param {Array} services - Array of service objects with price
 * @param {Object|null} coupon - Coupon document or null
 * @param {Object|null} pkg - Package document or null
 * @returns {Object} { totalAmount, discountAmount, finalAmount, packageDiscount }
 */
const calculateBookingTotal = (services, coupon = null, pkg = null) => {
  const originalTotal = services.reduce((sum, s) => sum + s.price, 0);
  let baseAmount = originalTotal;
  let packageDiscount = 0;

  if (pkg) {
    baseAmount = pkg.discountedPrice;
    packageDiscount = originalTotal - baseAmount;
    if (packageDiscount < 0) packageDiscount = 0; // Guard against bad data
  }

  let couponDiscount = 0;

  if (coupon) {
    // If a package is applied and the coupon is NOT applicable to offers, skip coupon
    if (pkg && coupon.applicableToOffers === false) {
      couponDiscount = 0;
    } else {
      if (coupon.discountType === 'percentage') {
        couponDiscount = (baseAmount * coupon.discountValue) / 100;
        if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
          couponDiscount = coupon.maxDiscount;
        }
      } else {
        couponDiscount = coupon.discountValue;
      }
    }
  }

  couponDiscount = Math.min(couponDiscount, baseAmount);
  const finalAmount = Math.round((baseAmount - couponDiscount) * 100) / 100;
  const totalDiscount = Math.round((packageDiscount + couponDiscount) * 100) / 100;

  return {
    totalAmount: Math.round(originalTotal * 100) / 100,
    discountAmount: totalDiscount,
    couponDiscount: Math.round(couponDiscount * 100) / 100,
    packageDiscount: Math.round(packageDiscount * 100) / 100,
    finalAmount,
  };
};

/**
 * Calculate financial breakdown for a booking
 * Determines commission vs subscription, platform fee, and vendor payout
 * 
 * @param {Object} vendor - Vendor document
 * @param {number} bookingAmount - Final booking amount
 * @returns {Object} { commission, platformFee, vendorPayout }
 */
const calculateFinancialBreakdown = async (vendor, bookingAmount) => {
  const platformFeeDoc = await PlatformFee.findOne({ isActive: true });
  const platformFeePercentage = platformFeeDoc ? platformFeeDoc.feePercentage : 5;

  const platformFee = Math.round((bookingAmount * platformFeePercentage) / 100 * 100) / 100;
  let commission = 0;

  // If vendor has active subscription, no commission
  if (vendor.hasActiveSubscription && vendor.hasActiveSubscription()) {
    commission = 0;
  } else {
    // Commission plan - use vendor's commission rate
    const commissionRate = vendor.commissionRate || 0;
    commission = Math.round((bookingAmount * commissionRate) / 100 * 100) / 100;
  }

  const vendorPayout = Math.round((bookingAmount - commission - platformFee) * 100) / 100;

  return {
    commission,
    platformFee,
    vendorPayout,
    platformFeePercentage,
    commissionRate: vendor.commissionRate || 0,
    hasSubscription: vendor.hasActiveSubscription ? vendor.hasActiveSubscription() : false,
  };
};

module.exports = {
  calculateCancellationFee,
  calculateBookingTotal,
  calculateFinancialBreakdown,
};
