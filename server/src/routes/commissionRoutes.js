const router = require('express').Router();
const { getCommissions, setCommission, getPlatformFee, getPublicPlatformFee, updatePlatformFee, calculateVendorCharges, deleteCommission } = require('../controllers/commissionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, authorize('admin'), getCommissions);
router.post('/', protect, authorize('admin'), setCommission);
router.delete('/:id', protect, authorize('admin'), deleteCommission);
router.get('/platform-fee/public', getPublicPlatformFee); // Public endpoint
router.get('/platform-fee', protect, authorize('admin'), getPlatformFee);
router.put('/platform-fee', protect, authorize('admin'), updatePlatformFee);
router.post('/calculate', protect, authorize('admin'), calculateVendorCharges);

module.exports = router;
