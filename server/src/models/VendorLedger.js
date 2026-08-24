const mongoose = require('mongoose');

/**
 * VendorLedger — running financial ledger tracking what each vendor has earned,
 * what they owe admin, what admin owes them, and settlement history.
 * Entries are append-only. Never delete or modify entries.
 * Corrections must use reversal/adjustment entries.
 *
 * PAISE: amountPaise stores the integer paise value for financial precision.
 *        amount field is kept for backward compatibility with existing records.
 */
const vendorLedgerSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    paymentTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
    refundTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'RefundTransaction' },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorSettlement' },
    withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: 'WithdrawalRequest' },

    entryType: {
      type: String,
      enum: [
        // ── Existing types (unchanged) ────────────────────────────────────
        'ONLINE_RECEIVED',    // Vendor's net share from online payment (to be settled by admin)
        'CASH_RECEIVED',      // Vendor physically collected cash from customer
        'COMMISSION_DEBIT',   // Commission + Platform fee owed to admin (for CASH bookings)
        'REFUND_REVERSAL',    // Financial impact reversed due to customer refund
        'SETTLEMENT_CREDIT',  // Admin paid vendor their online earnings (legacy settlement)
        'SETTLEMENT_DEBIT',   // Vendor paid admin outstanding cash dues (legacy settlement)
        'CASH_SETTLEMENT_PAID', // Vendor paid platform online to clear their excess cash holding
        // ── New Wallet types ──────────────────────────────────────────────
        'WALLET_CREDIT',      // Online earnings credited to vendor wallet (availableBalance +)
        'PAYOUT_RESERVED',    // Vendor requested withdrawal; amount reserved (availableBalance → reservedBalance)
        'PAYOUT_COMPLETED',   // Withdrawal paid by admin; reserved settled (reservedBalance -)
        'PAYOUT_RELEASED',    // Withdrawal rejected/failed; reserved returned (reservedBalance → availableBalance)
        'WALLET_RECOVERY',    // Recovery applied against future earnings when refund > available balance
        'WALLET_ADJUSTMENT',  // Manual admin adjustment with mandatory reason
      ],
      required: true,
    },

    // Backward-compatible amount (rupees, float) — kept for existing records
    amount: { type: Number, required: true, min: 0 },
    // New: integer paise (authoritative for new wallet entries)
    amountPaise: { type: Number, min: 0 },

    direction: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    paymentMethod: { type: String, enum: ['ONLINE', 'CASH'] },

    // Wallet balance snapshot at time of entry (paise) — for audit trail
    balanceBeforePaise: { type: Number },
    balanceAfterPaise: { type: Number },

    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

vendorLedgerSchema.index({ vendor: 1, createdAt: -1 });
vendorLedgerSchema.index({ vendor: 1, entryType: 1 });
vendorLedgerSchema.index({ booking: 1 });
vendorLedgerSchema.index({ salon: 1 });
vendorLedgerSchema.index({ entryType: 1 });
vendorLedgerSchema.index({ withdrawal: 1 });

module.exports = mongoose.model('VendorLedger', vendorLedgerSchema);

