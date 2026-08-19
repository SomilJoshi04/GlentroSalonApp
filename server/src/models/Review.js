const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
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
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one review per completed booking
reviewSchema.index({ booking: 1 }, { unique: true });
// Optimize querying all reviews for a specific salon
reviewSchema.index({ salon: 1, createdAt: -1 });

// Static method to dynamically calculate and update the salon's average rating
reviewSchema.statics.calcAverageRatings = async function (salonId) {
  const stats = await this.aggregate([
    {
      $match: { salon: salonId },
    },
    {
      $group: {
        _id: '$salon',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model('Salon').findByIdAndUpdate(salonId, {
      ratings: {
        average: Math.round(stats[0].average * 10) / 10, // Round to 1 decimal place
        count: stats[0].count,
      },
    });
  } else {
    // If no reviews left, reset to 0
    await mongoose.model('Salon').findByIdAndUpdate(salonId, {
      ratings: {
        average: 0,
        count: 0,
      },
    });
  }
};

// Call calcAverageRatings AFTER a new review is saved
reviewSchema.post('save', async function () {
  await this.constructor.calcAverageRatings(this.salon);
});

// Call calcAverageRatings BEFORE a review is removed (so we capture the doc), 
// then execute it AFTER remove. We use findOneAndDelete middleware in modern mongoose
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.salon);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
