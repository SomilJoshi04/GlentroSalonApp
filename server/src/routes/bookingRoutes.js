const router = require('express').Router();
const { createBooking, getMyBookings, getSalonBookings, getBookingById, acceptBooking, rejectBooking, cancelBooking, completeBooking, getAvailability, getAllBookings } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('user'), createBooking);
router.get('/my', protect, authorize('user'), getMyBookings);
router.get('/salon/:salonId', protect, authorize('vendor'), getSalonBookings);
router.get('/all', protect, authorize('admin'), getAllBookings);
router.get('/availability/:salonId', getAvailability);
router.post('/availability/:salonId', getAvailability);
router.get('/:id', protect, getBookingById);
router.patch('/:id/accept', protect, authorize('vendor'), acceptBooking);
router.patch('/:id/reject', protect, authorize('vendor'), rejectBooking);
router.patch('/:id/cancel', protect, authorize('user', 'vendor'), cancelBooking);
router.patch('/:id/complete', protect, authorize('vendor'), completeBooking);

module.exports = router;
