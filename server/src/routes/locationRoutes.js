const express = require('express');
const router = express.Router();
const { searchLocation, reverseGeocode } = require('../controllers/locationController');

// Location Search
router.get('/search', searchLocation);

// Reverse Geocoding
router.get('/reverse', reverseGeocode);

module.exports = router;
