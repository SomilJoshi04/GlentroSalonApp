const router = require('express').Router();
const { getUsers, getUserById, updateProfile, updateLocation, toggleUserStatus, updateFcmToken } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, authorize('admin'), getUsers);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/profile', protect, authorize('user', 'admin'), updateProfile);
router.put('/location', protect, authorize('user'), updateLocation);
router.patch('/:id/toggle-status', protect, authorize('admin'), toggleUserStatus);
router.put('/fcm-token', protect, updateFcmToken);

module.exports = router;
