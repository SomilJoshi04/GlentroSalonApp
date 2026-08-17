const router = require('express').Router();
const { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, toggleCategoryStatus } = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', protect, authorize('admin'), upload.single('image'), createCategory);
router.put('/:id', protect, authorize('admin'), upload.single('image'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);
router.patch('/:id/toggle-status', protect, authorize('admin'), toggleCategoryStatus);

module.exports = router;
