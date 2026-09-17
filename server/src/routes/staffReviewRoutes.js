const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const {
  getAllStaffReviews,
  toggleHideStaffReview,
  deleteStaffReview,
} = require('../controllers/staffReviewController');

// Admin-only routes for staff review moderation
router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllStaffReviews);
router.patch('/:id/hide', toggleHideStaffReview);
router.delete('/:id', deleteStaffReview);

module.exports = router;
