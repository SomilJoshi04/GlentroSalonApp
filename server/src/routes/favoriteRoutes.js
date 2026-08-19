const router = require('express').Router();
const { checkFavorite, toggleFavorite, getFavorites } = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Protect all favorite routes
router.use(protect);
router.use(authorize('user')); // Assuming only 'user' role can favorite salons

router.get('/', getFavorites);
router.get('/check/:salonId', checkFavorite);
router.post('/toggle/:salonId', toggleFavorite);

module.exports = router;
