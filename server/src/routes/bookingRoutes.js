const router = require('express').Router();
const { createBooking, calculateTotal, getMyBookings, getSalonBookings, getBookingById, acceptBooking, rejectBooking, cancelBooking, completeBooking, getAvailability, getAllBookings, getVendorRecentBookings, getVendorStats, getVendorAnalytics } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { requireActiveVendor } = require('../middleware/vendorSuspensionMiddleware');

const { requireSubscriptionAccess } = require('../middleware/subscriptionMiddleware');

router.post('/calculate-total', protect, calculateTotal);
router.post('/', protect, authorize('user'), createBooking);
router.get('/my', protect, authorize('user'), getMyBookings);
router.get('/salon/:salonId', protect, authorize('vendor'), getSalonBookings);
router.get('/vendor/recent', protect, authorize('vendor'), getVendorRecentBookings);
router.get('/vendor/stats', protect, authorize('vendor'), getVendorStats);
router.get('/vendor/analytics', protect, authorize('vendor'), getVendorAnalytics);
router.get('/all', protect, authorize('admin'), getAllBookings);
router.get('/availability/:salonId', getAvailability);
router.post('/availability/:salonId', getAvailability);
router.get('/:id', protect, getBookingById);
router.patch('/:id/accept', protect, authorize('vendor'), requireActiveVendor, requireSubscriptionAccess, acceptBooking);
router.patch('/:id/reject', protect, authorize('vendor'), rejectBooking);
router.patch('/:id/cancel', protect, authorize('user', 'vendor'), cancelBooking);
router.patch('/:id/complete', protect, authorize('vendor'), completeBooking);

module.exports = router;
