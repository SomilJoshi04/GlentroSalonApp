const User = require('../models/User');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

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
    const { name, phone, city, email } = req.body;
    let newImage = null;

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let oldImage = currentUser.avatar;

    // We only process if there is a file. If req.body.avatar is empty, it might mean user removed it (if we support that feature).
    if (req.file) {
      newImage = await processAndStoreImage(req.file.buffer, 'user');
    }

    const updateData = { name, phone, city };
    if (email) updateData.email = email;
    if (newImage) {
      updateData.avatar = newImage;
    } else if (req.body.avatar === '') {
      // If frontend explicitly sends empty string, they want to remove the photo
      updateData.avatar = '';
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true, runValidators: true }).select('-password');
    
    // Cleanup old image if it was replaced or removed, AND if it's not a Base64 string (handled during migration)
    if ((newImage || req.body.avatar === '') && oldImage && !oldImage.startsWith('data:')) {
      deleteImageSafe(oldImage);
    }

    res.json({ success: true, message: 'Profile updated', data: updatedUser });
  } catch (error) {
    if (req.file && error) {
       // newImage would be deleted here if we had access to it, but processAndStoreImage could have failed.
       // It's safe to just let it pass if DB update failed, as newImage might not have been created yet or we can't reliably delete it without the filename.
    }
    next(error);
  }
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

// @desc    Delete user account (Soft Delete)
// @route   DELETE /api/users/account
const deleteAccount = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.accountStatus === 'deleted') {
      return res.status(400).json({ success: false, message: 'Account is already deleted' });
    }

    user.accountStatus = 'deleted';
    user.deleteAccount = {
      deletedAt: new Date(),
      deletedBy: 'user',
      reason: reason || null
    };

    // Note: We don't change recoverAccount here because they might have previously 
    // recovered and deleted again, or they might request recovery later. 
    // Wait, if they had a previous recovery request that was rejected, should we clear it? 
    // Better to clear `recoverAccount` to reset state.
    user.recoverAccount = {
      requestedAt: null,
      reason: null,
      recoveredAt: null,
      recoveredBy: null
    };

    await user.save();

    // In a real production app, we would also clear active sessions, tokens, etc.
    // For JWT based flow without token blacklisting, the frontend clearing token is sufficient.
    // If we have FCM tokens, we might want to clear it so we don't send notifications to deleted users.
    await User.findByIdAndUpdate(req.user.id, { fcmToken: '' });

    res.json({
      success: true,
      message: 'Your account has been deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, updateProfile, updateLocation, toggleUserStatus, updateFcmToken, deleteAccount };
