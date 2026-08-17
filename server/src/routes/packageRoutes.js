const router = require('express').Router();
const { createPackage, getPackages, getVendorPackages, approvePackage, rejectPackage, updatePackage, deletePackage, togglePackageStatus } = require('../controllers/packageController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getPackages);
router.get('/vendor/my', protect, authorize('vendor'), getVendorPackages);
router.post('/', protect, authorize('vendor'), createPackage);
router.put('/:id', protect, authorize('vendor'), updatePackage);
router.delete('/:id', protect, authorize('vendor', 'admin'), deletePackage);
router.patch('/:id/approve', protect, authorize('admin'), approvePackage);
router.patch('/:id/reject', protect, authorize('admin'), rejectPackage);
router.patch('/:id/toggle-status', protect, authorize('vendor'), togglePackageStatus);

module.exports = router;
