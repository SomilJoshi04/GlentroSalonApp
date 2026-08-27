const router = require('express').Router();
const { requestRecovery } = require('../controllers/accountRecoveryController');
const { passwordResetLimiter } = require('../middleware/rateLimiter');

// Public route for requesting recovery
router.post('/request', passwordResetLimiter, requestRecovery);

module.exports = router;
