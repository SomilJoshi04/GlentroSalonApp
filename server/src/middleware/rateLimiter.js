const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Helper to validate and parse env variables
const getEnvConfig = (windowKey, maxKey, defaultWindowMs, defaultMax) => {
  const windowMs = parseInt(process.env[windowKey], 10);
  const max = parseInt(process.env[maxKey], 10);
  
  return {
    windowMs: !isNaN(windowMs) && windowMs > 0 ? windowMs : defaultWindowMs,
    max: !isNaN(max) && max > 0 ? max : defaultMax
  };
};

// Generic handler for 429 responses
const handler = (req, res, next, options) => {
  res.status(options.statusCode).json({
    success: false,
    message: 'Too many requests. Please try again later.'
  });
};

// Key generator that prefers authenticated user ID over IP to prevent one user from 
// abusing the system across multiple IPs, while still falling back to IP for guests.
const authAwareKeyGenerator = (req, res) => {
  if (req.user && req.user._id) {
    return req.user._id.toString();
  }
  return ipKeyGenerator(req, res);
};

// 1. GLOBAL API LIMITER
// Default: 300 requests / 15 minutes
const globalConfig = getEnvConfig('RATE_LIMIT_GLOBAL_WINDOW_MS', 'RATE_LIMIT_GLOBAL_MAX', 900000, 300);
const globalLimiter = rateLimit({
  windowMs: globalConfig.windowMs,
  max: globalConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. AUTHENTICATION LIMITER (Login, Register)
// Default: 10 requests / 15 minutes
const authConfig = getEnvConfig('RATE_LIMIT_AUTH_WINDOW_MS', 'RATE_LIMIT_AUTH_MAX', 900000, 10);
const authLimiter = rateLimit({
  windowMs: authConfig.windowMs,
  max: authConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authAwareKeyGenerator
});

// 3. OTP LIMITER
// Default: 5 requests / 15 minutes
const otpConfig = getEnvConfig('RATE_LIMIT_OTP_WINDOW_MS', 'RATE_LIMIT_OTP_MAX', 900000, 5);
const otpLimiter = rateLimit({
  windowMs: otpConfig.windowMs,
  max: otpConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authAwareKeyGenerator
});

// 4. PASSWORD RESET LIMITER
// Default: 5 requests / 15 minutes
const passwordResetConfig = getEnvConfig('RATE_LIMIT_PASSWORD_RESET_WINDOW_MS', 'RATE_LIMIT_PASSWORD_RESET_MAX', 900000, 5);
const passwordResetLimiter = rateLimit({
  windowMs: passwordResetConfig.windowMs,
  max: passwordResetConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authAwareKeyGenerator
});

// 5. BOOKING CREATION LIMITER
// Default: 10 requests / 15 minutes
const bookingConfig = getEnvConfig('RATE_LIMIT_BOOKING_WINDOW_MS', 'RATE_LIMIT_BOOKING_MAX', 900000, 10);
const bookingLimiter = rateLimit({
  windowMs: bookingConfig.windowMs,
  max: bookingConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authAwareKeyGenerator
});

// 6. PAYMENT LIMITER
// Default: 20 requests / 15 minutes
const paymentConfig = getEnvConfig('RATE_LIMIT_PAYMENT_WINDOW_MS', 'RATE_LIMIT_PAYMENT_MAX', 900000, 20);
const paymentLimiter = rateLimit({
  windowMs: paymentConfig.windowMs,
  max: paymentConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authAwareKeyGenerator
});

// 7. CALL LIMITER
// Default: 5 requests / 15 minutes
const callConfig = getEnvConfig('RATE_LIMIT_CALL_WINDOW_MS', 'RATE_LIMIT_CALL_MAX', 900000, 5);
const callLimiter = rateLimit({
  windowMs: callConfig.windowMs,
  max: callConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authAwareKeyGenerator
});

// 8. ADMIN LIMITER
// Default: 300 requests / 15 minutes
const adminConfig = getEnvConfig('RATE_LIMIT_ADMIN_WINDOW_MS', 'RATE_LIMIT_ADMIN_MAX', 900000, 300);
const adminLimiter = rateLimit({
  windowMs: adminConfig.windowMs,
  max: adminConfig.max,
  handler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authAwareKeyGenerator
});

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  bookingLimiter,
  paymentLimiter,
  callLimiter,
  adminLimiter
};
