const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');

// @desc    Get all reviews for a salon
// @route   GET /api/reviews/salon/:salonId
// @access  Public
exports.getSalonReviews = async (req, res) => {
  try {
    const { salonId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const reviews = await Review.find({ salon: salonId })
      .populate('user', 'name avatar')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Review.countDocuments({ salon: salonId });

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: reviews
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Check if user is eligible to review a salon
// @route   GET /api/reviews/eligibility/:salonId
// @access  Private
exports.checkEligibility = async (req, res) => {
  try {
    const { salonId } = req.params;
    const userId = req.user.id;

    // Find all completed bookings for this user and salon
    const completedBookings = await Booking.find({
      user: userId,
      salon: salonId,
      status: 'COMPLETED'
    }).sort('-bookingDate');

    if (completedBookings.length === 0) {
      return res.status(200).json({
        success: true,
        data: { isEligible: false, message: 'No completed bookings found' }
      });
    }

    // Find all reviews made by this user for this salon
    const existingReviews = await Review.find({
      user: userId,
      salon: salonId
    }).select('booking');

    const reviewedBookingIds = existingReviews.map(r => r.booking.toString());

    // Find the latest completed booking that hasn't been reviewed
    const unreviewedBooking = completedBookings.find(
      b => !reviewedBookingIds.includes(b._id.toString())
    );

    if (unreviewedBooking) {
      return res.status(200).json({
        success: true,
        data: { 
          isEligible: true, 
          bookingId: unreviewedBooking._id 
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { isEligible: false, message: 'All completed bookings have been reviewed' }
    });

  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { salonId, bookingId, rating, comment } = req.body;
    const userId = req.user.id;

    // 1. Basic validation
    if (!salonId || !bookingId || !rating) {
      return res.status(400).json({ success: false, message: 'Please provide salon, booking, and rating' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // 2. Validate booking ownership and status
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this booking' });
    }

    if (booking.salon.toString() !== salonId) {
      return res.status(400).json({ success: false, message: 'Booking does not belong to the specified salon' });
    }

    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Only COMPLETED bookings can be reviewed' });
    }

    // 3. Prevent duplicate review for the same booking
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'This booking has already been reviewed' });
    }

    // 4. Create review
    const review = await Review.create({
      user: userId,
      salon: salonId,
      booking: bookingId,
      rating: Number(rating),
      comment
    });

    // Note: The Review model has a post-save hook that will automatically
    // recalculate the salon's average rating.

    // 5. Fetch updated salon to return new rating
    const updatedSalon = await Salon.findById(salonId).select('ratings');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        review,
        salonRatings: updatedSalon.ratings
      }
    });

  } catch (error) {
    console.error('Create review error:', error);
    
    // Handle MongoDB duplicate key error (fallback if concurrency bypasses the existingReview check)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This booking has already been reviewed' });
    }

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all reviews for all salons (Admin)
// @route   GET /api/reviews/admin
// @access  Private/Admin
exports.getAllReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const page = parseInt(req.query.page, 10) || 1;

    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('salon', 'name')
      .populate('booking', 'bookingDate status')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Review.countDocuments();

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: reviews
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all reviews for vendor's salons
// @route   GET /api/reviews/vendor
// @access  Private/Vendor
exports.getVendorReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const page = parseInt(req.query.page, 10) || 1;
    const vendorId = req.user.id;

    // First find all salons belonging to this vendor
    const vendorSalons = await Salon.find({ vendor: vendorId }).select('_id');
    const salonIds = vendorSalons.map(s => s._id);

    const reviews = await Review.find({ salon: { $in: salonIds } })
      .populate('user', 'name email')
      .populate('salon', 'name')
      .populate('booking', 'bookingDate status')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Review.countDocuments({ salon: { $in: salonIds } });

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: reviews
    });
  } catch (error) {
    console.error('Get vendor reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a review (Admin only)
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    // We use findOneAndDelete to trigger the query middleware in Review.js 
    // which calculates the salon's updated rating
    const review = await Review.findOneAndDelete({ _id: reviewId });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
