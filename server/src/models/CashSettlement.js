const mongoose = require('mongoose');

const cashSettlementSchema = new mongoose.Schema(
  {
    settlementId: {
      type: String,
      unique: true,
      default: () => `CS_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      unique: true,
    },
    paidAt: { type: Date },
    verifiedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

cashSettlementSchema.index({ vendor: 1, status: 1 });
cashSettlementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CashSettlement', cashSettlementSchema);
