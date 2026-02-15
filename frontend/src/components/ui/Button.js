import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  Animated,
  Pressable,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const SIZES = {
  small: { paddingVertical: 'xs', paddingHorizontal: 'sm', textStyle: 'buttonSmall' },
  medium: { paddingVertical: 'sm', paddingHorizontal: 'md', textStyle: 'button' },
  large: { paddingVertical: 'md', paddingHorizontal: 'lg', textStyle: 'button' },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const sizeConfig = SIZES[size] || SIZES.medium;

  const getBackgroundColor = () => {
    if (variant === 'primary') return theme.colors.primary;
    if (variant === 'danger') return theme.colors.error;
    if (variant === 'secondary') return 'transparent';
    if (variant === 'ghost') return 'transparent';
    return theme.colors.primary;
  };

  const getBorderColor = () => {
    if (variant === 'secondary') return theme.colors.primary;
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'primary') return '#FFFFFF';
    if (variant === 'danger') return '#FFFFFF';
    if (variant === 'secondary') return theme.colors.primary;
    if (variant === 'ghost') return theme.colors.primary;
    return '#FFFFFF';
  };

  const backgroundColor = getBackgroundColor();
  const borderColor = getBorderColor();
  const textColor = getTextColor();
  const textStyle = theme.typography.styles[sizeConfig.textStyle];

  const containerStyle = [
    {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing[sizeConfig.paddingVertical],
      paddingHorizontal: theme.spacing[sizeConfig.paddingHorizontal],
      borderWidth: variant === 'secondary' ? 1.5 : 0,
      borderColor,
      opacity: disabled ? 0.5 : 1,
    },
    fullWidth && { width: '100%' },
    style,
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={containerStyle}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={textColor}
            style={{ marginRight: title ? theme.spacing.xs : 0 }}
          />
        ) : icon ? (
          <View style={{ marginRight: title ? theme.spacing.xs : 0 }}>
            {icon}
          </View>
        ) : null}
        {title ? (
          <Text style={[textStyle, { color: textColor, textAlign: 'center' }]}>
            {title}
          </Text>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}
