const mongoose = require('mongoose');

/**
 * PaymentTransaction — immutable record of every financial event.
 * Financial records must NEVER be deleted or modified.
 * Corrections are made via separate reversal/refund transactions.
 */
const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      default: () => `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },

    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'CASH'],
      required: true,
    },
    transactionType: {
      type: String,
      enum: [
        'PAYMENT',           // Customer online payment
        'REFUND',            // Razorpay refund
        'CASH_PAYMENT',      // Vendor recorded cash
        'COMMISSION',        // Admin commission
        'PLATFORM_FEE',      // Platform fee
        'VENDOR_SETTLEMENT', // Admin paying vendor or vice versa
        'ADMIN_ADJUSTMENT',  // Manual admin correction
        'WALLET_DEBIT',
        'WALLET_CREDIT',
      ],
      required: true,
    },

    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: ['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'],
      default: 'PENDING',
    },
    direction: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true,
    },

    // Razorpay details (for ONLINE payments)
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    razorpaySignature: { type: String },
    signatureVerified: { type: Boolean, default: false },

    // Refund details
    refundId: { type: String, sparse: true },

    referenceId: { type: String },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },

    // Financial snapshot at time of transaction (immutable)
    pricing: {
      subtotal: Number,
      subtotalPaise: Number,
      packageDiscount: Number,
      packageDiscountPaise: Number,
      couponDiscount: Number,
      couponDiscountPaise: Number,
      grossAmount: Number,
      grossAmountPaise: Number,
      platformFee: Number,
      platformFeePaise: Number,
      commissionAmount: Number,
      commissionAmountPaise: Number,
      finalAmount: Number,
      finalAmountPaise: Number,
      vendorNetAmount: Number,
      vendorNetAmountPaise: Number,
      adminRevenue: Number,
      adminRevenuePaise: Number,
    },

    recordedBy: { type: mongoose.Schema.Types.ObjectId },
    recordedByRole: {
      type: String,
      enum: ['user', 'vendor', 'admin', 'system'],
    },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ booking: 1, transactionType: 1 });
paymentTransactionSchema.index({ booking: 1 });
paymentTransactionSchema.index({ vendor: 1, status: 1 });
paymentTransactionSchema.index({ vendor: 1, createdAt: -1 });
paymentTransactionSchema.index({ user: 1 });
paymentTransactionSchema.index({ status: 1 });
paymentTransactionSchema.index({ transactionType: 1 });
paymentTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
