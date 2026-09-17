const mongoose = require('mongoose');
const StaffReview = require('../models/StaffReview');
const Staff = require('../models/Staff');
const Booking = require('../models/Booking');
const BookingService = require('../models/BookingService');
const Salon = require('../models/Salon');

// ─── Ranking Utility ─────────────────────────────────────────────────────────

/**
 * Wilson Score lower bound for proportion estimation.
 *
 * Used for Top Stylist ranking to prevent a single 5★ review from outranking
 * a stylist with 4.8★ from 200 genuine reviews.
 *
 * Treats ratings ≥ 4 as "positive" votes.
 * z = 1.96 → 95% confidence interval.
 *
 * @param {number} positive - count of ratings >= 4
 * @param {number} total    - total non-hidden review count
 * @returns {number}        - Wilson score (0 to 1); higher = more confident
 */
const wilsonScore = (positive, total) => {
  if (total === 0) return 0;
  const z = 1.96;
  const phat = positive / total;
  return (
    (phat + (z * z) / (2 * total) -
      z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total)) /
    (1 + (z * z) / total)
  );
};

/**
 * Minimum number of valid reviews required for a staff member to appear
 * in the "Top Stylists" section. Staff with fewer reviews still appear in
 * the All Staff list with a "New" indicator.
 * Adjust this constant to change the threshold without touching other logic.
 */
const MIN_TOP_STYLIST_REVIEWS = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate rating is a whole number between 1 and 5.
 */
