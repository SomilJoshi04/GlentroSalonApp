const Subscription = require('../models/Subscription');
const VendorSubscription = require('../models/VendorSubscription');
const subscriptionService = require('../services/subscriptionService');

const getPlans = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    const { page, limit } = req.query;
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Subscription.countDocuments(query);
      const plans = await Subscription.find(query)
        .sort({ displayOrder: 1, price: 1 })
        .skip(skip)
        .limit(parseInt(limit));
      return res.json({
        success: true,
        data: {
          plans,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    const plans = await Subscription.find(query).sort({ displayOrder: 1, price: 1 });
    res.json({ success: true, data: plans });
  } catch (error) { next(error); }
};

const createPlan = async (req, res, next) => {
  try {
    const plan = await Subscription.create(req.body);
    res.status(201).json({ success: true, message: 'Subscription plan created', data: plan });
  } catch (error) { next(error); }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, message: 'Plan updated', data: plan });
  } catch (error) { next(error); }
};

const deletePlan = async (req, res, next) => {
  try {
    await Subscription.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) { next(error); }
};

// Check Status
const checkSubscription = async (req, res, next) => {
  try {
    const vendorId = req.user.role === 'vendor' ? req.user.id : req.params.vendorId;
    const result = await subscriptionService.getVendorSubscriptionStatus(vendorId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

// Trial
const startTrial = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const trialRecord = await subscriptionService.startFreeTrial(vendorId);
    res.json({ success: true, message: 'Free trial started successfully', data: trialRecord });
  } catch (error) { next(error); }
};

// Payment - Create Order
const createOrder = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ success: false, message: 'planId is required' });
    const orderData = await subscriptionService.createSubscriptionOrder(vendorId, planId);
    res.json({ success: true, data: orderData });
  } catch (error) { next(error); }
};

// Payment - Verify
const verifyPayment = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId } = req.body;
    const result = await subscriptionService.verifySubscriptionPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      vendorId,
      planId
    });
    res.json({ success: true, message: 'Subscription successfully purchased', data: result.record });
  } catch (error) { next(error); }
};

// Admin Cancel/Revoke
const cancelSubscription = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { cancelReason } = req.body;
    
    // Find active subscriptions and mark them cancelled
    await VendorSubscription.updateMany(
      { vendor: vendorId, status: 'ACTIVE' },
      { $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason } }
    );
    
    res.json({ success: true, message: 'Active subscriptions cancelled for vendor' });
  } catch (error) { next(error); }
};

// Admin View History
const getSubscriptionHistory = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const history = await VendorSubscription.find({ vendor: vendorId })
      .populate('plan')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: history });
  } catch (error) { next(error); }
};

module.exports = {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  checkSubscription,
  startTrial,
  createOrder,
  verifyPayment,
  cancelSubscription,
  getSubscriptionHistory
};
