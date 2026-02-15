import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Button from './Button';

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}) {
  const { theme } = useTheme();

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
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={64}
          color={theme.colors.textTertiary}
          style={{ marginBottom: theme.spacing.md }}
        />
      ) : null}

      {title ? (
        <Text
          style={[
            theme.typography.styles.h5,
            {
              color: theme.colors.text,
              textAlign: 'center',
              marginBottom: theme.spacing.sm,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}

      {message ? (
        <Text
          style={[
            theme.typography.styles.body,
            {
              color: theme.colors.textSecondary,
              textAlign: 'center',
              marginBottom: theme.spacing.lg,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="primary" />
      ) : null}
    </View>
  );
}
