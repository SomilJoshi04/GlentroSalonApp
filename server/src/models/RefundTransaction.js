const mongoose = require('mongoose');

/**
 * RefundTransaction — tracks every refund separately from the original payment.
 * The original PaymentTransaction is NEVER modified.
 * This record is append-only.
 */
const refundTransactionSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      unique: true,
      default: () => `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },
    paymentTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
    },

    // Razorpay identifiers
    razorpayPaymentId: { type: String, required: true },
    razorpayRefundId: { type: String, unique: true, sparse: true }, // filled after Razorpay responds

    // Financial details
    refundAmount: { type: Number, required: true, min: 0 },
    refundAmountPaise: { type: Number, min: 0 },
    originalAmount: { type: Number, required: true, min: 0 },
    originalAmountPaise: { type: Number, min: 0 },
    cancellationFee: { type: Number, default: 0, min: 0 },
    cancellationFeePaise: { type: Number, default: 0, min: 0 },

    refundReason: { type: String, required: true },

    refundStatus: {
      type: String,
      enum: ['REFUND_PENDING', 'REFUNDED', 'FAILED'],
      default: 'REFUND_PENDING',
    },

    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },

    initiatedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    initiatedByRole: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      required: true,
    },

    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

refundTransactionSchema.index({ booking: 1 });
refundTransactionSchema.index({ refundStatus: 1 });
refundTransactionSchema.index({ paymentTransaction: 1 });

module.exports = mongoose.model('RefundTransaction', refundTransactionSchema);
