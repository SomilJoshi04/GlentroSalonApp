const router = require('express').Router();
const { getVendors, getVendorById, updateProfile, approveVendor, rejectVendor, toggleVendorStatus, updateFcmToken } = require('../controllers/vendorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, authorize('admin'), getVendors);
router.get('/:id', protect, authorize('admin', 'vendor'), getVendorById);
router.put('/profile', protect, authorize('vendor'), updateProfile);
router.patch('/:id/approve', protect, authorize('admin'), approveVendor);
router.patch('/:id/reject', protect, authorize('admin'), rejectVendor);
router.patch('/:id/toggle-status', protect, authorize('admin'), toggleVendorStatus);
router.put('/fcm-token', protect, authorize('vendor'), updateFcmToken);

module.exports = router;
