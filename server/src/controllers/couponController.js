const Coupon = require('../models/Coupon');
const couponService = require('../services/couponService');

const getCoupons = async (req, res, next) => {
  try {
    const { isActive, page = 1, limit = 20 } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const coupons = await Coupon.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Coupon.countDocuments(query);
    res.json({ success: true, data: { coupons, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (error) { next(error); }
};

const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  } catch (error) { next(error); }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon updated', data: coupon });
  } catch (error) { next(error); }
};

const deleteCoupon = async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) { next(error); }
};

const toggleCouponStatus = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, data: coupon });
  } catch (error) { next(error); }
};

const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount, packageId } = req.body;
    const result = await couponService.applyCoupon(code, amount, packageId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getCoupons, getCouponById, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus, validateCoupon };
