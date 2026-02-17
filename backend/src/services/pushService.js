const axios = require('axios');
const { FCMToken } = require('../models');
const logger = require('../utils/logger');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a specific user (all their registered devices).
 */
async function sendToUser(userId, notification) {
  const tokens = await FCMToken.findAll({
    where: { userId, isActive: true },
    attributes: ['id', 'token'],
  });

  if (tokens.length === 0) {
    logger.debug('No push tokens found for user', { userId });
    return;
  }

  const tokenStrings = tokens.map((t) => t.token);
  await sendAndCleanup(tokenStrings, notification);
}

/**
 * Send a push notification to multiple users.
 */
async function sendToMultiple(userIds, notification) {
  const tokens = await FCMToken.findAll({
    where: { userId: userIds, isActive: true },
    attributes: ['id', 'token'],
  });

  if (tokens.length === 0) return;

  const tokenStrings = tokens.map((t) => t.token);
  await sendAndCleanup(tokenStrings, notification);
}

/**
 * Send a push notification to all registered devices.
 */
async function sendToAll(notification) {
  const tokens = await FCMToken.findAll({
    where: { isActive: true },
    attributes: ['id', 'token'],
  });

  if (tokens.length === 0) return;

  const tokenStrings = tokens.map((t) => t.token);
  await sendAndCleanup(tokenStrings, notification);
}

/**
 * Register a device token for push notifications.
 */
async function registerToken(userId, token, platform) {
  const [fcmToken, created] = await FCMToken.findOrCreate({
    where: { token },
    defaults: { userId, token, platform, isActive: true },
  });

  if (!created) {
    await fcmToken.update({ userId, platform, isActive: true });
  }

  logger.info('Push token registered', { userId, platform, created });
  return fcmToken;
}

/**
 * Remove a device token (e.g. on logout).
 */
async function removeToken(token) {
  const deleted = await FCMToken.destroy({ where: { token } });
  logger.info('Push token removed', { token: token.substring(0, 10) + '...', deleted });
  return deleted;
}

// ──────────────────────────────────────────────
// Internal helpers – Expo Push API
// ──────────────────────────────────────────────

async function sendAndCleanup(tokens, notification) {
  // Expo Push API accepts up to 100 messages per request
  const batchSize = 100;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);

    const messages = batch.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body || notification.message,
      data: notification.data || {},
      sound: 'default',
      channelId: notification.data?.category || 'default',
    }));

    try {
      const response = await axios.post(EXPO_PUSH_URL, messages, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });

      const { data } = response.data;
      if (!data) continue;

      // Clean up invalid tokens
      const invalidTokens = [];
      data.forEach((receipt, idx) => {
        if (receipt.status === 'error') {
          if (
            receipt.details?.error === 'DeviceNotRegistered' ||
            receipt.details?.error === 'InvalidCredentials'
          ) {
            invalidTokens.push(batch[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await FCMToken.destroy({ where: { token: invalidTokens } });
        logger.info('Cleaned up invalid push tokens', { count: invalidTokens.length });
      }

      const successCount = data.filter((r) => r.status === 'ok').length;
      logger.debug('Push notifications sent via Expo', {
        success: successCount,
        failure: data.length - successCount,
      });
    } catch (error) {
      logger.error('Failed to send push notifications', { error: error.message });
    }
  }
}

module.exports = {
  sendToUser,
  sendToMultiple,
  sendToAll,
  registerToken,
  removeToken,
};
