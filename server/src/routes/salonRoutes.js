const router = require('express').Router();
const { createSalon, getSalons, getNearbySalons, getSalonsByCity, getSalonById, getSalonResources, updateSalon, getVendorSalons, getAllSalons, getCities, getZones, toggleJacuzzi } = require('../controllers/salonController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/public', getSalons);
router.get('/nearby', getNearbySalons);
router.get('/city/:city', getSalonsByCity);
router.get('/cities', getCities);
router.get('/cities/:city/zones', getZones);
router.get('/detail/:id', getSalonById);
router.get('/:id/resources', getSalonResources);

// Public: Top Stylists for a salon (Wilson-score ranked, active staff with >= 1 review)
const { getTopStylists } = require('../controllers/staffReviewController');
router.get('/:salonId/top-stylists', getTopStylists);

// Vendor routes
const { requireSubscriptionAccess } = require('../middleware/subscriptionMiddleware');
router.post('/', protect, authorize('vendor'), requireSubscriptionAccess, upload.single('image'), createSalon);
router.put('/:id', protect, authorize('vendor', 'admin'), requireSubscriptionAccess, upload.single('image'), updateSalon);
router.get('/vendor/my-salons', protect, authorize('vendor'), getVendorSalons);
router.put('/:id/jacuzzi-toggle', protect, authorize('vendor'), requireSubscriptionAccess, toggleJacuzzi);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllSalons);

module.exports = router;
