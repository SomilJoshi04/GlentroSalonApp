const router = require('express').Router();
const { createOffer, getOffers, getVendorOffers, approveOffer, rejectOffer, updateOffer, deleteOffer, toggleOfferStatus } = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getOffers);
router.get('/vendor/my', protect, authorize('vendor'), getVendorOffers);
router.post('/', protect, authorize('vendor'), createOffer);
router.put('/:id', protect, authorize('vendor'), updateOffer);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteOffer);
router.patch('/:id/approve', protect, authorize('admin'), approveOffer);
router.patch('/:id/reject', protect, authorize('admin'), rejectOffer);
router.patch('/:id/toggle-status', protect, authorize('vendor'), toggleOfferStatus);

module.exports = router;
