import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function Divider({ label, style }) {
  const { theme } = useTheme();

  if (label) {
    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: theme.spacing.md,
          },
          style,
        ]}
      >
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: theme.colors.border,
          }}
        />
        <Text
          style={[
            theme.typography.styles.caption,
            {
              color: theme.colors.textTertiary,
              paddingHorizontal: theme.spacing.sm,
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          {label}
        </Text>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: theme.colors.border,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: theme.colors.border,
          marginVertical: theme.spacing.md,
        },
        style,
      ]}
    />
  );
}
