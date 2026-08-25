const router = require('express').Router();
const { 
  createPackage, 
  getPackages, 
  getVendorPackages, 
  approvePackage, 
  rejectPackage, 
  updatePackage, 
  deletePackage, 
  togglePackageStatus,
  updatePackageAdmin,
  deletePackageAdmin
} = require('../controllers/packageController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const { requireSubscriptionAccess } = require('../middleware/subscriptionMiddleware');

router.get('/', getPackages);
router.get('/vendor/my', protect, authorize('vendor'), getVendorPackages);
router.post('/', protect, authorize('vendor'), requireSubscriptionAccess, upload.single('image'), createPackage);
router.put('/:id', protect, authorize('vendor'), requireSubscriptionAccess, upload.single('image'), updatePackage);
router.delete('/:id', protect, authorize('vendor', 'admin'), requireSubscriptionAccess, deletePackage);
router.patch('/:id/approve', protect, authorize('admin'), approvePackage);
router.patch('/:id/reject', protect, authorize('admin'), rejectPackage);
router.patch('/:id/toggle-status', protect, authorize('vendor'), requireSubscriptionAccess, togglePackageStatus);

// Admin-specific actions
router.patch('/:id/admin', protect, authorize('admin'), updatePackageAdmin);
router.delete('/:id/admin', protect, authorize('admin'), deletePackageAdmin);

module.exports = router;
