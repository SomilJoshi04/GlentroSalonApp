const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
    },
    totalPricePaise: {
      type: Number,
    },
    discountedPrice: {
      type: Number,
      required: [true, 'Discounted price is required'],
    },
    discountedPricePaise: {
      type: Number,
    },
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'REJECTED'],
      default: 'PENDING',
    },
    adminNote: {
      type: String,
      default: '',
    },
    validFrom: {
      type: Date,
      required: [true, 'Valid from date is required'],
    },
    validTo: {
      type: Date,
      required: [true, 'Valid to date is required'],
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    perUserLimit: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    terms: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

packageSchema.index({ salon: 1, status: 1 });
packageSchema.index({ isFeatured: 1, priority: -1, status: 1, isActive: 1 });

module.exports = mongoose.model('Package', packageSchema);
