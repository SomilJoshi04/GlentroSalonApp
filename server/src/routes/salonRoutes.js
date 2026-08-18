const router = require('express').Router();
const { createSalon, getSalons, getNearbySalons, getSalonsByCity, getSalonById, updateSalon, getVendorSalons, getAllSalons, getCities, getZones } = require('../controllers/salonController');
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

// Vendor routes
router.post('/', protect, authorize('vendor'), upload.single('image'), createSalon);
router.put('/:id', protect, authorize('vendor', 'admin'), upload.single('image'), updateSalon);
router.get('/vendor/my-salons', protect, authorize('vendor'), getVendorSalons);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllSalons);

module.exports = router;
