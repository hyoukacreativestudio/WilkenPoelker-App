import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || '';

export function initializeSentry() {
  if (!SENTRY_DSN) {
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

    // Do NOT ignore Network errors — those are the ones we most need to see in production
    // (Previous config swallowed them, which is why POST failures never surfaced.)
    ignoreErrors: [
      'AbortError',
      'ECONNREFUSED',
    ],
  });
}

// Explicit breadcrumb helper so the axios interceptor + screens can drop
// context ("about to POST /feed", "response 400 …") into the trail Sentry keeps.
export function addBreadcrumb(category, message, data) {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
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
