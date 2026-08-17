const geocodingService = require('../services/geocodingService');

// @desc    Search for locations
// @route   GET /api/location/search
// @access  Public
const searchLocation = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters long' });
    }

    const results = await geocodingService.searchLocation(q);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// @desc    Reverse geocode coordinates
// @route   GET /api/location/reverse
// @access  Public
const reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90 || isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates provided' });
    }

    const result = await geocodingService.reverseGeocode(latitude, longitude);
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchLocation,
  reverseGeocode,
};
