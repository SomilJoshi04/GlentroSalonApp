/**
 * withdrawalService.js — All vendor withdrawal business logic.
 *
 * RULES:
 *  - All amounts in integer PAISE (₹1 = 100 paise).
 *  - VendorWallet balances updated atomically using $inc + conditional filter.
 *  - All critical operations use MongoDB sessions for atomicity.
 *  - Every balance change creates an immutable VendorLedger entry.
 *  - Every admin action creates an immutable WithdrawalAuditLog entry.
 *  - Vendor identity always derived from caller — never trusted from payload.
 *  - Operations are idempotent: double-processing is detected and safe-failed.
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const VendorWallet = require('../models/VendorWallet');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const WithdrawalAuditLog = require('../models/WithdrawalAuditLog');
const VendorLedger = require('../models/VendorLedger');
const Vendor = require('../models/Vendor');

// Payment proof storage directory — NOT publicly served
const PROOF_DIR = path.join(__dirname, '../../uploads/payout-proofs');
if (!fs.existsSync(PROOF_DIR)) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
}

// Allowed MIME types and extensions for payment proofs
const ALLOWED_PROOF_MIMETYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf',
];
const ALLOWED_PROOF_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Helper: Convert rupees (float) to integer paise safely.
 */
const rupeesToPaise = (rupees) => Math.round(Number(rupees) * 100);

/**
 * Helper: Convert integer paise to rupees (for display only).
 */
const paiseToRupees = (paise) => Math.round(paise) / 100;

/**
 * Helper: Mask bank account number. "1234567890" → "XXXXXX7890"
 */
const maskAccountNumber = (accNo) => {
  if (!accNo || accNo.length < 4) return '';
  const last4 = accNo.slice(-4);
  return 'X'.repeat(Math.max(accNo.length - 4, 4)) + last4;
};

/**
 * Helper: Create an audit log entry (does not throw on failure — audit should not block operations)
 */
