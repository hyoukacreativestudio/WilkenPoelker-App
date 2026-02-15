const notificationService = require('../services/notificationService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { User, Post, Comment, Like, Notification, FCMToken, AuditLog } = require('../models');

// ──────────────────────────────────────────────
// User notification endpoints
// ──────────────────────────────────────────────

const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, category, unread } = req.query;

  const result = await notificationService.listNotifications(
    req.user.id,
    { page, limit, category, unread },
    { Notification }
  );

  res.json({
    success: true,
    data: result,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await notificationService.markAsRead(id, req.user.id, { Notification });

  res.json({
    success: true,
    data: { notification },
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id, { Notification });

  res.json({
    success: true,
    data: result,
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await notificationService.deleteNotification(id, req.user.id, { Notification });

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});

const deleteAllNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteAllNotifications(req.user.id, { Notification });

  res.json({
    success: true,
    data: result,
    message: 'All notifications deleted',
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id, { Notification });

  res.json({
    success: true,
    data: result,
  });
});

// ──────────────────────────────────────────────
// FCM Token management
// ──────────────────────────────────────────────

const registerFCMToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;

  const fcmToken = await notificationService.registerFCMToken(req.user.id, token, platform);

  res.status(201).json({
    success: true,
    data: { fcmToken },
  });
});

const removeFCMToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  await notificationService.removeFCMToken(token);

  res.json({
    success: true,
    message: 'FCM token removed',
  });
});

// ──────────────────────────────────────────────
// Admin: Broadcast
// ──────────────────────────────────────────────

const sendBroadcast = asyncHandler(async (req, res) => {
  const { title, message, category, targetRole } = req.body;

  const result = await notificationService.sendBroadcast(
    { title, message, category, targetRole },
    { Notification, User }
  );

  res.status(201).json({
    success: true,
    data: result,
    message: `Broadcast sent to ${result.recipientCount} users`,
  });
});

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  registerFCMToken,
  removeFCMToken,
  sendBroadcast,
};
