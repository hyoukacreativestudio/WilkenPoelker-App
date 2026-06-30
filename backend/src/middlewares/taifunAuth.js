const config = require('../config/env');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// Constant-time string compare so a timing side channel can't leak the key
// one byte at a time.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function taifunSyncAuth(req, res, next) {
  const expected = config.taifunSync?.apiKey;
  if (!expected) {
    return next(new AppError('Taifun sync is not configured on this server', 503, 'SYNC_DISABLED'));
  }

  const provided = req.header('x-api-key') || req.header('X-API-Key') || '';
  if (!safeEqual(provided, expected)) {
    logger.warn('Taifun sync auth failed', { ip: req.ip });
    return next(new AppError('Invalid sync API key', 401, 'INVALID_SYNC_KEY'));
  }
  next();
}

module.exports = { taifunSyncAuth };
