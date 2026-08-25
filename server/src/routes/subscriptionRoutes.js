const router = require('express').Router();
const { 
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
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public/Common Plan reading
router.get('/', protect, getPlans);

// Admin Plan Management
router.post('/', protect, authorize('admin'), createPlan);
router.put('/:id', protect, authorize('admin'), updatePlan);
router.delete('/:id', protect, authorize('admin'), deletePlan);

// Vendor Actions
router.get('/check', protect, authorize('vendor'), checkSubscription);
router.post('/trial', protect, authorize('vendor'), startTrial);
router.post('/order', protect, authorize('vendor'), createOrder);
router.post('/verify', protect, authorize('vendor'), verifyPayment);

// Admin Vendor Management
router.get('/vendor/:vendorId/check', protect, authorize('admin'), checkSubscription);
router.get('/vendor/:vendorId/history', protect, authorize('admin'), getSubscriptionHistory);
router.patch('/vendor/:vendorId/cancel', protect, authorize('admin'), cancelSubscription);

module.exports = router;
