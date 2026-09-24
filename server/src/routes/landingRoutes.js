const express = require('express');
const router = express.Router();
const {
  getPublicLandingPage,
  getPreviewLandingPage,
  getCmsConfig,
  updateCmsConfig,
  uploadCmsMedia,
  publishCmsConfig,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  createVideo,
  updateVideo,
  deleteVideo,
  toggleVideoStatus,
  createFeature,
  updateFeature,
  deleteFeature,
  createStep,
  updateStep,
  deleteStep,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  saveStats,
} = require('../controllers/landingCmsController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ─── PUBLIC ENDPOINTS ────────────────────────────────────────────────────────
router.get('/public', getPublicLandingPage);

// ─── ADMIN PREVIEW ENDPOINT ──────────────────────────────────────────────────
router.get('/preview', protect, authorize('admin'), getPreviewLandingPage);

// ─── ADMIN CMS CONFIG & MEDIA ────────────────────────────────────────────────
router.get('/admin/config', protect, authorize('admin'), getCmsConfig);
router.put('/admin/config', protect, authorize('admin'), updateCmsConfig);
router.post('/admin/media-upload', protect, authorize('admin'), upload.single('media'), uploadCmsMedia);
router.patch('/admin/publish', protect, authorize('admin'), publishCmsConfig);

// ─── BANNERS ─────────────────────────────────────────────────────────────────
router.post('/admin/banners', protect, authorize('admin'), upload.single('image'), createBanner);
router.put('/admin/banners/:id', protect, authorize('admin'), upload.single('image'), updateBanner);
router.delete('/admin/banners/:id', protect, authorize('admin'), deleteBanner);
router.patch('/admin/banners/:id/status', protect, authorize('admin'), toggleBannerStatus);
router.patch('/admin/banners/reorder', protect, authorize('admin'), reorderBanners);

// ─── GUIDE VIDEOS ────────────────────────────────────────────────────────────
router.post('/admin/videos', protect, authorize('admin'), upload.single('thumbnail'), createVideo);
router.put('/admin/videos/:id', protect, authorize('admin'), upload.single('thumbnail'), updateVideo);
router.delete('/admin/videos/:id', protect, authorize('admin'), deleteVideo);
router.patch('/admin/videos/:id/status', protect, authorize('admin'), toggleVideoStatus);

// ─── FEATURES ────────────────────────────────────────────────────────────────
router.post('/admin/features', protect, authorize('admin'), createFeature);
router.put('/admin/features/:id', protect, authorize('admin'), updateFeature);
router.delete('/admin/features/:id', protect, authorize('admin'), deleteFeature);

// ─── HOW IT WORKS (STEPS) ────────────────────────────────────────────────────
router.post('/admin/steps', protect, authorize('admin'), createStep);
router.put('/admin/steps/:id', protect, authorize('admin'), updateStep);
router.delete('/admin/steps/:id', protect, authorize('admin'), deleteStep);

// ─── TESTIMONIALS ────────────────────────────────────────────────────────────
router.post('/admin/testimonials', protect, authorize('admin'), upload.single('avatar'), createTestimonial);
router.put('/admin/testimonials/:id', protect, authorize('admin'), upload.single('avatar'), updateTestimonial);
router.delete('/admin/testimonials/:id', protect, authorize('admin'), deleteTestimonial);

// ─── STATS ───────────────────────────────────────────────────────────────────
router.put('/admin/stats', protect, authorize('admin'), saveStats);

module.exports = router;
