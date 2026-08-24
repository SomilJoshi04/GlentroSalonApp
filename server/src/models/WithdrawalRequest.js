const mongoose = require('mongoose');

/**
 * WithdrawalRequest — Vendor-initiated payout requests.
 *
 * LIFECYCLE:
 *  PENDING → PROCESSING → PAID
 *  PENDING → REJECTED
 *  PENDING → CANCELLED (by vendor)
 *  PROCESSING → FAILED → re-enter PENDING (after admin review)
 *
 * IMPORTANT:
 *  - amountPaise: stored in integer paise. ₹100 = 10000 paise.
 *  - bankSnapshot: immutable snapshot at request time. Vendor bank changes later must NOT affect this.
 *  - paymentProofFile: filename only — NEVER a public URL. Served via authenticated endpoint.
 *  - vendorId is always derived from req.user — never trusted from frontend body.
 */

// Valid status transitions — enforced server-side
const VALID_TRANSITIONS = {
  PENDING:     ['PROCESSING', 'REJECTED', 'CANCELLED'],
  PROCESSING:  ['PAID', 'FAILED'],
  FAILED:      ['PENDING'],      // Admin can re-queue a failed payout
  PAID:        [],               // Terminal state
  REJECTED:    [],               // Terminal state
  CANCELLED:   [],               // Terminal state
};

const withdrawalRequestSchema = new mongoose.Schema(
  {
    withdrawalId: {
      type: String,
      unique: true,
      default: () =>
        `WDR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },

    // Amount in integer PAISE. ₹100.00 = 10000
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },

    // ── Bank Snapshot (immutable at request time) ──────────────────────────
    bankSnapshot: {
      accountHolderName: { type: String, default: '' },
      maskedAccountNumber: { type: String, default: '' }, // e.g., XXXXXX1234
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
      bankBranch: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },

    // ── Payment Details (filled by Admin on PAID) ──────────────────────────
    paymentMethod: {
      type: String,
      enum: ['UPI', 'BANK_TRANSFER', 'IMPS', 'NEFT', 'RTGS', 'OTHER'],
    },
    utr: { type: String, default: '' },             // UTR / Transaction Reference
    paymentProofFile: { type: String, default: '' }, // filename only — NOT public URL
    adminNote: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },

    // ── Audit Fields ───────────────────────────────────────────────────────
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId }, // admin user ID

    // ── Idempotency ────────────────────────────────────────────────────────
    // Client can pass a unique key to prevent duplicate submissions
    idempotencyKey: { type: String, sparse: true },
  },
  {
    timestamps: true,
  }
);

// vendor + status filter is common
withdrawalRequestSchema.index({ vendor: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1 });
// Note: withdrawalId, idempotencyKey already indexed by unique:true above

/**
 * Validate a status transition.
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {boolean}
 */
withdrawalRequestSchema.statics.isValidTransition = function (currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
