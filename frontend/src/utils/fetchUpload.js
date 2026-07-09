// Direct-fetch helper for FormData uploads.
// Axios + FormData on Android release APKs has known issues where the
// multipart boundary isn't set correctly, causing every request to fail with
// "Network Error" before it ever leaves the device. Native fetch avoids all
// of that — RN's networking layer sets Content-Type + boundary itself.

import { storage } from './storage';
import { addBreadcrumb, captureError } from '../config/sentry';
import { emitAuthEvent, AUTH_EVENT_LOGOUT } from './authEvents';

let BASE_URL = null;
export function setUploadBaseUrl(url) { BASE_URL = url; }

async function doFetch(method, path, formData) {
  if (!BASE_URL) {
    throw { message: 'Upload base URL not set', code: 'CONFIG', status: 0, isNetworkError: false };
  }
  const url = BASE_URL + path;
  const token = await storage.getItem('accessToken').catch(() => null);

  addBreadcrumb('http.request.upload', `${method} ${path}`, {
    hasAuth: !!token,
    isFormData: true,
  });

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        // Deliberately DO NOT set Content-Type — RN's fetch fills in
        // "multipart/form-data; boundary=…" automatically for FormData bodies.
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch (netErr) {
    addBreadcrumb('http.response.upload', `${method} ${path} -> network`, {
      message: netErr?.message,
    });
    const normalized = {
      message: netErr?.message || 'Network request failed',
      code: 'NETWORK_ERROR',
      status: 0,
      isNetworkError: true,
    };
    captureError(new Error(`Upload ${method} ${path} network fail: ${normalized.message}`), {
      url: path,
      method,
      isNetworkError: true,
    });
    throw normalized;
  }

  let json = null;
  try { json = await res.json(); } catch {}

  addBreadcrumb('http.response.upload', `${method} ${path} -> ${res.status}`, {
    code: json?.error?.code,
  });

  if (!res.ok) {
    const normalized = {
      message: json?.error?.message || json?.message || `HTTP ${res.status}`,
      code: json?.error?.code || 'HTTP_ERROR',
      status: res.status,
      details: json?.error?.details || null,
      isNetworkError: false,
    };
    if (res.status === 401) {
      // Match the axios interceptor's behaviour so the UI resets to login
      emitAuthEvent(AUTH_EVENT_LOGOUT, { reason: 'upload_401' });
    }
    captureError(new Error(`Upload ${method} ${path} failed: ${normalized.message}`), {
      status: normalized.status,
      code: normalized.code,
      url: path,
      method,
    });
    throw normalized;
  }

  // Match the axios return shape (result.data.data.foo)
  return { data: json };
}

export function uploadPost(method, path, formData) {
  return doFetch(method, path, formData);
}
