const router = require('express').Router();
const { getCallToken, checkCallAvailability, getCallHistory } = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

// Generate Agora RTC token for a booking call (full security checks)
router.get('/token', protect, getCallToken);

// Lightweight availability check (for showing/hiding call button)
router.get('/availability', protect, checkCallAvailability);

// Fetch call history for user or vendor
router.get('/history', protect, getCallHistory);

module.exports = router;
