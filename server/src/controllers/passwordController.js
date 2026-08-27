const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const OTP = require('../models/OTP');
const { sendEmail } = require('../utils/emailService');
const env = require('../config/env');

const generateOTP = () => {
  // Generate a random 6-digit number
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getAccountByEmail = async (email) => {
  const user = await User.findOne({ email });
  if (user) return { account: user, type: 'user' };
  
  const vendor = await Vendor.findOne({ email });
  if (vendor) return { account: vendor, type: 'vendor' };

  return null;
};

// @desc    Request forgot password (sends OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Always return generic response to prevent account enumeration
    const genericResponse = { 
      success: true, 
      message: 'If an account exists with this email, a verification code has been sent.' 
    };

    const accountData = await getAccountByEmail(email);
    if (!accountData) {
      return res.status(200).json(genericResponse);
    }

    const { account, type } = accountData;

    // Invalidate any existing OTPs for this email
    await OTP.deleteMany({ email });

    // Generate secure OTP
    // Better secure generation
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_OTP_EXPIRY_MINUTES * 60000);

    await OTP.create({
      email,
      accountType: type,
      otpHash,
      expiresAt
    });

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2D0B5A;">Password Reset Request</h2>
        <p>You have requested to reset your password for your GlentroSalon account.</p>
        <p>Your verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #4A1578; background: #f4f4f4; padding: 10px; text-align: center; border-radius: 8px;">${otp}</h1>
        <p>This code will expire in ${env.PASSWORD_RESET_OTP_EXPIRY_MINUTES} minutes.</p>
        <br/>
        <p style="font-size: 12px; color: #666;">If you did not request this password reset, you can safely ignore this email. Your password will not change.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Password Reset Verification Code - GlentroSalon',
      html: emailHtml
    });

    res.status(200).json(genericResponse);

  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (otpRecord.usedAt || otpRecord.verifiedAt) {
      return res.status(400).json({ success: false, message: 'This OTP has already been used' });
    }

    if (otpRecord.attempts >= env.PASSWORD_RESET_MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'Maximum attempts reached. Please request a new code.' });
    }

    const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otpHash);

    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP is correct
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // Generate short-lived reset token (not an access token)
    const resetToken = jwt.sign(
      { email: otpRecord.email, type: otpRecord.accountType, purpose: 'password_reset' },
      env.JWT_SECRET,
      { expiresIn: `${env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES}m` }
    );

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: { resetToken }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid token purpose' });
    }

    const otpRecord = await OTP.findOne({ email: decoded.email, verifiedAt: { $ne: null } });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No verified reset session found. Please try again.' });
    }

    if (otpRecord.usedAt) {
      return res.status(400).json({ success: false, message: 'Password has already been reset using this session' });
    }

    const { account } = await getAccountByEmail(decoded.email);
    if (!account) {
      return res.status(400).json({ success: false, message: 'Account not found' });
    }

    // Update password (pre-save hook will hash it)
    account.password = newPassword;
    
    // Invalidate sessions/refresh tokens if applicable by updating something like passwordChangedAt (if implemented)
    // We don't have passwordChangedAt, but saving will update the user record.
    await account.save();

    // Mark OTP as used
    otpRecord.usedAt = new Date();
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  forgotPassword,
  verifyOTP,
  resetPassword
};
