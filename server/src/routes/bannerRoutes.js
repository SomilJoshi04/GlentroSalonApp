const router = require('express').Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const {
  getActiveBanners,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
} = require('../controllers/bannerController');

// Public route for User App
router.get('/public', getActiveBanners);

// Admin routes
router.use(protect);
router.use(authorize('admin'));

router.get('/', getBanners);
router.post('/', upload.single('image'), createBanner);
router.put('/:id', upload.single('image'), updateBanner);
router.delete('/:id', deleteBanner);
router.patch('/:id/toggle-status', toggleBannerStatus);

module.exports = router;
