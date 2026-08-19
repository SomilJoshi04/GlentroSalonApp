const User = require('../models/User');
const Salon = require('../models/Salon');

// @desc    Check if salon is favorited by current user
// @route   GET /api/favorites/check/:salonId
// @access  Private
exports.checkFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isFavorite = user.favorites.includes(req.params.salonId);

    res.status(200).json({
      success: true,
      data: { isFavorite }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Toggle salon favorite status for current user
// @route   POST /api/favorites/toggle/:salonId
// @access  Private
exports.toggleFavorite = async (req, res) => {
  try {
    const salonId = req.params.salonId;

    // Verify salon exists
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const index = user.favorites.indexOf(salonId);
    let isFavorite = false;
    let message = '';

    if (index === -1) {
      // Add to favorites
      user.favorites.push(salonId);
      isFavorite = true;
      message = 'Salon added to favorites';
    } else {
      // Remove from favorites
      user.favorites.splice(index, 1);
      isFavorite = false;
      message = 'Salon removed from favorites';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message,
      data: { isFavorite }
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all favorite salons for current user
// @route   GET /api/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'favorites',
      select: 'name address city images ratings gender openingTime closingTime isActive',
      match: { isActive: true } // Optionally only return active salons
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user.favorites
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
