const router = require('express').Router();
const { registerUser, loginUser, registerVendor, loginVendor, loginAdmin, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { registerUserValidation, registerVendorValidation, loginValidation } = require('../utils/validators');

router.post('/register/user', registerUserValidation, validate, registerUser);
router.post('/login/user', loginValidation, validate, loginUser);
router.post('/register/vendor', registerVendorValidation, validate, registerVendor);
router.post('/login/vendor', loginValidation, validate, loginVendor);
router.post('/login/admin', loginValidation, validate, loginAdmin);
router.get('/profile', protect, getProfile);

module.exports = router;
