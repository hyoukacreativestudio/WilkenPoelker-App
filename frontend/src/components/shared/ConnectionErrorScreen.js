import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Button from '../ui/Button';

/**
 * Full-screen connection error overlay.
 * Shows a friendly error message and a reload button.
 *
 * Usage:
 *   <ConnectionErrorScreen onRetry={() => { ... }} />
 */
export default function ConnectionErrorScreen({ onRetry, message }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const s = styles(theme);

  const handleReload = () => {
    if (onRetry) {
      onRetry();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <View style={s.container}>
      <View style={s.content}>
        {/* Icon */}
        <View style={s.iconWrapper}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={64}
            color={theme.colors.textTertiary}
          />
        </View>

        {/* Title */}
        <Text style={s.title}>
          {t('connectionError.title')}
        </Text>

        {/* Message */}
        <Text style={s.message}>
          {message || t('connectionError.message')}
        </Text>

        {/* Reload Button */}
        <Button
          title={t('connectionError.reload')}
          onPress={handleReload}
          variant="primary"
          size="large"
          icon={<MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />}
          style={s.button}
        />
      </View>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    content: {
      alignItems: 'center',
      maxWidth: 360,
    },
    iconWrapper: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    message: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.xl,
    },
    button: {
      minWidth: 200,
    },
  });
