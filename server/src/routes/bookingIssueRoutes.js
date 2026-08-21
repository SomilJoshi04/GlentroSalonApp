const express = require('express');
const router = express.Router();
const { 
  createIssue, 
  getUserIssues, 
  getAllIssues, 
  updateIssueStatus 
} = require('../controllers/bookingIssueController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .post(protect, createIssue)
  .get(protect, getUserIssues);

router.route('/admin')
  .get(protect, authorize('admin'), getAllIssues);

router.route('/:id/status')
  .patch(protect, authorize('admin'), updateIssueStatus);

module.exports = router;