const createAuditLog = async (data, session) => {
  try {
    const opts = session ? { session } : {};
    await WithdrawalAuditLog.create([data], opts);
  } catch (err) {
    console.error('[WithdrawalAuditLog] Failed to create audit entry:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getWallet — Get or create wallet for a vendor
// ─────────────────────────────────────────────────────────────────────────────
const getWallet = async (vendorId) => {
  return VendorWallet.getOrCreate(vendorId);
};

// ─────────────────────────────────────────────────────────────────────────────
// creditWalletFromPayment — Called inside paymentService sessions
// Credits vendor wallet when an online payment is completed.
// amountPaise: integer paise earned by vendor (vendorNetAmount * 100)
// ─────────────────────────────────────────────────────────────────────────────
const creditWalletFromPayment = async ({
  vendorId,
  salonId,
  bookingId,
  paymentTransactionId,
  amountPaise,
  description,
  session,
}) => {
  if (amountPaise <= 0) return; // Nothing to credit

  // Fetch balance before for audit trail
  const walletBefore = await VendorWallet.findOne({ vendor: vendorId }).session(session);
  const balanceBefore = walletBefore ? walletBefore.availableBalance : 0;

  // Atomic credit
  await VendorWallet.findOneAndUpdate(
    { vendor: vendorId },
    {
      $inc: {
        availableBalance: amountPaise,
        totalEarned: amountPaise,
        version: 1,
      },
      $set: { lastUpdatedAt: new Date() },
      $setOnInsert: {
        vendor: vendorId,
        pendingBalance: 0,
        reservedBalance: 0,
        totalWithdrawn: 0,
        recoveryOutstanding: 0,
      },
    },
    { upsert: true, new: true, session }
  );

  const balanceAfter = balanceBefore + amountPaise;

  // Immutable ledger entry
  await VendorLedger.create(
    [
      {
        vendor: vendorId,
        salon: salonId,
        booking: bookingId,
        paymentTransaction: paymentTransactionId,
        entryType: 'WALLET_CREDIT',
        amount: paiseToRupees(amountPaise),
        amountPaise,
        direction: 'CREDIT',
        paymentMethod: 'ONLINE',
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
        description: description || `Wallet credit for Booking #${bookingId}`,
      },
    ],
    { session }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// creditWalletFromSettlement
// Safely credits the vendor's wallet from a physical cash settlement
// ─────────────────────────────────────────────────────────────────────────────
const creditWalletFromSettlement = async ({
  vendorId,
  settlementId,
  amountPaise,
  description,
  session,
}) => {
  if (amountPaise <= 0) return;

  const wallet = await VendorWallet.getOrCreate(vendorId);
  const balanceBefore = wallet.availableBalance;

  // Handle recovery Outstanding first if any
  let addToAvailable = amountPaise;
  let recoverAmount = 0;

  if (wallet.recoveryOutstanding > 0) {
    recoverAmount = Math.min(amountPaise, wallet.recoveryOutstanding);
    addToAvailable = amountPaise - recoverAmount;
    
    await VendorWallet.findOneAndUpdate(
      { vendor: vendorId },
      {
        $inc: {
          recoveryOutstanding: -recoverAmount,
          version: 1,
        },
      },
      { session, new: true }
    );
    
    // Ledger entry for recovery application
    await VendorLedger.create(
      [
        {
          vendor: vendorId,
          settlement: settlementId,
          entryType: 'RECOVERY_APPLIED',
          amount: paiseToRupees(recoverAmount),
          amountPaise: recoverAmount,
          direction: 'CREDIT',
          paymentMethod: 'ONLINE',
          description: `Recovery applied from Cash Settlement #${settlementId}`,
        },
      ],
      { session }
    );
  }

  if (addToAvailable > 0) {
    const updatedWallet = await VendorWallet.findOneAndUpdate(
      { vendor: vendorId },
      {
        $inc: {
          availableBalance: addToAvailable,
          totalEarned: addToAvailable,
          version: 1,
        },
      },
      { session, new: true }
    );

    const balanceAfter = updatedWallet.availableBalance;

    await VendorLedger.create(
      [
        {
          vendor: vendorId,
          settlement: settlementId,
          entryType: 'WALLET_CREDIT',
          amount: paiseToRupees(addToAvailable),
          amountPaise: addToAvailable,
          direction: 'CREDIT',
          paymentMethod: 'ONLINE',
          balanceBeforePaise: balanceBefore,
          balanceAfterPaise: balanceAfter,
          description: description || `Wallet credit from Cash Settlement #${settlementId}`,
        },
      ],
      { session }
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// debitWalletForRefund — Called inside paymentService refund session
// Safely deducts from wallet; excess goes to recoveryOutstanding
// ─────────────────────────────────────────────────────────────────────────────
const debitWalletForRefund = async ({
  vendorId,
  salonId,
  bookingId,
  refundTransactionId,
  amountPaise,
  description,
  session,
}) => {
  if (amountPaise <= 0) return;

  // Fetch current wallet to determine split
  const wallet = await VendorWallet.findOne({ vendor: vendorId }).session(session);
  const currentAvailable = wallet ? wallet.availableBalance : 0;

  let deductFromAvailable = Math.min(amountPaise, currentAvailable);
  let addToRecovery = Math.max(0, amountPaise - deductFromAvailable);

  const balanceBefore = currentAvailable;

  await VendorWallet.findOneAndUpdate(
    { vendor: vendorId },
    {
      $inc: {
        availableBalance: -deductFromAvailable,
        recoveryOutstanding: addToRecovery,
        totalEarned: -deductFromAvailable, // reduce earned too
        version: 1,
      },
      $set: { lastUpdatedAt: new Date() },
      $setOnInsert: {
        vendor: vendorId,
        pendingBalance: 0,
        reservedBalance: 0,
        totalWithdrawn: 0,
      },
    },
    { upsert: true, new: true, session }
  );

  const balanceAfter = balanceBefore - deductFromAvailable;

  const entryType = addToRecovery > 0 ? 'WALLET_RECOVERY' : 'WALLET_CREDIT';

  await VendorLedger.create(
    [
      {
        vendor: vendorId,
        salon: salonId,
        booking: bookingId,
        refundTransaction: refundTransactionId,
        entryType: 'WALLET_RECOVERY',
        amount: paiseToRupees(amountPaise),
        amountPaise,
        direction: 'DEBIT',
        paymentMethod: 'ONLINE',
        balanceBeforePaise: balanceBefore,
        balanceAfterPaise: balanceAfter,
        description:
          description ||
          `Wallet refund debit: ₹${paiseToRupees(deductFromAvailable)} from available, ₹${paiseToRupees(addToRecovery)} to recovery`,
        metadata: { deductFromAvailable, addToRecovery },
      },
    ],
    { session }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// requestWithdrawal — Vendor requests a payout
// vendorId: always from req.user.id on the controller layer — never trusted from body
// amountPaise: integer paise
// ─────────────────────────────────────────────────────────────────────────────
const requestWithdrawal = async (vendorId, amountPaise, idempotencyKey) => {
  // Validate amount
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('Invalid withdrawal amount. Must be a positive integer in paise.');
  }

  // Idempotency: check existing request with this key
  if (idempotencyKey) {
    const existing = await WithdrawalRequest.findOne({ idempotencyKey });
    if (existing) return { alreadyExists: true, withdrawal: existing };
  }

  // Fetch vendor for bank snapshot
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw new Error('Vendor not found');

  const bank = vendor.bank || {};
  const bankSnapshot = {
    accountHolderName: bank.accountHolderName || '',
    maskedAccountNumber: maskAccountNumber(bank.accountNumber || ''),
    ifscCode: bank.ifscCode || '',
    bankName: bank.bankName || '',
    bankBranch: bank.bankBranch || '',
    upiId: bank.upiId || '',
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ATOMIC: Deduct from available and add to reserved — conditional on sufficient balance
    const walletBefore = await VendorWallet.findOne({ vendor: vendorId }).session(session);
    if (!walletBefore || walletBefore.availableBalance < amountPaise) {
      throw new Error(
        `Insufficient balance. Available: ₹${paiseToRupees(walletBefore?.availableBalance || 0)}, Requested: ₹${paiseToRupees(amountPaise)}`
      );
    }

    const balanceBefore = walletBefore.availableBalance;

    // Check no other PENDING withdrawal already reserves this balance
    const pendingCount = await WithdrawalRequest.countDocuments({
      vendor: vendorId,
      status: 'PENDING',
    }).session(session);

    // Atomic conditional update: only succeeds if available >= amount
    const updatedWallet = await VendorWallet.findOneAndUpdate(
      {
        vendor: vendorId,
        availableBalance: { $gte: amountPaise }, // ATOMIC GUARD
      },
      {
        $inc: {
          availableBalance: -amountPaise,
          reservedBalance: amountPaise,
          version: 1,
        },
        $set: { lastUpdatedAt: new Date() },
      },
      { new: true, session }
    );

    if (!updatedWallet) {
      throw new Error('Insufficient available balance or concurrent request conflict. Please try again.');
    }

    // Create withdrawal request
    const [withdrawal] = await WithdrawalRequest.create(
      [
        {
          vendor: vendorId,
          amountPaise,
          status: 'PENDING',
          bankSnapshot,
          requestedAt: new Date(),
          idempotencyKey: idempotencyKey || undefined,
        },
      ],
      { session }
    );

    const balanceAfter = updatedWallet.availableBalance;

    // Immutable ledger entry
    await VendorLedger.create(
      [
        {
          vendor: vendorId,
          withdrawal: withdrawal._id,
          entryType: 'PAYOUT_RESERVED',
          amount: paiseToRupees(amountPaise),
          amountPaise,
          direction: 'DEBIT',
          balanceBeforePaise: balanceBefore,
          balanceAfterPaise: balanceAfter,
          description: `Withdrawal request ${withdrawal.withdrawalId} — ₹${paiseToRupees(amountPaise)} reserved`,
        },
      ],
      { session }
    );

    // Audit log
    await createAuditLog(
      {
        withdrawal: withdrawal._id,
        vendor: vendorId,
        action: 'REQUEST_CREATED',
        oldStatus: null,
        newStatus: 'PENDING',
        amountPaise,
        note: `Vendor requested withdrawal of ₹${paiseToRupees(amountPaise)}`,
        timestamp: new Date(),
      },
      session
    );

    await session.commitTransaction();
    session.endSession();

    return { alreadyExists: false, withdrawal };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// processWithdrawal — Admin marks a withdrawal as PROCESSING
// ─────────────────────────────────────────────────────────────────────────────
const processWithdrawal = async (withdrawalId, adminId) => {
  const withdrawal = await WithdrawalRequest.findById(withdrawalId);
  if (!withdrawal) throw new Error('Withdrawal request not found');

  if (!WithdrawalRequest.isValidTransition(withdrawal.status, 'PROCESSING')) {
    throw new Error(`Cannot move from ${withdrawal.status} to PROCESSING`);
  }

  const oldStatus = withdrawal.status;
  withdrawal.status = 'PROCESSING';
  withdrawal.processedBy = adminId;
  await withdrawal.save();

  await createAuditLog({
    withdrawal: withdrawal._id,
    vendor: withdrawal.vendor,
    admin: adminId,
    action: 'PROCESS_WITHDRAWAL',
    oldStatus,
    newStatus: 'PROCESSING',
    amountPaise: withdrawal.amountPaise,
    timestamp: new Date(),
  });

  return withdrawal;
};

// ─────────────────────────────────────────────────────────────────────────────
// validateProofFile — Validate uploaded payment proof file
// ─────────────────────────────────────────────────────────────────────────────
const validateProofFile = (file) => {
  if (!file) throw new Error('Payment proof file is required');

  if (!ALLOWED_PROOF_MIMETYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_PROOF_EXTENSIONS.join(', ')}`);
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_PROOF_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file extension: ${ext}`);
  }

  if (file.size > MAX_PROOF_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size: ${MAX_PROOF_SIZE_BYTES / 1024 / 1024}MB`);
  }

  // Path traversal protection: strip any directory components
  const safeName = path.basename(file.originalname || 'proof').replace(/[^a-zA-Z0-9._-]/g, '_');
  return { ext, safeName };
};

/**
 * Store proof file securely and return the generated filename.
 */
const storeProofFile = (buffer, ext) => {
  const uuid = crypto.randomBytes(8).toString('hex');
  const filename = `proof_${Date.now()}_${uuid}${ext}`;
  const filePath = path.join(PROOF_DIR, filename);

  // Verify path is inside PROOF_DIR (path traversal guard)
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(PROOF_DIR))) {
    throw new Error('Invalid file path detected');
  }

  fs.writeFileSync(filePath, buffer);
  return filename;
};

// ─────────────────────────────────────────────────────────────────────────────
// markWithdrawalPaid — Admin marks withdrawal as PAID (atomic)
// ─────────────────────────────────────────────────────────────────────────────
const markWithdrawalPaid = async (withdrawalId, adminId, { utr, paymentMethod, proofFile, adminNote, amountPaidPaise }) => {
  if (!utr || !utr.trim()) throw new Error('UTR/Transaction reference is required');
  if (!paymentMethod) throw new Error('Payment method is required');
  if (!proofFile) throw new Error('Payment proof file is required');

  // Validate proof file
  const { ext, safeName } = validateProofFile(proofFile);

  const withdrawal = await WithdrawalRequest.findById(withdrawalId).lean();
  if (!withdrawal) throw new Error('Withdrawal request not found');

  // IDEMPOTENCY: Already PAID? Return without re-processing
  if (withdrawal.status === 'PAID') {
    return { alreadyPaid: true, withdrawal };
  }

  if (!WithdrawalRequest.isValidTransition(withdrawal.status, 'PAID')) {
    throw new Error(`Cannot mark PAID from status: ${withdrawal.status}`);
  }

  // Store proof file (outside session — filesystem operation)
  const proofFilename = storeProofFile(proofFile.buffer, ext);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomically: decrease reservedBalance, increase totalWithdrawn
    const updatedWallet = await VendorWallet.findOneAndUpdate(
      {
        vendor: withdrawal.vendor,
        reservedBalance: { $gte: withdrawal.amountPaise }, // GUARD: ensure reserved is still there
      },
      {
        $inc: {
          reservedBalance: -withdrawal.amountPaise,
          totalWithdrawn: withdrawal.amountPaise,
          version: 1,
        },
        $set: { lastUpdatedAt: new Date() },
      },
      { new: true, session }
    );

    if (!updatedWallet) {
      throw new Error('Wallet reservation mismatch. Withdrawal may have already been processed.');
    }

    // Update withdrawal to PAID
    await WithdrawalRequest.findOneAndUpdate(
      { _id: withdrawalId, status: { $ne: 'PAID' } }, // Idempotency guard
      {
        $set: {
          status: 'PAID',
          utr: utr.trim(),
          paymentMethod,
          paymentProofFile: proofFilename,
          adminNote: adminNote || '',
          processedBy: adminId,
          processedAt: new Date(),
        },
      },
      { session }
    );

    // Immutable ledger entry
    await VendorLedger.create(
      [
        {
          vendor: withdrawal.vendor,
          withdrawal: withdrawal._id,
          entryType: 'PAYOUT_COMPLETED',
          amount: paiseToRupees(withdrawal.amountPaise),
          amountPaise: withdrawal.amountPaise,
          direction: 'DEBIT',
          balanceBeforePaise: updatedWallet.reservedBalance + withdrawal.amountPaise,
          balanceAfterPaise: updatedWallet.reservedBalance,
          description: `Withdrawal ${withdrawal.withdrawalId} paid — UTR: ${utr.trim()}`,
          metadata: { utr: utr.trim(), paymentMethod, proofFilename },
        },
      ],
      { session }
    );

    // Audit log
    await createAuditLog(
      {
        withdrawal: withdrawal._id,
        vendor: withdrawal.vendor,
        admin: adminId,
        action: 'MARK_PAID',
        oldStatus: withdrawal.status,
        newStatus: 'PAID',
        amountPaise: withdrawal.amountPaise,
        utr: utr.trim(),
        note: adminNote || '',
        timestamp: new Date(),
      },
      session
    );

    await session.commitTransaction();
    session.endSession();

    return { alreadyPaid: false, proofFilename };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    // Clean up stored proof file if transaction failed
    try {
      if (proofFilename) {
        const proofPath = path.join(PROOF_DIR, proofFilename);
        if (fs.existsSync(proofPath)) fs.unlinkSync(proofPath);
      }
    } catch (_) {}
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// rejectWithdrawal — Admin rejects a withdrawal (atomic)
// ─────────────────────────────────────────────────────────────────────────────
const rejectWithdrawal = async (withdrawalId, adminId, rejectionReason) => {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error('Rejection reason is required');
  }

  const withdrawal = await WithdrawalRequest.findById(withdrawalId).lean();
  if (!withdrawal) throw new Error('Withdrawal request not found');

  if (!WithdrawalRequest.isValidTransition(withdrawal.status, 'REJECTED')) {
    throw new Error(`Cannot reject a withdrawal with status: ${withdrawal.status}`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const walletBefore = await VendorWallet.findOne({ vendor: withdrawal.vendor }).session(session);
    const reservedBefore = walletBefore ? walletBefore.reservedBalance : 0;

    // Release reservation: reservedBalance → availableBalance
    const updatedWallet = await VendorWallet.findOneAndUpdate(
      { vendor: withdrawal.vendor, reservedBalance: { $gte: withdrawal.amountPaise } },
      {
        $inc: {
          reservedBalance: -withdrawal.amountPaise,
          availableBalance: withdrawal.amountPaise,
          version: 1,
        },
        $set: { lastUpdatedAt: new Date() },
      },
      { new: true, session }
    );

    if (!updatedWallet) {
      throw new Error('Could not release reservation — possible concurrent modification');
    }

    // Update withdrawal status
    await WithdrawalRequest.findByIdAndUpdate(
      withdrawalId,
      {
        $set: {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          processedBy: adminId,
          processedAt: new Date(),
        },
      },
      { session }
    );

    // Immutable ledger entry
    await VendorLedger.create(
      [
        {
          vendor: withdrawal.vendor,
          withdrawal: withdrawal._id,
          entryType: 'PAYOUT_RELEASED',
          amount: paiseToRupees(withdrawal.amountPaise),
          amountPaise: withdrawal.amountPaise,
          direction: 'CREDIT',
          balanceBeforePaise: reservedBefore,
          balanceAfterPaise: updatedWallet.availableBalance,
          description: `Withdrawal ${withdrawal.withdrawalId} rejected — amount released back to available balance`,
          metadata: { rejectionReason: rejectionReason.trim() },
        },
      ],
      { session }
    );

    // Audit log
    await createAuditLog(
      {
        withdrawal: withdrawal._id,
        vendor: withdrawal.vendor,
        admin: adminId,
        action: 'REJECT_WITHDRAWAL',
        oldStatus: withdrawal.status,
        newStatus: 'REJECTED',
        amountPaise: withdrawal.amountPaise,
        note: rejectionReason.trim(),
        timestamp: new Date(),
      },
      session
    );

    await session.commitTransaction();
    session.endSession();

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getProofFilePath — returns proof file path (after authorization check in controller)
// ─────────────────────────────────────────────────────────────────────────────
const getProofFilePath = (filename) => {
  if (!filename) return null;
  const safeName = path.basename(filename); // strip any directory traversal
  const resolvedPath = path.resolve(PROOF_DIR, safeName);
  if (!resolvedPath.startsWith(path.resolve(PROOF_DIR))) return null;
  if (!fs.existsSync(resolvedPath)) return null;
  return resolvedPath;
};

// ─────────────────────────────────────────────────────────────────────────────
// getWithdrawalHistory — vendor's own withdrawal history (paginated)
// ─────────────────────────────────────────────────────────────────────────────
const getWithdrawalHistory = async (vendorId, { page = 1, limit = 10, status } = {}) => {
  const filter = { vendor: vendorId };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [withdrawals, total] = await Promise.all([
    WithdrawalRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    WithdrawalRequest.countDocuments(filter),
  ]);

  return {
    withdrawals,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getAdminWithdrawals — all withdrawals for admin (paginated + filtered)
// ─────────────────────────────────────────────────────────────────────────────
const getAdminWithdrawals = async ({ page = 1, limit = 20, status, vendorId } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (vendorId) filter.vendor = vendorId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [withdrawals, total] = await Promise.all([
    WithdrawalRequest.find(filter)
      .populate('vendor', 'name email phone businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    WithdrawalRequest.countDocuments(filter),
  ]);

  return {
    withdrawals,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

module.exports = {
  rupeesToPaise,
  paiseToRupees,
  getWallet,
  creditWalletFromPayment,
  creditWalletFromSettlement,
  debitWalletForRefund,
  requestWithdrawal,
  processWithdrawal,
  markWithdrawalPaid,
  rejectWithdrawal,
  getProofFilePath,
  getWithdrawalHistory,
  getAdminWithdrawals,
  PROOF_DIR,
};
