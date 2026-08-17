const mongoose = require('mongoose');

const platformFeeSchema = new mongoose.Schema(
  {
    feePercentage: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
      max: 100,
    },
    cancellationFeePercentage: {
      type: Number,
      required: true,
      default: 25,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PlatformFee', platformFeeSchema);
