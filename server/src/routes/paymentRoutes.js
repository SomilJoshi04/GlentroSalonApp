const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const paymentController = require('../controllers/paymentController');
const withdrawalController = require('../controllers/withdrawalController');
const { paymentLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');

// Multer: memory storage for proof file upload (validation happens in service)
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ── Webhook (NO auth token, raw JSON body) ────────────────────────────────────
// Must be registered BEFORE express.json() parses it.
// We use express.raw() here so the body is kept as a Buffer for HMAC verification.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Parse raw buffer to object for our handler
    if (Buffer.isBuffer(req.body)) {
      req.body = JSON.parse(req.body.toString('utf8'));
    }
    next();
  },
  paymentController.handleWebhook
);

// ── All other payment routes require authentication ───────────────────────────
router.use(protect);

// User: create Razorpay order
router.post('/create-order', paymentLimiter, paymentController.createOrder);

// User: verify payment after Razorpay callback
router.post('/verify', paymentLimiter, paymentController.verifyPayment);

// User/Vendor/Admin: check payment status for a booking
router.get('/status/:bookingId', paymentController.getPaymentStatus);

// User/Vendor/Admin: initiate refund for a paid booking
router.post('/:bookingId/refund', paymentLimiter, paymentController.initiateRefund);

// Vendor: record cash payment received at salon
router.post('/cash', authorize('vendor'), paymentController.recordCashPayment);

// ── Vendor financial routes ───────────────────────────────────────────────────
router.get('/vendor-financial-summary', authorize('vendor'), paymentController.getVendorFinancialSummary);
router.get('/vendor-ledger', authorize('vendor'), paymentController.getVendorLedger);

// ── Vendor Wallet + Withdrawal routes ─────────────────────────────────────────────
router.get('/wallet', authorize('vendor'), withdrawalController.getWallet);
router.post('/withdrawal/request', authorize('vendor'), paymentLimiter, withdrawalController.requestWithdrawal);
router.get('/withdrawal/history', authorize('vendor'), withdrawalController.getWithdrawalHistory);
// Authenticated proof access — vendor (own) or admin
router.get('/withdrawal/:id/proof', protect, withdrawalController.getProofDocument);

// ── Admin financial routes ────────────────────────────────────────────────────
router.get('/transactions', authorize('admin'), paymentController.getAdminTransactions);
router.get('/admin-financial-summary', authorize('admin'), paymentController.getAdminFinancialSummary);
router.post('/admin-settlement', authorize('admin'), paymentController.recordAdminSettlement);
router.get('/admin-settlements', authorize('admin'), paymentController.getAdminSettlements);

module.exports = router;
