import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || '';

// Expected API answers (wrong password, validation, not found, conflict, ...) are
// shown to the user and are not bugs. Only these are reported as errors: network
// failures/timeouts (status 0), server errors (5xx) and the few 4xx that point at
// an app problem (upload too large / wrong type, rate limited).
const REPORTABLE_CLIENT_STATUSES = new Set([413, 415, 429]);
export function isReportableHttpStatus(status) {
  return !status || status >= 500 || REPORTABLE_CLIENT_STATUSES.has(status);
}

// Query strings can contain search terms (names, e-mails) - never send them.
export function stripQuery(url) {
  return typeof url === 'string' ? url.split('?')[0] : url;
}

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

    // Data minimisation (privacy policy, section 11): only technical data leaves the
    // device. Breadcrumbs never carry request bodies or query strings.
    beforeSend(event) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (!breadcrumb.data) return breadcrumb;
          const { body, ...data } = breadcrumb.data;
          if (typeof data.url === 'string') data.url = stripQuery(data.url);
          return { ...breadcrumb, data };
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
    // Pseudonymous ID only - no e-mail/username in the error tracker (data minimisation).
    Sentry.setUser({ id: user.id });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
