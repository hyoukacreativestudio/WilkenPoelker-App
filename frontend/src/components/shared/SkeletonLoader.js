import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function SkeletonLoader({ width, height, borderRadius, style }) {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const resolvedBorderRadius = borderRadius !== undefined ? borderRadius : theme.borderRadius.md;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.skeleton, theme.colors.skeletonHighlight],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: resolvedBorderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}
