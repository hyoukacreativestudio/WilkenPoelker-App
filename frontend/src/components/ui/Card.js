import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function Card({
  children,
  onPress,
  style,
  variant = 'default',
}) {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.card,
          ...theme.shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'default':
      default:
        return {
          backgroundColor: theme.colors.surface,
          ...theme.shadows.sm,
        };
    }
  };

  const cardStyle = [
    {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      overflow: 'hidden',
    },
    getVariantStyles(),
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
