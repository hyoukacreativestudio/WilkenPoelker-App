import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
  variant = 'filled',
  color,
  size = 'medium',
}) {
  const { theme, isDark } = useTheme();

  const chipColor = color || theme.colors.primary;
  const isSmall = size === 'small';

  const getStyles = () => {
    if (selected) {
      return {
        backgroundColor: chipColor,
        borderColor: chipColor,
        textColor: '#FFFFFF',
      };
    }
    if (variant === 'outlined') {
      return {
        backgroundColor: 'transparent',
        borderColor: chipColor,
        textColor: chipColor,
      };
    }
    // filled but not selected: the brand green is too dark to read on the dark theme
    if (isDark && !color) {
      return {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderColor: 'transparent',
        textColor: theme.colors.text,
      };
    }
    return {
      backgroundColor: chipColor + '15',
      borderColor: 'transparent',
      textColor: chipColor,
    };
  };

  const styles = getStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: styles.backgroundColor,
        borderWidth: variant === 'outlined' ? 1 : 0,
        borderColor: styles.borderColor,
        borderRadius: theme.borderRadius.round,
        paddingVertical: isSmall ? theme.spacing.xs : theme.spacing.xs + 2,
        paddingHorizontal: isSmall ? theme.spacing.sm : theme.spacing.md,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? (
        <View style={{ marginRight: theme.spacing.xs }}>{icon}</View>
      ) : null}

      <Text
        style={[
          isSmall ? theme.typography.styles.caption : theme.typography.styles.bodySmall,
          {
            color: styles.textColor,
            fontWeight: selected
              ? theme.typography.weights.semiBold
              : theme.typography.weights.regular,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
