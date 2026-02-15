import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const FAB_SIZE = 56;

export default function FloatingActionButton({ icon, onPress, color, style }) {
  const { theme } = useTheme();

  const backgroundColor = color || theme.colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor,
          borderRadius: FAB_SIZE / 2,
          ...Platform.select({
            ios: {
              shadowColor: backgroundColor,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
            },
            android: { elevation: 10 },
          }),
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <MaterialCommunityIcons
        name={icon}
        size={26}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
