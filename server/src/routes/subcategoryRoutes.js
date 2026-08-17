const router = require('express').Router();
const { getSubcategories, getSubcategoryById, createSubcategory, updateSubcategory, deleteSubcategory, toggleSubcategoryStatus } = require('../controllers/subcategoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getSubcategories);
router.get('/:id', getSubcategoryById);
router.post('/', protect, authorize('admin'), createSubcategory);
router.put('/:id', protect, authorize('admin'), updateSubcategory);
router.delete('/:id', protect, authorize('admin'), deleteSubcategory);
router.patch('/:id/toggle-status', protect, authorize('admin'), toggleSubcategoryStatus);

module.exports = router;
