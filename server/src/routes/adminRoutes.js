const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getDashboardStats,
  getRecentBookings,
  getBookingStats,
  getUsers,
  updateUserStatus,
  getVendors,
  getVendorDetail,
  createVendor,
  updateVendor,
  updateKycStatus,
  updateVendorStatus,
  getPendingCounts,
  getAllBookings,
  getCategories,
  getSubcategories,
  getServices,
  getAccountRecoveryRequests,
  getAccountRecoveryRequestById,
  approveAccountRecovery,
  rejectAccountRecovery,
  getAnalytics,
  getVendorCashControl,
  updateVendorCashLimit
} = require('../controllers/adminController');

// Apply protection and authorization to all admin routes
router.use(protect);
router.use(authorize('admin'));

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/recent-bookings', getRecentBookings);
router.get('/booking-stats', getBookingStats);
router.get('/pending-counts', getPendingCounts);

// Users Management
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

// Account Recovery
router.get('/account-recovery', getAccountRecoveryRequests);
router.get('/account-recovery/:id', getAccountRecoveryRequestById);
router.patch('/account-recovery/:id/approve', approveAccountRecovery);
router.patch('/account-recovery/:id/reject', rejectAccountRecovery);

// Bookings Management
router.get('/bookings', getAllBookings);

// Categories & Services
router.get('/categories', getCategories);
router.get('/subcategories', getSubcategories);
router.get('/services', getServices);

// Vendors Management
router.get('/vendors', getVendors);
router.post('/vendors', createVendor);
router.get('/vendors/:id', getVendorDetail);
router.put('/vendors/:id', updateVendor);
router.put('/vendors/:id/status', updateVendorStatus);
router.patch('/vendors/:id/kyc', updateKycStatus);

// Vendor Cash Control
router.get('/vendor-cash-control', getVendorCashControl);
router.put('/vendor-cash-control/:id', updateVendorCashLimit);

// Content Management
const { getAdminContentByType, updateContent } = require('../controllers/contentController');
router.get('/content/:type', getAdminContentByType);
router.put('/content/:type', updateContent);

// Subscription Settings
const { getSettings, updateSettings } = require('../controllers/subscriptionSettingController');
router.get('/subscription-settings', getSettings);
router.put('/subscription-settings', updateSettings);

// ── Admin Vendor Withdrawals ───────────────────────────────────────────────────
const multer = require('multer');
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
const withdrawalController = require('../controllers/withdrawalController');
router.get('/withdrawals', withdrawalController.adminListWithdrawals);
router.get('/withdrawals/:id', withdrawalController.adminGetWithdrawal);
router.patch('/withdrawals/:id/process', withdrawalController.adminProcessWithdrawal);
router.post('/withdrawals/:id/pay', proofUpload.single('proofFile'), withdrawalController.adminMarkPaid);
router.patch('/withdrawals/:id/reject', withdrawalController.adminRejectWithdrawal);

module.exports = router;