const isValidRating = (rating) => {
  const n = Number(rating);
  return Number.isFinite(n) && n >= 1 && n <= 5 && Math.floor(n) === n;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Submit a staff review for a completed booking service
// @route   POST /api/bookings/:bookingId/staff-review
// @access  Private (user)
exports.submitStaffReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { bookingServiceId, staffId, rating, review } = req.body;
    const userId = req.user.id;

    // ── 1. Basic field validation ──────────────────────────────────────────
    if (!bookingServiceId || !staffId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'bookingServiceId, staffId, and rating are required',
      });
    }

    if (!isValidRating(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a whole number between 1 and 5',
      });
    }

    // ── 2. Validate booking ownership + completion ─────────────────────────
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this booking',
      });
    }

    // Only COMPLETED bookings are reviewable.
    // AUTO_SETTLED is a financial settlement status only and does not indicate
    // service completion in this platform's lifecycle — so it is NOT allowed.
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Staff can only be rated after the booking is completed',
      });
    }

    // ── 3. Validate bookingService belongs to this booking ─────────────────
    const bookingService = await BookingService.findOne({
      _id: bookingServiceId,
      booking: bookingId,
    });
    if (!bookingService) {
      return res.status(404).json({
        success: false,
        message: 'Booking service not found for this booking',
      });
    }

    // ── 4. Validate staff exists on this bookingService ───────────────────
    if (!bookingService.staff) {
      return res.status(400).json({
        success: false,
        message: 'No staff was assigned to this service',
      });
    }

    if (bookingService.staff.toString() !== staffId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Staff does not match the service assignment for this booking',
      });
    }

    // ── 5. Validate staff belongs to booking's salon ───────────────────────
    const staff = await Staff.findOne({
      _id: staffId,
      salon: booking.salon,
    });
    if (!staff) {
      return res.status(400).json({
        success: false,
        message: 'Staff does not belong to this booking\'s salon',
      });
    }

    // ── 6. Pre-check for duplicate (DB unique index is the final guard) ────
    const existingReview = await StaffReview.findOne({
      user: userId,
      booking: bookingId,
      bookingService: bookingServiceId,
      staff: staffId,
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this stylist for this service',
      });
    }

    // ── 7. Create staff review ─────────────────────────────────────────────
    // The post-save hook on StaffReview will trigger calcStaffRatings automatically
    const staffReview = await StaffReview.create({
      user: userId,
      salon: booking.salon,
      staff: staffId,
      booking: bookingId,
      bookingService: bookingServiceId,
      rating: Number(rating),
      review: review ? review.trim() : '',
    });

    // Return updated staff ratings for immediate UI update
    const updatedStaff = await Staff.findById(staffId).select('ratings name');

    res.status(201).json({
      success: true,
      message: 'Staff review submitted successfully',
      data: {
        staffReview,
        staffRatings: updatedStaff?.ratings,
      },
    });
  } catch (error) {
    console.error('Submit staff review error:', error);
    // Handle MongoDB duplicate key error as final concurrency guard
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this stylist for this service',
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get public staff reviews for a specific staff member
// @route   GET /api/staff/:staffId/reviews
// @access  Public
exports.getStaffReviews = async (req, res) => {
  try {
    const { staffId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const query = { staff: staffId, isHidden: false };
    const reviews = await StaffReview.find(query)
      .populate('user', 'name avatar') // Only safe public fields
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await StaffReview.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: { total, page, pages: Math.ceil(total / limit) },
      data: reviews,
    });
  } catch (error) {
    console.error('Get staff reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Top Stylists for a specific salon
// @route   GET /api/salons/:salonId/top-stylists
// @access  Public
exports.getTopStylists = async (req, res) => {
  try {
    const { salonId } = req.params;

    // Validate salon exists
    const salon = await Salon.findById(salonId).select('_id');
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    // Fetch all active staff for this salon
    const allStaff = await Staff.find({ salon: salonId, isActive: true })
      .select('name avatar specializations ratings')
      .lean();

    // Compute Wilson Score for ranking among eligible staff
    // Only staff with at least MIN_TOP_STYLIST_REVIEWS valid reviews are ranked
    const eligibleStaff = allStaff.filter(
      (s) => s.ratings && s.ratings.count >= MIN_TOP_STYLIST_REVIEWS
    );

    // For each eligible staff, compute Wilson score using their aggregate ratings
    // We need the count of "positive" reviews (rating >= 4) from StaffReview
    // to compute Wilson score accurately
    const staffIds = eligibleStaff.map((s) => s._id);

    const positiveCountsAgg = await StaffReview.aggregate([
      {
        $match: {
          staff: { $in: staffIds },
          salon: new mongoose.Types.ObjectId(salonId),
          isHidden: false,
          rating: { $gte: 4 },
        },
      },
      {
        $group: {
          _id: '$staff',
          positiveCount: { $sum: 1 },
        },
      },
    ]);

    const positiveMap = {};
    positiveCountsAgg.forEach((p) => {
      positiveMap[p._id.toString()] = p.positiveCount;
    });

    // Calculate Wilson score and sort
    const rankedStaff = eligibleStaff
      .map((s) => {
        const total = s.ratings.count;
        const positive = positiveMap[s._id.toString()] || 0;
        return {
          ...s,
          _wilsonScore: wilsonScore(positive, total),
        };
      })
      .sort((a, b) => b._wilsonScore - a._wilsonScore)
      .map(({ _wilsonScore, ...rest }) => rest); // Remove internal score from response

    res.status(200).json({
      success: true,
      data: {
        topStylists: rankedStaff,
        totalActive: allStaff.length,
      },
    });
  } catch (error) {
    console.error('Get top stylists error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

// @desc    Get all staff reviews (Admin — for moderation)
// @route   GET /api/staff-reviews
// @access  Private (admin)
exports.getAllStaffReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const page = parseInt(req.query.page, 10) || 1;
    const { staffId, salonId, isHidden } = req.query;

    const query = {};
    if (staffId) query.staff = staffId;
    if (salonId) query.salon = salonId;
    if (isHidden !== undefined) query.isHidden = isHidden === 'true';

    const reviews = await StaffReview.find(query)
      .populate('user', 'name email')
      .populate('salon', 'name')
      .populate('staff', 'name')
      .populate('booking', 'bookingDate status')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await StaffReview.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: { total, page, pages: Math.ceil(total / limit) },
      data: reviews,
    });
  } catch (error) {
    console.error('Get all staff reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Hide or unhide a staff review (Admin)
// @route   PATCH /api/staff-reviews/:id/hide
// @access  Private (admin)
exports.toggleHideStaffReview = async (req, res) => {
  try {
    const { id } = req.params;

    // findOneAndUpdate triggers post-findOneAnd hook which recalculates aggregate
    const review = await StaffReview.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Staff review not found' });
    }

    review.isHidden = !review.isHidden;
    await review.save(); // triggers post-save hook → calcStaffRatings

    // Note: the post-save hook handles calcStaffRatings automatically

    res.status(200).json({
      success: true,
      message: `Staff review ${review.isHidden ? 'hidden' : 'unhidden'}`,
      data: review,
    });
  } catch (error) {
    console.error('Toggle hide staff review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a staff review (Admin)
// @route   DELETE /api/staff-reviews/:id
// @access  Private (admin)
exports.deleteStaffReview = async (req, res) => {
  try {
    const review = await StaffReview.findOneAndDelete({ _id: req.params.id });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Staff review not found' });
    }

    // The post-findOneAnd hook triggers calcStaffRatings automatically

    res.status(200).json({
      success: true,
      message: 'Staff review deleted successfully',
      data: {},
    });
  } catch (error) {
    console.error('Delete staff review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
