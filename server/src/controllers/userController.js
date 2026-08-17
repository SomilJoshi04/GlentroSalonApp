const User = require('../models/User');

// @desc    Get all users (Admin)
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const query = { role: 'user' };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await User.countDocuments(query);

    res.json({ success: true, data: { users, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc    Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

// @desc    Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, city, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone, city, avatar }, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) { next(error); }
};

// @desc    Update user location
const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, city, formattedAddress } = req.body;
    
    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, {
      location: { type: 'Point', coordinates: [lng, lat] },
      ...(city && { city }),
      ...(formattedAddress && { formattedAddress }),
    }, { new: true }).select('-password');
    res.json({ success: true, message: 'Location updated', data: user });
  } catch (error) { next(error); }
};

// @desc    Toggle user active status (Admin)
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
  } catch (error) { next(error); }
};

// @desc    Update FCM token
const updateFcmToken = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { fcmToken: req.body.fcmToken });
    res.json({ success: true, message: 'FCM token updated' });
  } catch (error) { next(error); }
};

module.exports = { getUsers, getUserById, updateProfile, updateLocation, toggleUserStatus, updateFcmToken };
