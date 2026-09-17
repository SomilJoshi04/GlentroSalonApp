const router = require('express').Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const {
  getActiveLoginSlides,
  getLoginSlides,
  createLoginSlide,
  updateLoginSlide,
  deleteLoginSlide,
  toggleLoginSlideStatus,
  reorderLoginSlides,
} = require('../controllers/loginSlideController');

// ─── Public (no auth required) ────────────────────────────────────────────────
router.get('/public', getActiveLoginSlides);

// ─── Admin only (protect + authorize below) ───────────────────────────────────
router.use(protect);
router.use(authorize('admin'));

// IMPORTANT: /reorder must be defined BEFORE /:id routes to avoid being
// captured as an id param
router.patch('/reorder', reorderLoginSlides);

router.get('/', getLoginSlides);
router.post('/', upload.single('image'), createLoginSlide);
router.put('/:id', upload.single('image'), updateLoginSlide);
router.delete('/:id', deleteLoginSlide);
router.patch('/:id/status', toggleLoginSlideStatus);

module.exports = router;
