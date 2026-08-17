const router = require('express').Router();
const { getPlans, createPlan, updatePlan, deletePlan, assignPlan, checkSubscription, cancelSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, getPlans);
router.post('/', protect, authorize('admin'), createPlan);
router.put('/:id', protect, authorize('admin'), updatePlan);
router.delete('/:id', protect, authorize('admin'), deletePlan);
router.post('/assign', protect, authorize('admin'), assignPlan);
router.get('/check', protect, authorize('vendor'), checkSubscription);
router.get('/check/:vendorId', protect, authorize('admin'), checkSubscription);
router.patch('/cancel/:vendorId', protect, authorize('admin'), cancelSubscription);

module.exports = router;
