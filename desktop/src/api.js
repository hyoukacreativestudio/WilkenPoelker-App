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
      body: JSON.stringify({ department: dept }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const tok = json?.data?.accessToken;
    if (!tok) return false;
    setToken(tok);
    return true;
  } catch { return false; }
}

async function request(path, opts = {}, retried = false) {
  let res;
  try {
    res = await doFetch(path, opts);
  } catch (netErr) {
    // No connection at all
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
