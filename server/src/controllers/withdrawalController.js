/**
 * withdrawalController.js — HTTP layer for vendor wallet + withdrawal operations.
 *
 * SECURITY RULES:
 *  - vendorId is ALWAYS derived from req.user.id (set by authMiddleware). Never from body/query.
 *  - salonId from frontend is validated against vendor ownership before use.
 *  - All financial amounts from frontend are treated as user input and validated server-side.
 *  - Payment proof files are served through this controller only after ownership check.
 */

const path = require('path');
const fs = require('fs');
const VendorWallet = require('../models/VendorWallet');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const WithdrawalAuditLog = require('../models/WithdrawalAuditLog');
const withdrawalService = require('../services/withdrawalService');

// ─────────────────────────────────────────────────────────────────────────────
// Vendor: GET /api/payments/wallet
// Returns vendor's own wallet balances (in both paise and rupees for display)
// ─────────────────────────────────────────────────────────────────────────────
const getWallet = async (req, res, next) => {
  try {
    const vendorId = req.user.id; // ALWAYS from authenticated token — never from body
    const wallet = await withdrawalService.getWallet(vendorId);

    // Convert paise to rupees for display
    const toRupees = (p) => Math.round(p || 0) / 100;

    res.json({
      success: true,
      data: {
        availableBalance: toRupees(wallet.availableBalance),
        pendingBalance: toRupees(wallet.pendingBalance),
        reservedBalance: toRupees(wallet.reservedBalance),
        totalEarned: toRupees(wallet.totalEarned),
        totalWithdrawn: toRupees(wallet.totalWithdrawn),
        recoveryOutstanding: toRupees(wallet.recoveryOutstanding),
        // Also expose paise for any client that needs precision
        paise: {
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          reservedBalance: wallet.reservedBalance,
          totalEarned: wallet.totalEarned,
          totalWithdrawn: wallet.totalWithdrawn,
          recoveryOutstanding: wallet.recoveryOutstanding,
        },
        lastUpdatedAt: wallet.lastUpdatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor: POST /api/payments/withdrawal/request
// Body: { amountRupees: number, idempotencyKey?: string }
// ─────────────────────────────────────────────────────────────────────────────
const requestWithdrawal = async (req, res, next) => {
  try {
    const vendorId = req.user.id; // ALWAYS from authenticated token
    const { amountRupees, idempotencyKey } = req.body;

    // Validate input
    if (amountRupees === undefined || amountRupees === null) {
      return res.status(400).json({ success: false, message: 'Withdrawal amount is required' });
    }

    const parsedAmount = Number(amountRupees);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    // Convert to integer paise — this is the authoritative amount
    const amountPaise = Math.round(parsedAmount * 100);
    if (amountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'Amount too small. Minimum ₹0.01' });
    }

    const result = await withdrawalService.requestWithdrawal(vendorId, amountPaise, idempotencyKey);

    if (result.alreadyExists) {
      return res.json({
        success: true,
        message: 'Withdrawal request already submitted',
        data: result.withdrawal,
      });
    }

    res.status(201).json({
      success: true,
      message: `Withdrawal request of ₹${parsedAmount.toFixed(2)} submitted successfully`,
      data: result.withdrawal,
    });
  } catch (error) {
    if (
      error.message.includes('Insufficient') ||
      error.message.includes('Invalid') ||
      error.message.includes('concurrent')
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor: GET /api/payments/withdrawal/history
// Query: { page, limit, status }
// ─────────────────────────────────────────────────────────────────────────────
const getWithdrawalHistory = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { page, limit, status } = req.query;

    const result = await withdrawalService.getWithdrawalHistory(vendorId, { page, limit, status });

    // Convert paise to rupees for display
    const mapped = result.withdrawals.map((w) => ({
      ...w,
      amountRupees: Math.round(w.amountPaise || 0) / 100,
    }));

    res.json({ success: true, data: { ...result, withdrawals: mapped } });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor + Admin: GET /api/payments/withdrawal/:id/proof
// Serves payment proof file after strict ownership/role check
// ─────────────────────────────────────────────────────────────────────────────
const getProofDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const withdrawal = await WithdrawalRequest.findById(id).lean();
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    // AUTHORIZATION CHECK
    if (role === 'vendor') {
      // Vendor can only access their own withdrawal proof
      if (withdrawal.vendor.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this proof' });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!withdrawal.paymentProofFile) {
      return res.status(404).json({ success: false, message: 'No payment proof available for this withdrawal' });
    }

    const filePath = withdrawalService.getProofFilePath(withdrawal.paymentProofFile);
    if (!filePath) {
      return res.status(404).json({ success: false, message: 'Proof file not found on server' });
    }

    // Serve the file (inline for images, attachment for PDFs)
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', ext === '.pdf' ? 'attachment' : 'inline');
    res.setHeader('Cache-Control', 'private, no-cache'); // Never cache sensitive docs
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: GET /api/admin/withdrawals
// Query: { page, limit, status, vendorId }
// ─────────────────────────────────────────────────────────────────────────────
const adminListWithdrawals = async (req, res, next) => {
  try {
    const { page, limit, status, vendorId } = req.query;
    const result = await withdrawalService.getAdminWithdrawals({ page, limit, status, vendorId });

    const mapped = result.withdrawals.map((w) => ({
      ...w,
      amountRupees: Math.round(w.amountPaise || 0) / 100,
    }));

    res.json({ success: true, data: { ...result, withdrawals: mapped } });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: GET /api/admin/withdrawals/:id
// ─────────────────────────────────────────────────────────────────────────────
const adminGetWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id)
      .populate('vendor', 'name email phone businessName bank')
      .lean();

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    const auditLogs = await WithdrawalAuditLog.find({ withdrawal: withdrawal._id })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        ...withdrawal,
        amountRupees: Math.round(withdrawal.amountPaise || 0) / 100,
        auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: PATCH /api/admin/withdrawals/:id/process
// ─────────────────────────────────────────────────────────────────────────────
const adminProcessWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await withdrawalService.processWithdrawal(req.params.id, req.user.id);
    res.json({ success: true, message: 'Withdrawal marked as Processing', data: withdrawal });
  } catch (error) {
    if (error.message.includes('Cannot') || error.message.includes('not found')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: POST /api/admin/withdrawals/:id/pay
// Multipart form: { utr, paymentMethod, adminNote } + file field "proofFile"
// ─────────────────────────────────────────────────────────────────────────────
const adminMarkPaid = async (req, res, next) => {
  try {
    const { utr, paymentMethod, adminNote } = req.body;
    const proofFile = req.file; // from multer

    const result = await withdrawalService.markWithdrawalPaid(
      req.params.id,
      req.user.id,
      { utr, paymentMethod, proofFile, adminNote }
    );

    if (result.alreadyPaid) {
      return res.json({ success: true, message: 'Withdrawal was already marked as PAID', alreadyPaid: true });
    }

    res.json({ success: true, message: 'Withdrawal marked as PAID successfully' });
  } catch (error) {
    if (
      error.message.includes('required') ||
      error.message.includes('Invalid') ||
      error.message.includes('Cannot') ||
      error.message.includes('mismatch')
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin: PATCH /api/admin/withdrawals/:id/reject
// Body: { rejectionReason: string }
// ─────────────────────────────────────────────────────────────────────────────
const adminRejectWithdrawal = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    await withdrawalService.rejectWithdrawal(req.params.id, req.user.id, rejectionReason);
    res.json({ success: true, message: 'Withdrawal rejected and balance released' });
  } catch (error) {
    console.error('[adminRejectWithdrawal] Error:', error);
    res.status(400).json({ success: false, message: error.message || 'Action failed' });
  }
};

module.exports = {
  getWallet,
  requestWithdrawal,
  getWithdrawalHistory,
  getProofDocument,
  adminListWithdrawals,
  adminGetWithdrawal,
  adminProcessWithdrawal,
  adminMarkPaid,
  adminRejectWithdrawal,
};
