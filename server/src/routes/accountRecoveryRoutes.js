const router = require('express').Router();
const { requestRecovery } = require('../controllers/accountRecoveryController');

// Public route for requesting recovery
router.post('/request', requestRecovery);

module.exports = router;
