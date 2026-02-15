import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Button from './Button';

export default function ErrorState({ error, onRetry, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.xl,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={64}
        color={theme.colors.error}
        style={{ marginBottom: theme.spacing.md }}
      />

      <Text
        style={[
          theme.typography.styles.body,
          {
            color: theme.colors.error,
            textAlign: 'center',
            marginBottom: theme.spacing.lg,
          },
        ]}
      >
        {error || t('errors.somethingWentWrong')}
      </Text>

      {onRetry ? (
        <Button
          title={t('common.retry')}
          onPress={onRetry}
          variant="primary"
        />
      ) : null}
    </View>
  );
}
