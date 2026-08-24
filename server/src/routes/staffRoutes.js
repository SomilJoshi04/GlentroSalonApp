const router = require('express').Router();
const { addStaff, getSalonStaff, getVendorStaff, updateStaff, toggleStaffStatus, updateSchedule, getAvailability, deleteStaff } = require('../controllers/staffController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('vendor'), addStaff);
router.get('/vendor/my', protect, authorize('vendor'), getVendorStaff);
router.get('/salon/:salonId', getSalonStaff);
router.put('/:id', protect, authorize('vendor'), updateStaff);
router.patch('/:id/toggle-status', protect, authorize('vendor'), toggleStaffStatus);
router.put('/:id/schedule', protect, authorize('vendor'), updateSchedule);
router.get('/:id/availability', getAvailability);
router.delete('/:id', protect, authorize('vendor'), deleteStaff);

module.exports = router;
