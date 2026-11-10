const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// Count logged-in requests per USER, not per IP: all PCs and phones in the shop
// share one internet address, so a per-IP limit locked out the whole company
// ("Too many requests") while each person was well below it. The token is
// verified, so nobody can spread requests over made-up user ids.
// Requests without a valid token are still counted per IP.
function userOrIpKey(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(h.slice(7), config.jwt.secret, { ignoreExpiration: true });
      if (decoded && decoded.id) return `u:${decoded.id}`;
    } catch { /* fall back to the IP */ }
  }
  return `ip:${ipKeyGenerator(req.ip || '')}`;
}

// Token refresh: per user of the refresh token (verified), else per IP.
function refreshKey(req) {
  const t = req.body && req.body.refreshToken;
  if (t) {
    try {
      const decoded = jwt.verify(String(t), config.jwt.refreshSecret, { ignoreExpiration: true });
      if (decoded && decoded.id) return `r:${decoded.id}`;
    } catch { /* fall back to the IP */ }
  }
  return `ip:${ipKeyGenerator(req.ip || '')}`;
}

const createLimiter = (windowMs, max, message, keyGenerator) =>
  rateLimit({
    windowMs,
    max,
    ...(keyGenerator ? { keyGenerator } : {}),
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

// Registration: 50 attempts per hour (customers signing up in the shop share its WLAN IP)
const registerLimiter = createLimiter(
  60 * 60 * 1000,
  50,
  'Too many registration attempts. Please try again later.'
);

// Password reset: 10 attempts per hour per IP (customers in the shop share its WLAN IP)
const passwordResetLimiter = createLimiter(
  60 * 60 * 1000,
  10,
  'Too many password reset attempts. Please try again later.'
);

// General API: 300 requests per minute per user (per IP when not logged in).
// A department account open on several PCs shares one budget.
const apiLimiter = createLimiter(
  60 * 1000,
  300,
  'Too many requests. Please slow down.',
  userOrIpKey
);

// AI Chat: 50 requests per hour
const aiLimiter = createLimiter(
  60 * 60 * 1000,
  50,
  'AI chat rate limit reached. Please try again later.',
  userOrIpKey
);

// File upload: 20 uploads per hour
const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Too many file uploads. Please try again later.',
  userOrIpKey
);

// Refresh token: 30 per 15 min (legit clients refresh ~every 15 min)
const refreshLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  'Too many token refresh attempts. Please log in again.',
  refreshKey
);

// Chat message send: 60 per minute per user
const chatLimiter = createLimiter(
  60 * 1000,
  60,
  'Too many chat messages. Please slow down.',
  userOrIpKey
);

// FCM token register: 10 per hour (prevents enumeration / hijack spam)
const fcmRegisterLimiter = createLimiter(
  60 * 60 * 1000,
  10,
  'Too many device-registration attempts. Please try again later.'
);

// Product inquiries: 20 per hour per IP (customers in the shop share its WLAN IP)
const inquiryLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Zu viele Anfragen. Bitte versuchen Sie es später erneut oder rufen Sie uns an: 04952 5304.'
);

// App feedback: 10 per hour per IP
const feedbackLimiter = createLimiter(
  60 * 60 * 1000,
  10,
  'Zu viele Nachrichten. Bitte versuchen Sie es später erneut.'
);

module.exports = {
  inquiryLimiter,
  feedbackLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  aiLimiter,
  uploadLimiter,
  refreshLimiter,
  chatLimiter,
  fcmRegisterLimiter,
};
