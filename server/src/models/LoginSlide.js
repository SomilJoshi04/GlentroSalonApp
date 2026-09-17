const mongoose = require('mongoose');

const loginSlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // image filename (WebP) stored in /uploads — REQUIRED for creation
    image: {
      type: String,
      default: '',
    },
    buttonText: {
      type: String,
      trim: true,
      default: '',
    },
    // Only https:// or relative / paths are stored — validated at controller level
    buttonLink: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient public query: active + ordered
loginSlideSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('LoginSlide', loginSlideSchema);
