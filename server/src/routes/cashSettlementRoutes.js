const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const cashSettlementController = require('../controllers/cashSettlementController');

router.use(protect);
router.use(authorize('vendor'));

router.get('/status', cashSettlementController.getStatus);
router.post('/create', cashSettlementController.createSettlement);
router.post('/verify', cashSettlementController.verifySettlement);

module.exports = router;
