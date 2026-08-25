const router = require('express').Router();
const { getServices, getVendorServices, getServiceById, createService, updateService, deleteService, toggleServiceStatus } = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { requireActiveVendor } = require('../middleware/vendorSuspensionMiddleware');

const { requireSubscriptionAccess } = require('../middleware/subscriptionMiddleware');

router.get('/', getServices);
router.get('/vendor/my', protect, authorize('vendor'), getVendorServices); // Allow reading own services
router.get('/:id', getServiceById);
router.post('/', protect, authorize('vendor'), requireActiveVendor, requireSubscriptionAccess, createService);
router.put('/:id', protect, authorize('vendor'), requireActiveVendor, requireSubscriptionAccess, updateService);
router.delete('/:id', protect, authorize('vendor', 'admin'), requireActiveVendor, requireSubscriptionAccess, deleteService);
router.patch('/:id/toggle-status', protect, authorize('vendor', 'admin'), requireActiveVendor, requireSubscriptionAccess, toggleServiceStatus);

module.exports = router;
