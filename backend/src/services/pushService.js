const { getMessaging } = require('../config/firebase');
const { FCMToken } = require('../models');
const logger = require('../utils/logger');

/**
 * Send a push notification to a specific user (all their registered devices).
 */
async function sendToUser(userId, notification) {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('Firebase not initialized – push notification skipped', { userId });
    return;
  }

  const tokens = await FCMToken.findAll({
    where: { userId, isActive: true },
    attributes: ['id', 'token'],
  });

  if (tokens.length === 0) {
    logger.debug('No FCM tokens found for user', { userId });
    return;
  }

  const tokenStrings = tokens.map((t) => t.token);
  await sendAndCleanup(messaging, tokenStrings, notification);
}

/**
 * Send a push notification to multiple users.
 */
async function sendToMultiple(userIds, notification) {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('Firebase not initialized – push notification skipped');
    return;
  }

  const tokens = await FCMToken.findAll({
    where: { userId: userIds, isActive: true },
    attributes: ['id', 'token'],
  });

  if (tokens.length === 0) return;

  const tokenStrings = tokens.map((t) => t.token);
  await sendAndCleanup(messaging, tokenStrings, notification);
}

/**
 * Send a push notification to all registered devices.
 */
async function sendToAll(notification) {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('Firebase not initialized – broadcast push skipped');
    return;
  }

  const tokens = await FCMToken.findAll({
    where: { isActive: true },
    attributes: ['id', 'token'],
  });

  if (tokens.length === 0) return;

  const tokenStrings = tokens.map((t) => t.token);
  await sendAndCleanup(messaging, tokenStrings, notification);
}

/**
 * Register a device token for push notifications.
 */
async function registerToken(userId, token, platform) {
  // Upsert – if token already exists, update the userId and platform
  const [fcmToken, created] = await FCMToken.findOrCreate({
    where: { token },
    defaults: { userId, token, platform, isActive: true },
  });

  if (!created) {
    await fcmToken.update({ userId, platform, isActive: true });
  }

  logger.info('FCM token registered', { userId, platform, created });
  return fcmToken;
}

/**
 * Remove a device token (e.g. on logout).
 */
async function removeToken(token) {
  const deleted = await FCMToken.destroy({ where: { token } });
  logger.info('FCM token removed', { token: token.substring(0, 10) + '...', deleted });
  return deleted;
}

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

async function sendAndCleanup(messaging, tokens, notification) {
  // Firebase sendEachForMulticast accepts up to 500 tokens per call
  const batchSize = 500;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);

    const message = {
      notification: {
        title: notification.title,
        body: notification.body || notification.message,
      },
      data: notification.data || {},
      tokens: batch,
    };

    try {
      const response = await messaging.sendEachForMulticast(message);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(batch[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await FCMToken.destroy({ where: { token: invalidTokens } });
          logger.info('Cleaned up invalid FCM tokens', { count: invalidTokens.length });
        }
      }

      logger.debug('Push notifications sent', {
        success: response.successCount,
        failure: response.failureCount,
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
