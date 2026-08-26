const router = require('express').Router();
const { getResources, createResource, updateResource, deleteResource } = require('../controllers/resourceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const upload = require('../middleware/uploadMiddleware');

router.get('/salon/:salonId/resources', protect, authorize('vendor'), getResources);
router.post('/salon/:salonId/resources', protect, authorize('vendor'), upload.single('image'), createResource);
router.put('/resources/:id', protect, authorize('vendor'), upload.single('image'), updateResource);
router.delete('/resources/:id', protect, authorize('vendor'), deleteResource);

module.exports = router;
