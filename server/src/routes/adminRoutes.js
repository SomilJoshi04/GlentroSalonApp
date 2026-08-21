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
  getAnalytics
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
router.put('/vendors/:id/status', updateVendorStatus);

// Content Management
const { getAdminContentByType, updateContent } = require('../controllers/contentController');
router.get('/content/:type', getAdminContentByType);
router.put('/content/:type', updateContent);

module.exports = router;
