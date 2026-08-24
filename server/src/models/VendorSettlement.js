const mongoose = require('mongoose');

/**
 * VendorSettlement — records actual money transfers between admin and vendor.
 * 
 * ADMIN_TO_VENDOR: Admin pays vendor their online payment share (vendor payout).
 * VENDOR_TO_ADMIN: Vendor pays admin the commission+platform fee from cash collections.
 *
 * A settlement ONLY completes when this record exists.
 * "vendorPayable" is NEVER automatically settled just because a booking was paid.
 */
const vendorSettlementSchema = new mongoose.Schema(
  {
    settlementId: {
      type: String,
      unique: true,
      default: () => `STL_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },

    amount: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, min: 0 },

    method: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'OTHER'],
      required: true,
    },

    // ADMIN_TO_VENDOR: admin pays vendor online earnings
    // VENDOR_TO_ADMIN: vendor pays admin their cash dues (commission+platformFee)
    direction: {
      type: String,
      enum: ['ADMIN_TO_VENDOR', 'VENDOR_TO_ADMIN'],
      required: true,
    },

    reference: { type: String }, // Bank/UPI transaction reference
    settlementDate: { type: Date, default: Date.now },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, required: true }, // admin ID
    recordedByRole: { type: String, enum: ['admin'], default: 'admin' },

    notes: { type: String },
    status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'COMPLETED' },

    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

vendorSettlementSchema.index({ vendor: 1, createdAt: -1 });
vendorSettlementSchema.index({ settlementDate: 1 });
vendorSettlementSchema.index({ direction: 1 });

module.exports = mongoose.model('VendorSettlement', vendorSettlementSchema);
