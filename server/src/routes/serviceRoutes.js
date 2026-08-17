const router = require('express').Router();
const { getServices, getServiceById, createService, updateService, deleteService, toggleServiceStatus } = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getServices);
router.get('/:id', getServiceById);
router.post('/', protect, authorize('vendor'), createService);
router.put('/:id', protect, authorize('vendor'), updateService);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteService);
router.patch('/:id/toggle-status', protect, authorize('vendor', 'admin'), toggleServiceStatus);

module.exports = router;
