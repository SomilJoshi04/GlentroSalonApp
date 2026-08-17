const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    percentage: {
      type: Number,
      required: [true, 'Commission percentage is required'],
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

commissionSchema.index({ vendor: 1 });

module.exports = mongoose.model('Commission', commissionSchema);
