const { Op } = require('sequelize');
const { NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Create a notification in the DB and send a push notification.
 */
async function createNotification(userId, { title, message, type, category, deepLink, relatedId, relatedType }, { Notification }) {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
    category,
    deepLink: deepLink || null,
    relatedId: relatedId || null,
    relatedType: relatedType || null,
    read: false,
  });

  // Push is sent automatically by the Notification model's afterCreate hook
  // (so every notification pushes with sound, no matter where it's created).
  return notification;
}

/**
 * List notifications for a user with pagination and optional filters.
 */
async function listNotifications(userId, { page = 1, limit = 20, category, unread }, { Notification }) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where = { userId };

  if (category) {
    where.category = category;
  }

  if (unread === 'true' || unread === true) {
    where.read = false;
  }

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    notifications: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
    },
  };
}

/**
 * Mark a single notification as read.
 */
async function markAsRead(notificationId, userId, { Notification }) {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  await notification.update({ read: true });

  return notification;
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllAsRead(userId, { Notification }) {
  const [updatedCount] = await Notification.update(
    { read: true },
    { where: { userId, read: false } }
  );

  logger.info('All notifications marked as read', { userId, updatedCount });

  return { updatedCount };
}

/**
 * Delete a single notification.
 */
async function deleteNotification(notificationId, userId, { Notification }) {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  await notification.destroy();

  logger.info('Notification deleted', { notificationId, userId });
}

/**
 * Delete all notifications for a user.
 */
async function deleteAllNotifications(userId, { Notification }) {
  const deletedCount = await Notification.destroy({
    where: { userId },
  });

  logger.info('All notifications deleted', { userId, deletedCount });

  return { deletedCount };
}

/**
 * Register a device FCM token.
 */
async function registerFCMToken(userId, token, platform) {
  return pushService.registerToken(userId, token, platform);
}

/**
 * Remove a device FCM token (e.g. on logout). Requires the caller's userId to prevent hijack.
 */
async function removeFCMToken(token, userId) {
  return pushService.removeToken(token, userId);
}

/**
 * Admin: send a broadcast notification to users.
 * If targetRole is provided, only notify users with that role.
 */
async function sendBroadcast({ title, message, category, targetRole }, { Notification, User }) {
  const where = { isActive: true };
  if (targetRole) {
    where.role = targetRole;
  }

  const users = await User.findAll({
    where,
    attributes: ['id'],
  });

  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) {
    return { recipientCount: 0 };
  }

  // Create notifications in bulk
  const notificationRecords = userIds.map((userId) => ({
    userId,
    title,
    message,
    type: 'system',
    category: category || 'system',
    read: false,
  }));

  await Notification.bulkCreate(notificationRecords);
  // Push goes out automatically via the Notification afterBulkCreate hook.

  logger.info('Broadcast notification sent', { recipientCount: userIds.length, targetRole });

  return { recipientCount: userIds.length };
}

/**
 * Get the count of unread notifications for a user.
 */
async function getUnreadCount(userId, { Notification }) {
  const count = await Notification.count({
    where: { userId, read: false },
  });

  return { unreadCount: count };
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  registerFCMToken,
  removeFCMToken,
  sendBroadcast,
  getUnreadCount,
};
