const mongoose = require('mongoose');

/**
 * WithdrawalAuditLog — Immutable audit trail for every admin action on withdrawals.
 *
 * RULES:
 *  - Never delete or modify audit entries.
 *  - Created automatically by withdrawalService for every state change.
 *  - amountPaise stored in integer paise.
 */
const withdrawalAuditLogSchema = new mongoose.Schema(
  {
    withdrawal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WithdrawalRequest',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId, // admin user who performed the action
    },

    action: {
      type: String,
      enum: [
        'REQUEST_CREATED',     // Vendor created withdrawal request
        'PROCESS_WITHDRAWAL',  // Admin moved to PROCESSING
        'MARK_PAID',           // Admin marked as PAID
        'REJECT_WITHDRAWAL',   // Admin rejected
        'MARK_FAILED',         // Admin marked as FAILED
        'RELEASE_RESERVATION', // Reserved funds released (rejection/failure)
        'VENDOR_CANCELLED',    // Vendor cancelled own pending request
      ],
      required: true,
    },

    oldStatus: { type: String },
    newStatus: { type: String },

    amountPaise: { type: Number }, // amount involved in this action (paise)
    utr: { type: String },         // UTR reference if applicable
    note: { type: String },        // admin note or rejection reason

    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // timestamp field above is sufficient
  }
);

withdrawalAuditLogSchema.index({ withdrawal: 1, timestamp: 1 });
withdrawalAuditLogSchema.index({ vendor: 1, timestamp: -1 });
withdrawalAuditLogSchema.index({ admin: 1, timestamp: -1 });

module.exports = mongoose.model('WithdrawalAuditLog', withdrawalAuditLogSchema);
