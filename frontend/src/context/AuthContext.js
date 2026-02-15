import React, { createContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { authApi } from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check stored tokens on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getItem('accessToken');
      const userData = await storage.getItem('user');

      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      }
    } catch {
      // Token invalid or missing
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async ({ email, password, customerNumber }) => {
    const { data } = await authApi.login({ email, password, customerNumber });
    const { accessToken, refreshToken, user: userData } = data.data;

    await storage.setItem('accessToken', accessToken);
    await storage.setItem('refreshToken', refreshToken);
    await storage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);

    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData);
    return data;
  }, []);

  const logout = useCallback(async () => {
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
