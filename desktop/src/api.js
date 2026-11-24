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
// The Admin's silent re-login uses a ticket from the last password login
// (valid one working day, bound to this PC). The password itself is never
// kept; older versions stored it here, so it is removed on start.
try { localStorage.removeItem('wp_desktop_pw'); } catch { /* ignore */ }
export function setAdminTicket(t) {
  try { if (t) localStorage.setItem('wp_desktop_admin', t); else localStorage.removeItem('wp_desktop_admin'); } catch { /* ignore */ }
}
function getAdminTicket() {
  try { return localStorage.getItem('wp_desktop_admin') || ''; } catch { return ''; }
}

// Device key of this PC after pairing with a code from the Admin (see the
// "PCs" page). Sent with every department login.
export function setDeviceToken(t) {
  try { if (t) localStorage.setItem('wp_desktop_device', t); else localStorage.removeItem('wp_desktop_device'); } catch { /* ignore */ }
}
export function getDeviceToken() {
  try { return localStorage.getItem('wp_desktop_device') || ''; } catch { return ''; }
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

// Silent re-login for the stored department. Returns true on success. If the
// server refuses (PC no longer paired, Admin ticket expired), the session is
// over: back to the login screen.
async function reLogin() {
  const dept = getDept();
  if (!dept) return false;
  try {
    const res = await fetch(`${BASE}/desktop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department: dept, deviceToken: getDeviceToken() || undefined, adminTicket: dept === 'admin' ? getAdminTicket() : undefined }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setToken(null); setDept(null); setAdminTicket(null);
        try { window.dispatchEvent(new CustomEvent('wp-session-ended')); } catch { /* ignore */ }
      }
      return false;
    }
    const json = await res.json();
    const tok = json?.data?.accessToken;
    if (!tok) return false;
    setToken(tok);
    if (json?.data?.adminTicket) setAdminTicket(json.data.adminTicket);
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
const isLoginPath = (path) => path.startsWith('/desktop/login') || path.startsWith('/desktop/device/');
const isQueueable = (path, method) => method !== 'GET' && !isLoginPath(path) && !path.startsWith('/auth');

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
  if (res.status === 401 && !retried && !isLoginPath(path)) {
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
  // Same as del - Feedback and Anfragen called api.delete, which did not exist
  delete: (p) => request(p, { method: 'DELETE' }),
};

// Unwrap the backend's { success, data } envelope
export const unwrap = (res) => (res && res.data !== undefined ? res.data : res);
