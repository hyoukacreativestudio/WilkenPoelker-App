// Lightweight pub/sub for auth lifecycle events that originate outside React
// (e.g. the axios refresh-token interceptor) and need to notify the AuthContext.

const listeners = new Set();

export const AUTH_EVENT_LOGOUT = 'auth:forced-logout';

export function emitAuthEvent(type, payload) {
  listeners.forEach((fn) => {
    try {
      fn(type, payload);
    } catch {}
  });
}

export function subscribeAuthEvents(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
