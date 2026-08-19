const router = require('express').Router();
const { getSalonReviews, checkEligibility, createReview, getAllReviews, getVendorReviews, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public route
router.get('/salon/:salonId', getSalonReviews);

// Protected routes
router.use(protect);

// Admin Routes
router.get('/admin', authorize('admin'), getAllReviews);
router.delete('/:id', authorize('admin'), deleteReview);

// Vendor Routes
router.get('/vendor', authorize('vendor'), getVendorReviews);

// User Routes
router.get('/eligibility/:salonId', authorize('user'), checkEligibility);
router.post('/', authorize('user'), createReview);

module.exports = router;
