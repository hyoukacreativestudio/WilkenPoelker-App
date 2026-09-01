// Thin API client for the desktop tool. Talks to the SAME backend as the app.
// In dev, Vite proxies /api -> localhost:5002. In prod, set VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
// Origin for media (relative /uploads/... paths); Cloudinary URLs are absolute.
export const apiOrigin = BASE.replace(/\/api$/, '');
export const mediaUrl = (u) => (!u ? '' : (/^https?:\/\//.test(u) ? u : `${apiOrigin}${u}`));

let accessToken = localStorage.getItem('wp_desktop_token') || null;

export function setToken(t) {
  accessToken = t;
  if (t) localStorage.setItem('wp_desktop_token', t);
  else localStorage.removeItem('wp_desktop_token');
}
export function getToken() { return accessToken; }

// Remember which department is logged in, so we can silently re-login when the
// short-lived access token expires (passwordless). This is what makes the same
// account usable on many PCs at once without ever seeing "Token expired".
export function setDept(d) {
  if (d) localStorage.setItem('wp_desktop_dept', d);
  else localStorage.removeItem('wp_desktop_dept');
}
export function getDept() { return localStorage.getItem('wp_desktop_dept'); }
// Password-protected departments (Admin) must re-send their password on silent
// re-login. Stored lightly obfuscated (trusted company PC).
export function setDeptSecret(pw) {
  try { if (pw) localStorage.setItem('wp_desktop_pw', btoa(unescape(encodeURIComponent(pw)))); else localStorage.removeItem('wp_desktop_pw'); } catch { /* ignore */ }
}
function getDeptSecret() {
  try { const v = localStorage.getItem('wp_desktop_pw'); return v ? decodeURIComponent(escape(atob(v))) : ''; } catch { return ''; }
}

function doFetch(path, { method = 'GET', body, headers = {} } = {}) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Passwordless re-login for the stored department. Returns true on success.
async function reLogin() {
  const dept = getDept();
  if (!dept) return false;
  try {
    const res = await fetch(`${BASE}/desktop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department: dept, password: getDeptSecret() }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const tok = json?.data?.accessToken;
    if (!tok) return false;
    setToken(tok);
    return true;
  } catch { return false; }
}

// ── Offline queue ──────────────────────────────────────────────────────
// If a change (POST/PATCH/PUT/DELETE) can't reach the server, we store it and
// replay it automatically once the connection is back. GETs can't be queued.
const QKEY = 'wp_offline_queue';
const readQueue = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { return []; } };
const writeQueue = (q) => { localStorage.setItem(QKEY, JSON.stringify(q)); try { window.dispatchEvent(new CustomEvent('wp-queue', { detail: q.length })); } catch {} };
export const pendingCount = () => readQueue().length;
const isQueueable = (path, method) => method !== 'GET' && !path.startsWith('/desktop/login') && !path.startsWith('/auth');

let flushing = false;
export async function flushQueue() {
  if (flushing) return;
  let q = readQueue();
  if (!q.length) return;
  flushing = true;
  try {
    while (q.length) {
      const item = q[0];
      let res;
      try { res = await doFetch(item.path, { method: item.method, body: item.body }); }
      catch { break; } // still offline — stop, keep the rest queued
      if (res.status === 401) {
        if (await reLogin()) { try { res = await doFetch(item.path, { method: item.method, body: item.body }); } catch { break; } }
      }
      // Any real response (2xx or a 4xx that won't fix itself) = processed.
      q.shift(); writeQueue(q);
    }
  } finally { flushing = false; }
}

async function request(path, opts = {}, retried = false) {
  const method = opts.method || 'GET';
  let res;
  try {
    res = await doFetch(path, opts);
  } catch (netErr) {
    // No connection. Queue the change so it syncs later; GETs just fail.
    if (isQueueable(path, method)) {
      const q = readQueue(); q.push({ path, method, body: opts.body, ts: Date.now() }); writeQueue(q);
      return { success: true, data: { queued: true }, queued: true };
    }
    const err = new Error('Keine Internetverbindung zum Server.');
    err.offline = true;
    throw err;
  }

  // Access token expired → silently re-login (passwordless) and retry once.
  if (res.status === 401 && !retried && !path.startsWith('/desktop/login')) {
    if (await reLogin()) return request(path, opts, true);
  }

  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `Fehler ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = json?.error?.code;
    throw err;
  }
  // Good connection → opportunistically flush anything that was queued offline.
  if (readQueue().length) flushQueue();
  return json;
}

// Replay the queue when the connection returns, and periodically.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushQueue());
  setInterval(() => flushQueue(), 20000);
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
