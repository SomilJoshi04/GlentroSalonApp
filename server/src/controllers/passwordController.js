const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const OTP = require('../models/OTP');
const { sendEmail } = require('../utils/emailService');
const env = require('../config/env');
const { isRedisReady, getRedisClient } = require('../config/redis');

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

// ============================================================
// Redis OTP helpers — used only when Redis is ready.
// All data is stored with TTL. Attempts tracked in a separate key.
// ============================================================

const REDIS_OTP_PREFIX       = 'otp:password-reset:';
const REDIS_VERIFIED_PREFIX  = 'otp:verified:';
const REDIS_ATTEMPTS_PREFIX  = 'otp:attempts:';

const redisOtpKey      = (email) => `${REDIS_OTP_PREFIX}${email.toLowerCase()}`;
const redisVerifiedKey = (email) => `${REDIS_VERIFIED_PREFIX}${email.toLowerCase()}`;
const redisAttemptsKey = (email) => `${REDIS_ATTEMPTS_PREFIX}${email.toLowerCase()}`;

/**
 * Store OTP data in Redis with TTL.
 */
const storeOTPInRedis = async (email, accountType, otpHash) => {
  const redis = getRedisClient();
  const ttl = env.PASSWORD_RESET_OTP_EXPIRY_MINUTES * 60;
  const payload = JSON.stringify({ otpHash, accountType });
  await redis.set(redisOtpKey(email), payload, 'EX', ttl);
  // Reset attempt counter
  await redis.del(redisAttemptsKey(email));
};

/**
 * Get OTP data from Redis. Returns null if not found / expired.
 */
const getOTPFromRedis = async (email) => {
  const redis = getRedisClient();
  const raw = await redis.get(redisOtpKey(email));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

/**
 * Increment attempt counter in Redis. Returns the new count.
 */
const incrementRedisAttempts = async (email) => {
  const redis = getRedisClient();
  const key = redisAttemptsKey(email);
  const count = await redis.incr(key);
  // Give the counter the same TTL as the OTP itself
  await redis.expire(key, env.PASSWORD_RESET_OTP_EXPIRY_MINUTES * 60);
  return count;
};

/**
 * Delete OTP from Redis after successful verification.
 */
const deleteOTPFromRedis = async (email) => {
  const redis = getRedisClient();
  await redis.del(redisOtpKey(email));
  await redis.del(redisAttemptsKey(email));
};

/**
 * Store verified state in Redis (short-lived — 15 minutes max).
 */
const setVerifiedInRedis = async (email, accountType) => {
  const redis = getRedisClient();
  const payload = JSON.stringify({ accountType });
  await redis.set(redisVerifiedKey(email), payload, 'EX', 900); // 15 minutes
};

/**
 * Check verified state in Redis.
 */
const getVerifiedFromRedis = async (email) => {
  const redis = getRedisClient();
  const raw = await redis.get(redisVerifiedKey(email));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

/**
 * Delete verified state from Redis after password reset.
 */
const deleteVerifiedFromRedis = async (email) => {
  const redis = getRedisClient();
  await redis.del(redisVerifiedKey(email));
};

// ============================================================
// Controller functions
// ============================================================

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

    // Generate secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    if (isRedisReady()) {
      // ── Redis path: store OTP in Redis with TTL ──
      await storeOTPInRedis(email, type, otpHash);
    } else {
      // ── Fallback path: MongoDB OTP model ──
      await OTP.deleteMany({ email });
      const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_OTP_EXPIRY_MINUTES * 60000);
      await OTP.create({ email, accountType: type, otpHash, expiresAt });
    }

    // Send email (same regardless of storage backend)
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

    let otpHash;
    let accountType;
    let useRedis = false;

    if (isRedisReady()) {
      // ── Redis path ──
      const redisData = await getOTPFromRedis(email);
      if (!redisData) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      otpHash = redisData.otpHash;
      accountType = redisData.accountType;
      useRedis = true;

      // Check attempts
      const attemptsKey = redisAttemptsKey(email);
      const currentAttempts = parseInt(await getRedisClient().get(attemptsKey) || '0', 10);
      if (currentAttempts >= env.PASSWORD_RESET_MAX_OTP_ATTEMPTS) {
        await deleteOTPFromRedis(email);
        return res.status(400).json({ success: false, message: 'Maximum attempts reached. Please request a new code.' });
      }
    } else {
      // ── Fallback: MongoDB ──
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
      otpHash = otpRecord.otpHash;
      accountType = otpRecord.accountType;
    }

    const isMatch = await bcrypt.compare(otp.toString(), otpHash);

    if (!isMatch) {
      if (useRedis) {
        await incrementRedisAttempts(email);
      } else {
        const otpRecord = await OTP.findOne({ email });
        if (otpRecord) { otpRecord.attempts += 1; await otpRecord.save(); }
      }
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP is correct — mark as verified
    if (useRedis) {
      await deleteOTPFromRedis(email);
      await setVerifiedInRedis(email, accountType);
    } else {
      const otpRecord = await OTP.findOne({ email });
      if (otpRecord) { otpRecord.verifiedAt = new Date(); await otpRecord.save(); }
    }

    // Generate short-lived reset token (not an access token)
    const resetToken = jwt.sign(
      { email, type: accountType, purpose: 'password_reset' },
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

    // Verify session is still valid
    if (isRedisReady()) {
      // ── Redis path ──
      const verified = await getVerifiedFromRedis(decoded.email);
      if (!verified) {
        return res.status(400).json({ success: false, message: 'No verified reset session found. Please try again.' });
      }
    } else {
      // ── Fallback: MongoDB ──
      const otpRecord = await OTP.findOne({ email: decoded.email, verifiedAt: { $ne: null } });
      if (!otpRecord) {
        return res.status(400).json({ success: false, message: 'No verified reset session found. Please try again.' });
      }
      if (otpRecord.usedAt) {
        return res.status(400).json({ success: false, message: 'Password has already been reset using this session' });
      }
    }

    const { account } = await getAccountByEmail(decoded.email);
    if (!account) {
      return res.status(400).json({ success: false, message: 'Account not found' });
    }

    // Update password (pre-save hook will hash it) — MongoDB remains source of truth
    account.password = newPassword;
    await account.save();

    // Clean up session state
    if (isRedisReady()) {
      await deleteVerifiedFromRedis(decoded.email);
    } else {
      const otpRecord = await OTP.findOne({ email: decoded.email, verifiedAt: { $ne: null } });
      if (otpRecord) { otpRecord.usedAt = new Date(); await otpRecord.save(); }
    }

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
