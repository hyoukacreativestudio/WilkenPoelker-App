import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useOffline } from '../../hooks/useOffline';

export default function OfflineBanner() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isOnline, showBanner } = useOffline();

  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (showBanner || !isOnline) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showBanner, isOnline]);

  const backgroundColor = isOnline ? theme.colors.success : theme.colors.warning;
  const message = isOnline
    ? t('common.backOnline')
    : t('common.noInternetConnection');
  const iconName = isOnline ? 'wifi' : 'wifi-off';

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={18}
          color="#FFFFFF"
          style={{ marginRight: theme.spacing.xs }}
        />
        <Text
          style={[
            theme.typography.styles.bodySmall,
            {
              color: '#FFFFFF',
              fontWeight: theme.typography.weights.medium,
            },
          ]}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
