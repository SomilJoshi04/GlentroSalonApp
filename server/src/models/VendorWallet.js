const mongoose = require('mongoose');

/**
 * VendorWallet — Vendor-level wallet tracking all balance states.
 *
 * CRITICAL RULES:
 *  - All amounts stored in INTEGER PAISE (₹1 = 100 paise).
 *  - availableBalance, pendingBalance, reservedBalance must NEVER go below 0.
 *  - Balances must ONLY be modified through atomic backend operations.
 *  - Frontend cannot directly write to this model.
 *  - One wallet per vendor (unique index on vendor).
 *  - Always use findOneAndUpdate + $inc for balance changes — NEVER save() a fetched document.
 *
 * Balance States:
 *  pendingBalance    — Earnings not yet eligible for withdrawal (e.g., booking not completed)
 *  availableBalance  — Eligible earnings ready for withdrawal
 *  reservedBalance   — Amount reserved for a pending withdrawal request
 *  totalEarned       — Cumulative lifetime earnings (never decreases except recovery)
 *  totalWithdrawn    — Cumulative amount successfully withdrawn
 *  recoveryOutstanding — Amount owed back to platform (e.g., refund > available balance)
 */
const vendorWalletSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      unique: true,
    },

    // ── Balances (all in PAISE, integer) ──────────────────────────────────────
    availableBalance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    reservedBalance: { type: Number, default: 0, min: 0 },

    // ── Lifetime Totals (in PAISE) ────────────────────────────────────────────
    totalEarned: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    recoveryOutstanding: { type: Number, default: 0, min: 0 },

    // ── Optimistic Locking ────────────────────────────────────────────────────
    // Incremented on every balance change to detect stale reads
    version: { type: Number, default: 0 },

    lastUpdatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Unique index is already created by unique: true on the vendor field above

/**
 * Helper: Get wallet for a vendor, create if it doesn't exist.
 * Safe for concurrent calls — upsert is atomic.
 */
vendorWalletSchema.statics.getOrCreate = async function (vendorId, session = null) {
  const options = { upsert: true, new: true };
  if (session) options.session = session;
  return this.findOneAndUpdate(
    { vendor: vendorId },
    {
      $setOnInsert: {
        vendor: vendorId,
        availableBalance: 0,
        pendingBalance: 0,
        reservedBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        recoveryOutstanding: 0,
        version: 0,
      },
    },
    options
  );
};

/**
 * Add dues to recoveryOutstanding and suspend vendor if limit exceeded.
 */
vendorWalletSchema.statics.addDuesAndCheckSuspension = async function (vendorId, amountPaise) {
  const Vendor = mongoose.model('Vendor');
  const AppSetting = mongoose.model('AppSetting');
  
  let thresholdPaise = 50000; // default ₹500
  const setting = await AppSetting.findOne({ key: 'maxPendingDuesLimit' });
  if (setting && setting.value) {
    const parsed = parseInt(setting.value, 10);
    if (!isNaN(parsed)) {
      thresholdPaise = parsed;
    }
  }

  const wallet = await this.findOneAndUpdate(
    { vendor: vendorId },
    { $inc: { recoveryOutstanding: amountPaise, version: 1 }, $set: { lastUpdatedAt: new Date() } },
    { new: true, upsert: true } // upsert ensures wallet exists
  );

  if (wallet.recoveryOutstanding > thresholdPaise) {
    await Vendor.findByIdAndUpdate(vendorId, {
      accountStatus: 'suspended',
      $addToSet: { suspensionReasons: 'CASH_LIMIT_EXCEEDED' },
    });
  }

  return wallet;
};

module.exports = mongoose.model('VendorWallet', vendorWalletSchema);
