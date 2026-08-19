const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
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
    bookingDate: {
      type: Date,
      required: [true, 'Booking date is required'],
    },
    startTime: {
      type: String, // e.g., "14:00"
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // calculated from services
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    packageSnapshot: {
      packageId: mongoose.Schema.Types.ObjectId,
      name: String,
      originalPrice: Number,
      offerPrice: Number,
      discount: Number,
    },
    cancellationFee: {
      type: Number,
      default: 0,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    // Razorpay payment fields
    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'AT_SALON', 'CASH', 'online', 'at_salon', 'cash'],
      default: 'AT_SALON',
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED', 'FAILED', 'pending', 'paid', 'refunded', 'failed'],
      default: 'PENDING',
    },
    // Financial breakdown
    commission: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    vendorPayout: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ salon: 1, status: 1 });
bookingSchema.index({ bookingDate: 1, salon: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
