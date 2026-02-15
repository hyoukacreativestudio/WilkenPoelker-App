import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import i18n from '../i18n/setup';

export const LanguageContext = createContext(null);

const STORAGE_KEY = '@wilkenpoelker_language';

function getDeviceLanguage() {
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

  if (locale?.startsWith('de')) return 'de';
  if (locale?.startsWith('en')) return 'en';
  return 'de'; // Default to German
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('de');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const lang = saved || getDeviceLanguage();
      setLanguageState(lang);
      i18n.changeLanguage(lang);
    } catch {
      i18n.changeLanguage('de');
    }
    setIsReady(true);
  };

  const setLanguage = useCallback(async (lang) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const value = {
    language,
    setLanguage,
    isReady,
    isGerman: language === 'de',
    isEnglish: language === 'en',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
