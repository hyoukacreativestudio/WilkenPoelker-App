const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');
const { authorize, isAdmin, isSuperAdmin, canPost, ROLES } = require('../middlewares/roles');
const { validate, validators, body, query, param } = require('../middlewares/validate');

// ──────────────────────────────────────────────
// User notification routes
// ──────────────────────────────────────────────

// GET /api/notifications
router.get(
  '/',
  authenticate,
  validate([
    ...validators.pagination,
    query('category')
      .optional()
      .isIn(['repair', 'appointment', 'chat', 'feed', 'offer', 'system'])
      .withMessage('Invalid category filter'),
    query('unread').optional().isBoolean().withMessage('Unread must be a boolean'),
  ]),
  notificationController.listNotifications
);

// GET /api/notifications/unread-count
router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

// PUT /api/notifications/read-all
router.put(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

// DELETE /api/notifications/all
router.delete(
  '/all',
  authenticate,
  validate([
    query('confirm')
      .equals('true')
      .withMessage('Confirmation required: pass ?confirm=true'),
  ]),
  notificationController.deleteAllNotifications
);

// PUT /api/notifications/:id/read
router.put(
  '/:id/read',
  authenticate,
  validate([validators.uuid('id')]),
  notificationController.markAsRead
);

// DELETE /api/notifications/:id
router.delete(
  '/:id',
  authenticate,
  validate([validators.uuid('id')]),
  notificationController.deleteNotification
);

// ──────────────────────────────────────────────
// FCM Token management
// ──────────────────────────────────────────────

// POST /api/notifications/fcm-token
router.post(
  '/fcm-token',
  authenticate,
  validate([
    body('token').notEmpty().withMessage('FCM token is required'),
    body('platform')
      .isIn(['ios', 'android', 'web'])
      .withMessage('Platform must be ios, android, or web'),
  ]),
  notificationController.registerFCMToken
);

// DELETE /api/notifications/fcm-token
router.delete(
  '/fcm-token',
  authenticate,
  validate([
    body('token').notEmpty().withMessage('FCM token is required'),
  ]),
  notificationController.removeFCMToken
);

// ──────────────────────────────────────────────
// Admin: Broadcast
// ──────────────────────────────────────────────

// POST /api/notifications/send
router.post(
  '/send',
  authenticate,
  isAdmin,
  validate([
    body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
    body('message').notEmpty().withMessage('Message is required').isLength({ max: 2000 }).withMessage('Message must be at most 2000 characters'),
    body('category')
      .optional()
      .isIn(['repair', 'appointment', 'chat', 'feed', 'offer', 'system'])
      .withMessage('Invalid category'),
    body('targetRole')
      .optional()
      .isIn(Object.values(ROLES))
      .withMessage('Invalid target role'),
  ]),
  notificationController.sendBroadcast
);

module.exports = router;
