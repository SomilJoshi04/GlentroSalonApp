const mongoose = require('mongoose');

/**
 * StaffReview — per-service, per-staff rating.
 *
 * A review is created when a user rates the specific staff member
 * who performed a service in a completed booking.
 *
 * Key design decisions:
 * - Separate from Review (salon-level) to avoid confusion
 * - Salon-scoped: salonId stored per-review to support future multi-salon staff
 * - Compound unique index prevents any duplicate submission at DB level
 * - isHidden for admin moderation (hidden reviews are excluded from aggregates)
 */
const staffReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    bookingService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingService',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
      validate: {
        validator: (v) => Number.isInteger(v) || (typeof v === 'number' && v === Math.floor(v)),
        message: 'Rating must be a whole number between 1 and 5',
      },
    },
    review: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    // Admin moderation flag: hidden reviews are excluded from all public queries and aggregates
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// PRIMARY: Compound unique index preventing duplicate staff reviews
// Covers: double-click, refresh, retry, multiple tabs, malicious requests
staffReviewSchema.index(
  { user: 1, booking: 1, bookingService: 1, staff: 1 },
  { unique: true }
);

// For fetching all non-hidden reviews for a staff member in a salon (used in Top Stylists)
staffReviewSchema.index({ salon: 1, staff: 1, isHidden: 1, createdAt: -1 });

// For fetching all reviews in a completed booking (used in BookingDetailPage)
staffReviewSchema.index({ booking: 1 });

// For admin moderation queries
staffReviewSchema.index({ isHidden: 1, createdAt: -1 });

// ─── Rating Aggregation ───────────────────────────────────────────────────────

/**
 * Recalculate and update Staff.ratings aggregate for a specific staff member.
 * Only counts non-hidden reviews.
 *
 * Called after every create / hide / unhide / delete operation on StaffReview.
 */
staffReviewSchema.statics.calcStaffRatings = async function (staffId) {
  const stats = await this.aggregate([
    {
      $match: {
        staff: new mongoose.Types.ObjectId(staffId),
        isHidden: false,
      },
    },
    {
      $group: {
        _id: '$staff',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const updateData =
    stats.length > 0
      ? {
          'ratings.average': Math.round(stats[0].average * 10) / 10,
          'ratings.count': stats[0].count,
        }
      : {
          'ratings.average': 0,
          'ratings.count': 0,
        };

  await mongoose.model('Staff').findByIdAndUpdate(staffId, { $set: updateData });
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

// After a new review is saved, recalculate this staff's rating
staffReviewSchema.post('save', async function () {
  await this.constructor.calcStaffRatings(this.staff);
});

// After findOneAndDelete or findOneAndUpdate (used for hide/unhide + delete ops)
staffReviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcStaffRatings(doc.staff);
  }
});

module.exports = mongoose.model('StaffReview', staffReviewSchema);
