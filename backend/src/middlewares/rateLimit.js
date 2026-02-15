const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests. Please try again later.',
      },
    },
  });

// Login: 30 attempts per 15 minutes (generous for dev/testing)
const loginLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  'Too many login attempts. Please try again in 15 minutes.'
);

// Registration: 3 attempts per hour
const registerLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  'Too many registration attempts. Please try again later.'
);

// Password reset: 3 attempts per hour
const passwordResetLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  'Too many password reset attempts. Please try again later.'
);

// General API: 200 requests per minute per IP (scaled for 10k users)
const apiLimiter = createLimiter(
  60 * 1000,
  200,
  'Too many requests. Please slow down.'
);

// AI Chat: 50 requests per hour
const aiLimiter = createLimiter(
  60 * 60 * 1000,
  50,
  'AI chat rate limit reached. Please try again later.'
);

// File upload: 20 uploads per hour
const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Too many file uploads. Please try again later.'
);

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  aiLimiter,
  uploadLimiter,
};
