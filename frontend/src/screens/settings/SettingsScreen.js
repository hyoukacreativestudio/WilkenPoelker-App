import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { LanguageContext } from '../../context/LanguageContext';
import { authApi } from '../../api/auth';
import { usersApi } from '../../api/users';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import Divider from '../../components/ui/Divider';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

const THEME_MODES = ['light', 'dark', 'system'];
const ACCENT_COLORS = ['green', 'blue', 'red', 'purple', 'orange'];
const TEXT_SIZES = ['small', 'medium', 'large', 'extraLarge'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme, isDark, mode, accentColor, textSize, setThemeMode, setAccentColor, setTextSize } = useTheme();
  const { language, setLanguage: setLanguageRaw } = useContext(LanguageContext);
  const { logout } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation();

  const handleSetThemeMode = (m) => {
    setThemeMode(m);
    showToast({ type: 'success', message: t('settings.themeSaved') });
  };

  const handleSetAccentColor = (color) => {
    setAccentColor(color);
    showToast({ type: 'success', message: t('settings.accentColorSaved') });
  };

  const handleSetTextSize = (size) => {
    setTextSize(size);
    showToast({ type: 'success', message: t('settings.textSizeSaved') });
  };

  const handleSetLanguage = (lang) => {
    setLanguageRaw(lang);
    setTimeout(() => {
      showToast({ type: 'success', message: t('settings.languageSaved') });
    }, 100);
  };

  const NOTIFICATION_STORAGE_KEY = '@notification_prefs';
  const DEFAULT_NOTIFICATIONS = {
    push: true,
    repairUpdates: true,
    appointmentReminders: true,
    chatMessages: true,
    feedUpdates: false,
    offers: true,
  };

  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(stored) });
        }
      })
      .catch(() => {});
  }, []);

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      showToast({ type: 'success', message: t('settings.notificationUpdated') });
      return updated;
    });
  };

  const handleDeleteData = () => {
    Alert.alert(
      t('settings.deleteDataTitle'),
      t('settings.deleteDataMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            // Second confirmation with password prompt
            Alert.prompt
              ? Alert.prompt(
                  t('settings.deleteDataTitle'),
                  t('settings.enterPasswordToDelete'),
                  async (password) => {
                    if (!password) return;
                    try {
                      await authApi.deleteAccount(password);
                      showToast({ type: 'success', message: t('settings.deleteDataRequestedMessage') });
                      await logout();
                    } catch (err) {
                      showToast({ type: 'error', message: err.message || t('errors.generic') });
                    }
                  },
                  'secure-text'
                )
              : // Android fallback (no Alert.prompt)
                Alert.alert(
                  t('settings.deleteDataTitle'),
                  t('settings.deleteAccountContactSupport'),
                  [{ text: t('common.ok') }]
                );
          },
        },
      ]
    );
  };

  const [exporting, setExporting] = useState(false);
  const handleExportData = async () => {
    try {
      setExporting(true);
      const res = await usersApi.exportMyData();
      const jsonStr = JSON.stringify(res.data?.data || res.data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wilkenpoelker-daten-export.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: jsonStr,
          title: 'WilkenPoelker Datenexport',
        });
      }
      showToast({ type: 'success', message: t('settings.exportDataMessage') });
    } catch (err) {
      showToast({ type: 'error', message: err.message || t('errors.generic') });
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = async () => {
    try {
      const keysToKeep = ['accessToken', 'refreshToken', 'user', '@theme_mode', '@accent_color', '@text_size', '@language'];
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((k) => !keysToKeep.includes(k));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      showToast({ type: 'success', message: t('settings.cacheClearedMessage') });
    } catch {
      showToast({ type: 'error', message: t('errors.generic') });
    }
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      >
        {/* Appearance Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.appearance')}</Text>
          <Card>
            {/* Theme Mode */}
            <Text style={s.label}>{t('settings.themeMode')}</Text>
            <View style={s.chipRow}>
              {THEME_MODES.map((m) => (
                <Chip
                  key={m}
                  label={t(`settings.theme_${m}`)}
                  selected={mode === m}
                  onPress={() => handleSetThemeMode(m)}
                  variant="outlined"
                />
              ))}
            </View>

            <Divider />

            {/* Accent Color */}
            <Text style={s.label}>{t('settings.accentColor')}</Text>
            <View style={s.colorRow}>
              {ACCENT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => handleSetAccentColor(color)}
                  activeOpacity={0.7}
                  style={[
                    s.colorCircle,
                    {
                      backgroundColor: theme.colors.accent[color],
                      borderColor: accentColor === color
                        ? theme.colors.text
                        : 'transparent',
                    },
                  ]}
                >
                  {accentColor === color ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color="#FFFFFF"
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            <Divider />

            {/* Text Size */}
            <Text style={s.label}>{t('settings.textSize')}</Text>
            <View style={s.chipRow}>
              {TEXT_SIZES.map((size) => (
                <Chip
                  key={size}
                  label={t(`settings.textSize_${size}`)}
                  selected={textSize === size}
                  onPress={() => handleSetTextSize(size)}
                  variant="outlined"
                  size="small"
                />
              ))}
            </View>

            <Divider />

            {/* Preview */}
            <Text style={s.label}>{t('settings.preview')}</Text>
            <View
              style={[
                s.previewBox,
                { backgroundColor: isDark ? theme.colors.surface : theme.colors.background },
              ]}
            >
              <Text style={[theme.typography.styles.h5, { color: theme.colors.primary }]}>
                {t('settings.previewHeading')}
              </Text>
              <Text style={[theme.typography.styles.body, { color: theme.colors.text, marginTop: theme.spacing.xs }]}>
                {t('settings.previewBody')}
              </Text>
              <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }]}>
                {t('settings.previewCaption')}
              </Text>
            </View>
          </Card>
        </View>

        {/* Language Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.language')}</Text>
          <Card>
            <TouchableOpacity
              onPress={() => handleSetLanguage('de')}
              activeOpacity={0.7}
              style={s.languageRow}
            >
              <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                Deutsch
              </Text>
              <View
                style={[
                  s.radioOuter,
                  { borderColor: language === 'de' ? theme.colors.primary : theme.colors.border },
                ]}
              >
                {language === 'de' ? (
                  <View
                    style={[s.radioInner, { backgroundColor: theme.colors.primary }]}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
            <Divider style={{ marginVertical: 0 }} />
            <TouchableOpacity
              onPress={() => handleSetLanguage('en')}
              activeOpacity={0.7}
              style={s.languageRow}
            >
              <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                English
              </Text>
              <View
                style={[
                  s.radioOuter,
                  { borderColor: language === 'en' ? theme.colors.primary : theme.colors.border },
                ]}
              >
                {language === 'en' ? (
                  <View
                    style={[s.radioInner, { backgroundColor: theme.colors.primary }]}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Notifications Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.notifications')}</Text>
          <Card>
            {[
              { key: 'push', label: t('settings.pushNotifications') },
              { key: 'repairUpdates', label: t('settings.repairUpdates') },
              { key: 'appointmentReminders', label: t('settings.appointmentReminders') },
              { key: 'chatMessages', label: t('settings.chatMessages') },
              { key: 'feedUpdates', label: t('settings.feedUpdates') },
              { key: 'offers', label: t('settings.offers') },
            ].map((item, index, arr) => (
              <React.Fragment key={item.key}>
                <View style={s.toggleRow}>
                  <Text
                    style={[
                      theme.typography.styles.body,
                      { color: theme.colors.text, flex: 1 },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Switch
                    value={notifications[item.key]}
                    onValueChange={() => toggleNotification(item.key)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary + '80',
                    }}
                    thumbColor={
                      notifications[item.key]
                        ? theme.colors.primary
                        : theme.colors.textTertiary
                    }
                  />
                </View>
                {index < arr.length - 1 ? (
                  <Divider style={{ marginVertical: 0 }} />
                ) : null}
              </React.Fragment>
            ))}
          </Card>
        </View>

        {/* Privacy Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.privacy')}</Text>
          <Card>
            <Button
              title={t('settings.deleteMyData')}
              variant="danger"
              onPress={handleDeleteData}
              fullWidth
              icon={
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color="#FFFFFF"
                />
              }
            />
            <View style={{ height: theme.spacing.sm }} />
            <Button
              title={t('settings.exportMyData')}
              variant="secondary"
              onPress={handleExportData}
              fullWidth
              icon={
                <MaterialCommunityIcons
                  name="download-outline"
                  size={20}
                  color={theme.colors.primary}
                />
              }
            />
          </Card>
        </View>

        {/* Legal Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.legal')}</Text>
          <Card>
            {[
              { key: 'impressum', icon: 'file-document-outline', screen: 'Impressum' },
              { key: 'agb', icon: 'clipboard-text-outline', screen: 'AGB' },
              { key: 'datenschutz', icon: 'shield-lock-outline', screen: 'Datenschutz' },
              { key: 'widerrufsrecht', icon: 'undo-variant', screen: 'Widerrufsrecht' },
            ].map((item, index, arr) => (
              <React.Fragment key={item.key}>
                <TouchableOpacity
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                  style={s.legalRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={theme.colors.primary}
                      style={{ marginRight: theme.spacing.sm }}
                    />
                    <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                      {t(`settings.${item.key}`)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
                {index < arr.length - 1 ? (
                  <Divider style={{ marginVertical: 0 }} />
                ) : null}
              </React.Fragment>
            ))}
          </Card>
        </View>

        {/* App Info Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.appInfo')}</Text>
          <Card>
            <View style={s.infoRow}>
              <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                {t('settings.version')}
              </Text>
              <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary }]}>
                1.0.0
              </Text>
            </View>
            <Divider style={{ marginVertical: theme.spacing.sm }} />
            <View style={s.infoRow}>
              <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
                {t('settings.developedBy')}
              </Text>
              <Text style={[theme.typography.styles.body, { color: theme.colors.primary, fontWeight: '600' }]}>
                {t('settings.developer')}
              </Text>
            </View>
            <Divider style={{ marginVertical: theme.spacing.sm }} />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: theme.spacing.xs }]}>
              {t('settings.copyright')}
            </Text>
            <Divider style={{ marginVertical: theme.spacing.sm }} />
            <Button
              title={t('settings.clearCache')}
              variant="ghost"
              onPress={handleClearCache}
              fullWidth
              icon={
                <MaterialCommunityIcons
                  name="cached"
                  size={20}
                  color={theme.colors.primary}
                />
              }
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    section: {
      marginTop: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.typography.weights.semiBold,
    },
    label: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.typography.weights.medium,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    colorRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    colorCircle: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
    },
    previewBox: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    languageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: theme.borderRadius.round,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: theme.borderRadius.round,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    legalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    aboutIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
      marginTop: 2,
    },
  });
