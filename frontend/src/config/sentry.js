import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = ''; // Set your Sentry DSN here or use env

export function initializeSentry() {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',

    // Performance Monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Don't send in development
    enabled: !__DEV__,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive breadcrumb data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data?.url?.includes('auth')) {
            breadcrumb.data = { ...breadcrumb.data, body: '[REDACTED]' };
          }
          return breadcrumb;
        });
      }
      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      'Network request failed',
      'AbortError',
      'timeout',
      'ECONNREFUSED',
    ],
  });
}

export function captureError(error, context = {}) {
  if (!SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
}

export function setUser(user) {
  if (!SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.username });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
