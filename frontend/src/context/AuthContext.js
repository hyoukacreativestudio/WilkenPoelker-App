import React, { createContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { authApi } from '../api/auth';
import { notificationsApi } from '../api/notifications';
import { subscribeAuthEvents, AUTH_EVENT_LOGOUT } from '../utils/authEvents';
import { setUser as setSentryUser } from '../config/sentry';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check stored tokens on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for forced logouts triggered outside of React (e.g. expired refresh token)
  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(async (type) => {
      if (type === AUTH_EVENT_LOGOUT) {
        try {
          await storage.deleteItem('accessToken');
          await storage.deleteItem('refreshToken');
          await storage.deleteItem('user');
          await storage.deleteItem('expoPushToken');
        } catch {}
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    return unsubscribe;
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getItem('accessToken');
      const userData = await storage.getItem('user');

      if (token && userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setIsAuthenticated(true);
        // Tell Sentry who this user is so errors carry that context automatically
        setSentryUser(parsed);
      }
    } catch {
      // Token invalid or missing
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async ({ email, password, customerNumber, rememberMe = true }) => {
    const { data } = await authApi.login({ email, password, customerNumber, rememberMe });
    const { accessToken, refreshToken, user: userData } = data.data;

    await storage.setItem('accessToken', accessToken);
    await storage.setItem('refreshToken', refreshToken);
    await storage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);
    setSentryUser(userData);

    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData);
    return data;
  }, []);

  const logout = useCallback(async () => {
    // Remove push token from backend before logout
    try {
      const storedToken = await storage.getItem('expoPushToken');
      if (storedToken) {
        await notificationsApi.removeFcmToken(storedToken).catch(() => {});
        await storage.deleteItem('expoPushToken');
      }
    } catch {}

    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout
    }

    await storage.deleteItem('accessToken');
    await storage.deleteItem('refreshToken');
    await storage.deleteItem('user');

    setUser(null);
    setIsAuthenticated(false);
    setSentryUser(null);
  }, []);

  const updateUser = useCallback(async (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    await storage.setItem('user', JSON.stringify(newUser));
  }, [user]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
