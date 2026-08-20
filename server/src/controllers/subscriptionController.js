const Subscription = require('../models/Subscription');
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
        .sort({ price: 1 })
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

    const plans = await Subscription.find(query).sort({ price: 1 });
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

const assignPlan = async (req, res, next) => {
  try {
    const { vendorId, planId } = req.body;
    const result = await subscriptionService.assignSubscription(vendorId, planId);
    res.json({ success: true, message: 'Subscription assigned', data: result });
  } catch (error) { next(error); }
};

const checkSubscription = async (req, res, next) => {
  try {
    const vendorId = req.user.role === 'vendor' ? req.user.id : req.params.vendorId;
    const result = await subscriptionService.checkVendorSubscription(vendorId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const cancelSubscription = async (req, res, next) => {
  try {
    await subscriptionService.cancelSubscription(req.params.vendorId || req.user.id);
    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) { next(error); }
};

module.exports = { getPlans, createPlan, updatePlan, deletePlan, assignPlan, checkSubscription, cancelSubscription };
