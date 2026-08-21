const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

// @desc    Request account recovery
// @route   POST /api/account-recovery/request
// @access  Public
const requestRecovery = async (req, res, next) => {
  try {
    const { email, reason } = req.body;

    if (!email || !reason) {
      return res.status(400).json({ success: false, message: 'Email and reason are required' });
    }

    // 1. Verify user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't expose that the user doesn't exist for security reasons, just pretend it's processed or give generic error
      // But based on typical UX, we can say "Invalid email or account is not deleted". Let's do that.
      return res.status(404).json({ success: false, message: 'User not found or account is not deleted' });
    }

    // 2. Verify accountStatus === "deleted"
    if (user.accountStatus !== 'deleted') {
      if (user.accountStatus === 'recovery_requested') {
        return res.status(400).json({ success: false, message: 'A recovery request is already pending for this account.' });
      }
      return res.status(400).json({ success: false, message: 'Account is already active. You can log in.' });
    }

    // 3. Check for an existing pending request
    const existingRequest = await AccountRecoveryRequest.findOne({ userId: user._id, status: 'pending' });
    if (existingRequest) {
      // In case status is 'deleted' but request is pending (shouldn't happen, but just in case)
      user.accountStatus = 'recovery_requested';
      await user.save();
      return res.status(400).json({ success: false, message: 'A recovery request is already pending for this account.' });
    }

    // 4. Create AccountRecoveryRequest
    await AccountRecoveryRequest.create({
      userId: user._id,
      email: user.email,
      reason
    });

    // 5. Update User
    user.accountStatus = 'recovery_requested';
    user.recoverAccount = {
      requestedAt: new Date(),
      reason,
      recoveredAt: null,
      recoveredBy: null
    };
    await user.save();

    // 6. Create Admin notification
    const notification = await Notification.create({
      recipient: null,
      recipientModel: 'User',
      recipientRole: 'admin',
      type: 'RECOVERY_REQUEST',
      title: 'New Account Recovery Request',
      message: `New account recovery request from ${user.name}.`,
      data: { userId: user._id }
    });

    // 7. Emit Socket.IO notification if applicable
    const io = getIO();
    if (io) {
      io.emit('admin:notification', notification);
    }

    res.status(201).json({
      success: true,
      message: 'Your account recovery request has been submitted for admin review.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestRecovery
};
