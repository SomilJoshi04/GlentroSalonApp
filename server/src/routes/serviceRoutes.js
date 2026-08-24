const router = require('express').Router();
const { getServices, getVendorServices, getServiceById, createService, updateService, deleteService, toggleServiceStatus } = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { requireActiveVendor } = require('../middleware/vendorSuspensionMiddleware');

router.get('/', getServices);
router.get('/vendor/my', protect, authorize('vendor'), getVendorServices); // Allow reading own services
router.get('/:id', getServiceById);
router.post('/', protect, authorize('vendor'), requireActiveVendor, createService);
router.put('/:id', protect, authorize('vendor'), requireActiveVendor, updateService);
router.delete('/:id', protect, authorize('vendor', 'admin'), requireActiveVendor, deleteService);
router.patch('/:id/toggle-status', protect, authorize('vendor', 'admin'), requireActiveVendor, toggleServiceStatus);

module.exports = router;
