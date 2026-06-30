const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { taifunSyncAuth } = require('../middlewares/taifunAuth');
const taifunSyncController = require('../controllers/taifunSyncController');

// Generous cap: legit cron pushes at most every 5 minutes. 30/min lets a
// retry storm through but blocks a runaway loop.
const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many sync requests' } },
});

// POST /api/sync/taifun  — Bruno's cron job pushes the Taifun XML here.
// Body MUST be raw XML (Content-Type: application/xml).
router.post(
  '/taifun',
  syncLimiter,
  taifunSyncAuth,
  express.raw({ type: ['application/xml', 'text/xml', 'application/octet-stream'], limit: '50mb' }),
  taifunSyncController.pushXml
);

// GET /api/sync/taifun/status — same key, returns last-sync info.
// Lets you and Bruno check from a browser if the cron is actually arriving.
router.get('/taifun/status', taifunSyncAuth, taifunSyncController.status);

module.exports = router;
