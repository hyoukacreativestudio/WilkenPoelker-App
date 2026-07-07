import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';
import { emitAuthEvent, AUTH_EVENT_LOGOUT } from '../utils/authEvents';

// Environment-based API URL with fallback
const getBaseUrl = () => {
  // 1. EAS build env variable
  if (Constants.expoConfig?.extra?.apiBaseUrl) {
    return Constants.expoConfig.extra.apiBaseUrl;
  }
  // 2. EAS build environment variable
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  // 3. Development fallback
  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:5002/api';
    }
    // Change this IP to your dev machine's local IP for physical device
    return 'http://192.168.178.24:5002/api';
  }
  // 4. Production web: use same origin (backend serves frontend)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.origin + '/api';
  }
  // 5. Production mobile default
  return 'https://api.wilkenpoelker.de/api';
};

const BASE_URL = getBaseUrl();

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor — attach auth token & handle FormData.
// Wrapped defensively because on Android release builds an unhandled throw in
// here surfaces as a bare "Network Error" without ever firing the request.
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Ensure headers exists (axios usually creates it, but be paranoid)
      if (!config.headers) config.headers = {};

      // Attach auth token
      let token = null;
      try {
        token = await storage.getItem('accessToken');
      } catch (storageErr) {
        if (__DEV__) console.warn('[apiClient] storage read failed:', storageErr?.message);
      }
      if (token) {
        // Use bracket access so a proxied AxiosHeaders instance behaves the same
        // as a plain object.
        try {
          config.headers['Authorization'] = `Bearer ${token}`;
        } catch (headerErr) {
          if (__DEV__) console.warn('[apiClient] setting Authorization failed:', headerErr?.message);
        }
      }

      // For FormData: strip Content-Type so RN's networking layer sets the
      // multipart boundary. Check both casings in case a header proxy is used.
      if (config.data instanceof FormData) {
        try {
          if (config.headers['Content-Type'] !== undefined) delete config.headers['Content-Type'];
          if (config.headers['content-type'] !== undefined) delete config.headers['content-type'];
          if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
          }
        } catch {}
      }
    } catch (interceptorErr) {
      // Never let the interceptor break the request — log and continue
      if (__DEV__) console.warn('[apiClient] request interceptor error:', interceptorErr?.message);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Refresh on any 401 (not only tokenExpired flag), as long as we still have a refresh token
    // and the failing request was not itself the refresh call.
    const isAuthRefreshCall =
      typeof originalRequest?.url === 'string' && originalRequest.url.includes('/auth/refresh-token');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRefreshCall
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        await storage.setItem('accessToken', newAccessToken);
        await storage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens - force re-login
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
        await storage.deleteItem('user');
        // Notify AuthContext so the UI resets to the login screen
        emitAuthEvent(AUTH_EVENT_LOGOUT, { reason: 'refresh_failed' });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalize error response
    const normalizedError = {
      message:
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred',
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 0,
      details: error.response?.data?.error?.details || null,
      isNetworkError: !error.response,
    };

    return Promise.reject(normalizedError);
  }
);

export { BASE_URL };
export const getServerUrl = () => BASE_URL.replace('/api', '');
export default apiClient;
