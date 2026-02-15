import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function Badge({
  count,
  color,
  size = 'small',
  showZero = false,
  maxCount = 99,
  style,
}) {
  const { theme } = useTheme();

  if (!showZero && (!count || count <= 0)) {
    return null;
  }

  const badgeColor = color || theme.colors.primary;
  const badgeSize = size === 'small' ? 18 : 24;
  const fontSize = size === 'small' ? theme.typography.sizes.small : theme.typography.sizes.caption;

  const displayCount = count > maxCount ? `${maxCount}+` : `${count}`;
  const isWide = displayCount.length > 2;
  const minWidth = isWide ? badgeSize + theme.spacing.sm : badgeSize;

  return (
    <View
      style={[
        {
          backgroundColor: badgeColor,
          minWidth,
          height: badgeSize,
          borderRadius: theme.borderRadius.round,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: isWide ? theme.spacing.xs : 0,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize,
          fontWeight: theme.typography.weights.bold,
          fontFamily: theme.typography.fontFamily,
          textAlign: 'center',
        }}
      >
        {displayCount}
      </Text>
    </View>
  );
}
