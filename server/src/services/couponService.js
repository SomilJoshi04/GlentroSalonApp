const Coupon = require('../models/Coupon');

/**
 * Validate a coupon code
 */
const validateCoupon = async (code, orderAmount) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    throw new Error('Invalid coupon code');
  }

  if (!coupon.isActive) {
    throw new Error('Coupon is no longer active');
  }

  const now = new Date();
  if (now < coupon.validFrom) {
    throw new Error('Coupon is not yet valid');
  }
  if (now > coupon.validTo) {
    throw new Error('Coupon has expired');
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error('Coupon usage limit reached');
  }

  if (orderAmount < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
  }

  return coupon;
};

/**
 * Apply coupon and calculate discount
 */
const applyCoupon = async (code, orderAmount) => {
  const coupon = await validateCoupon(code, orderAmount);

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, orderAmount);

  return {
    coupon,
    discount: Math.round(discount * 100) / 100,
    finalAmount: Math.round((orderAmount - discount) * 100) / 100,
  };
};

/**
 * Increment coupon usage count
 */
const incrementUsage = async (couponId) => {
  await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
};

module.exports = {
  validateCoupon,
  applyCoupon,
  incrementUsage,
};
