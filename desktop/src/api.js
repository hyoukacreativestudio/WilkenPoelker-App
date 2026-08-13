// Thin API client for the desktop tool. Talks to the SAME backend as the app.
// In dev, Vite proxies /api -> localhost:5002. In prod, set VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

let accessToken = localStorage.getItem('wp_desktop_token') || null;

export function setToken(t) {
  accessToken = t;
  if (t) localStorage.setItem('wp_desktop_token', t);
  else localStorage.removeItem('wp_desktop_token');
}
export function getToken() { return accessToken; }

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `Fehler ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
};

// Unwrap the backend's { success, data } envelope
export const unwrap = (res) => (res && res.data !== undefined ? res.data : res);
