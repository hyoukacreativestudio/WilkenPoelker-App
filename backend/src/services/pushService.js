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
 * Refuses to overwrite a token already owned by another user (hijack defense).
 */
async function registerToken(userId, token, platform) {
  const existing = await FCMToken.findOne({ where: { token } });

  if (existing) {
    if (existing.userId && existing.userId !== userId) {
      // Token already registered to another user — likely shared device or hijack attempt.
      // Mark old binding as inactive instead of re-binding silently.
      logger.warn('FCM token registration rejected: token already owned by another user', {
        attemptingUserId: userId,
        currentOwnerId: existing.userId,
      });
      throw new (require('../middlewares/errorHandler').AppError)(
        'Dieses Geraet ist bereits einem anderen Konto zugeordnet. Bitte zuerst dort abmelden.',
        409,
        'FCM_TOKEN_OWNED_BY_OTHER'
      );
    }
    await existing.update({ userId, platform, isActive: true });
    logger.info('Push token reactivated', { userId, platform });
    return existing;
  }

  const fcmToken = await FCMToken.create({ userId, token, platform, isActive: true });
  logger.info('Push token registered', { userId, platform });
  return fcmToken;
}

/**
 * Remove a device token (e.g. on logout). Restricted to caller's own tokens.
 */
async function removeToken(token, userId) {
  const where = { token };
  if (userId) where.userId = userId;
  const deleted = await FCMToken.destroy({ where });
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

    // Map notification categories to the Android channels we registered in the
    // app (see NotificationContext.setNotificationChannelAsync). Unknown
    // categories fall back to "default" — which DOES have sound enabled.
    const categoryToChannel = {
      repair: 'repairs',
      repair_status: 'repairs',
      repair_ready: 'repairs',
      new_repair: 'repairs',
      appointment: 'appointments',
      appointment_reminder: 'appointments',
      appointment_proposal: 'appointments',
    };

    const messages = batch.map((token) => {
      const category = notification.data?.category || notification.data?.type;
      const channelId = categoryToChannel[category] || 'default';
      return {
        to: token,
        title: notification.title,
        body: notification.body || notification.message,
        data: notification.data || {},
        // Critical: `sound: 'default'` must be set on the Expo payload AND the
        // channel must allow sound. Both are configured.
        sound: 'default',
        priority: 'high',
        channelId,
      };
    });

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

      // Clean up ONLY tokens that are genuinely dead (the app was uninstalled or
      // the token expired). Do NOT delete on 'InvalidCredentials' — that means the
      // Expo project is missing its FCM V1 service-account key (a server-side
      // config problem), and wiping every device token would make it impossible
      // to recover once the credentials are fixed.
      const invalidTokens = [];
      let credError = false;
      data.forEach((receipt, idx) => {
        if (receipt.status === 'error') {
          const err = receipt.details?.error;
          if (err === 'DeviceNotRegistered') invalidTokens.push(batch[idx]);
          if (err === 'InvalidCredentials') credError = true;
        }
      });
      if (credError) {
        logger.error('Expo push rejected: InvalidCredentials — upload the FCM V1 service account key to the Expo project (expo.dev → Credentials → Android → FCM V1). Push will not work until then.');
      }

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
