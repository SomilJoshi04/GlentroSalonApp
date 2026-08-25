const router = require('express').Router();
const { addStaff, getSalonStaff, getVendorStaff, updateStaff, toggleStaffStatus, updateSchedule, getAvailability, deleteStaff } = require('../controllers/staffController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const { requireSubscriptionAccess } = require('../middleware/subscriptionMiddleware');

router.post('/', protect, authorize('vendor'), requireSubscriptionAccess, addStaff);
router.get('/vendor/my', protect, authorize('vendor'), getVendorStaff);
router.get('/salon/:salonId', getSalonStaff);
router.put('/:id', protect, authorize('vendor'), requireSubscriptionAccess, updateStaff);
router.patch('/:id/toggle-status', protect, authorize('vendor'), requireSubscriptionAccess, toggleStaffStatus);
router.put('/:id/schedule', protect, authorize('vendor'), requireSubscriptionAccess, updateSchedule);
router.get('/:id/availability', getAvailability);
router.delete('/:id', protect, authorize('vendor'), requireSubscriptionAccess, deleteStaff);

module.exports = router;
