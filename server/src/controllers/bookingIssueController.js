const BookingIssue = require('../models/BookingIssue');
const Booking = require('../models/Booking');

// @desc    Create a new booking issue
// @route   POST /api/booking-issues
// @access  Private (User)
exports.createIssue = async (req, res, next) => {
  try {
    const { bookingId, issueType, description } = req.body;
    
    // Ensure booking exists and belongs to user
    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const issue = await BookingIssue.create({
      user: req.user._id,
      booking: bookingId,
      issueType,
      description
    });

    res.status(201).json({ success: true, data: issue });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user's booking issues
// @route   GET /api/booking-issues
// @access  Private (User)
exports.getUserIssues = async (req, res, next) => {
  try {
    const issues = await BookingIssue.find({ user: req.user._id })
      .populate('booking', 'salon service package bookingDate timeSlot status totalAmount')
      .sort('-createdAt');
      
    res.json({ success: true, data: issues });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all booking issues (Admin)
// @route   GET /api/booking-issues/admin
// @access  Private (Admin)
exports.getAllIssues = async (req, res, next) => {
  try {
    const issues = await BookingIssue.find()
      .populate('user', 'name email phone')
      .populate('booking', 'salon service package bookingDate timeSlot status totalAmount')
      .sort('-createdAt');
      
    res.json({ success: true, data: issues });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking issue status
// @route   PATCH /api/booking-issues/:id/status
// @access  Private (Admin)
exports.updateIssueStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const issue = await BookingIssue.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    res.json({ success: true, data: issue });
  } catch (error) {
    next(error);
  }
};
