const mongoose = require('mongoose');

const vendorSubscriptionSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      // Optional for TRIAL if trial doesn't require a specific plan
    },
    type: {
      type: String,
      enum: ['TRIAL', 'PAID'],
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    pricePaise: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Snapshots for historical integrity
    planNameSnapshot: {
      type: String,
    },
    durationSnapshot: {
      type: Number, // Value
    },
    durationUnitSnapshot: {
      type: String, // 'DAYS', 'MONTHS', 'YEARS'
    },
    // Payment Tracking
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
      unique: true, // Idempotency: one payment ID per subscription record
      sparse: true, // Allow nulls for TRIAL
    },
    // Tracking modifications
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound indexes for quick lookups
vendorSubscriptionSchema.index({ vendor: 1, status: 1 });
vendorSubscriptionSchema.index({ vendor: 1, endDate: -1 });

module.exports = mongoose.model('VendorSubscription', vendorSubscriptionSchema);
