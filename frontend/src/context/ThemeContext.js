import React, { createContext, useState, useEffect, useCallback } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTheme } from '../theme';

export const ThemeContext = createContext(null);

const STORAGE_KEY = '@wilkenpoelker_theme';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('system'); // 'light' | 'dark' | 'system'
  const [accentColor, setAccentColor] = useState('green');
  const [textSize, setTextSize] = useState('medium');
  const [isReady, setIsReady] = useState(false);

  const systemColorScheme = Appearance.getColorScheme();

  const isDark = mode === 'system'
    ? systemColorScheme === 'dark'
    : mode === 'dark';

  const theme = buildTheme({ isDark, accentColor, textSize });

  // Load saved preferences
  useEffect(() => {
    loadPreferences();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (mode === 'system') {
        // Force re-render when system theme changes
        setMode('system');
      }
    });

    return () => subscription?.remove();
  }, [mode]);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { mode: savedMode, accentColor: savedAccent, textSize: savedSize } = JSON.parse(saved);
        if (savedMode) setMode(savedMode);
        if (savedAccent) setAccentColor(savedAccent);
        if (savedSize) setTextSize(savedSize);
      }
    } catch {}
    setIsReady(true);
  };

  const savePreferences = async (prefs) => {
    try {
      const current = { mode, accentColor, textSize, ...prefs };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {}
  };

  const setThemeMode = useCallback((newMode) => {
    setMode(newMode);
    savePreferences({ mode: newMode });
  }, [accentColor, textSize]);

  const setAccent = useCallback((color) => {
    setAccentColor(color);
    savePreferences({ accentColor: color });
  }, [mode, textSize]);

  const setSize = useCallback((size) => {
    setTextSize(size);
    savePreferences({ textSize: size });
  }, [mode, accentColor]);

  const value = {
    theme,
    isDark,
    mode,
    accentColor,
    textSize,
    setThemeMode,
    setAccentColor: setAccent,
    setTextSize: setSize,
    isReady,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
