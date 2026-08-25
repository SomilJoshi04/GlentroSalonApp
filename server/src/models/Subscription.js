const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    pricePaise: {
      type: Number,
    },
    duration: {
      type: Number, // value
      required: [true, 'Duration is required'],
      min: 1,
    },
    durationUnit: {
      type: String,
      enum: ['DAYS', 'MONTHS', 'YEARS'],
      default: 'MONTHS',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    features: [
      {
        type: String,
      },
    ],
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
