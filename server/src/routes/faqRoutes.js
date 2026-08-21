const express = require('express');
const router = express.Router();
const { 
  getAllFAQs, 
  getActiveFAQs, 
  createFAQ, 
  updateFAQ, 
  deleteFAQ 
} = require('../controllers/faqController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(getActiveFAQs)
  .post(protect, authorize('admin'), createFAQ);

router.route('/admin')
  .get(protect, authorize('admin'), getAllFAQs);

router.route('/:id')
  .put(protect, authorize('admin'), updateFAQ)
  .delete(protect, authorize('admin'), deleteFAQ);

module.exports = router;
