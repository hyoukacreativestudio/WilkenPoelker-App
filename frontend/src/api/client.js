import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

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

// Request interceptor - attach auth token & handle FormData
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}

    // When sending FormData, remove default JSON Content-Type
    // so that axios/fetch can set the correct multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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

    // If 401 with tokenExpired and not already retrying
    if (
      error.response?.status === 401 &&
      error.response?.data?.error?.tokenExpired &&
      !originalRequest._retry
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
