const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

function initializeSentry(app) {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info('Sentry DSN not configured, error tracking disabled');
    return {
      captureException: () => {},
      captureMessage: () => {},
      isEnabled: false,
    };
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: `wilkenpoelker-backend@${require('../../package.json').version}`,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Don't send in development unless explicitly enabled
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLE === 'true',

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      // Remove sensitive body fields
      if (event.request?.data) {
        const data = typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data;
        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.refreshToken) data.refreshToken = '[REDACTED]';
        event.request.data = data;
      }
      return event;
    },

    // Ignore common non-errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ECONNRESET',
      'EPIPE',
      'TokenExpiredError',
      'JsonWebTokenError',
    ],
  });

  // Express integration
  if (app) {
    Sentry.setupExpressErrorHandler(app);
  }

  logger.info('Sentry error tracking initialized');

  return {
    captureException: (err, context) => Sentry.captureException(err, context),
    captureMessage: (msg, level) => Sentry.captureMessage(msg, level),
    isEnabled: true,
  };
}

module.exports = { initializeSentry };
