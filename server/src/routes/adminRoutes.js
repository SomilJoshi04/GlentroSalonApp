const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getDashboardStats,
  getRecentBookings,
  getBookingStats,
  getUsers,
  getVendors,
  updateVendorStatus,
  getPendingCounts,
  getAllBookings,
  getCategories,
  getSubcategories,
  getServices
} = require('../controllers/adminController');

// Apply protection and authorization to all admin routes
router.use(protect);
router.use(authorize('admin'));

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);
router.get('/recent-bookings', getRecentBookings);
router.get('/booking-stats', getBookingStats);
router.get('/pending-counts', getPendingCounts);

// Users Management
router.get('/users', getUsers);

// Bookings Management
router.get('/bookings', getAllBookings);

// Categories & Services
router.get('/categories', getCategories);
router.get('/subcategories', getSubcategories);
router.get('/services', getServices);

// Vendors Management
router.get('/vendors', getVendors);
router.put('/vendors/:id/status', updateVendorStatus);

module.exports = router;
