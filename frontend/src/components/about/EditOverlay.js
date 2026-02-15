import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export default function EditOverlay({
  isEditMode,
  onEdit,
  children,
  style,
}) {
  const { theme } = useTheme();
  const s = styles(theme);

  if (!isEditMode) {
    return <View style={style}>{children}</View>;
  }

  return (
    <TouchableOpacity
      onPress={onEdit}
      activeOpacity={0.7}
      style={[s.editContainer, style]}
    >
      {children}
      <View style={s.pencilBadge}>
        <MaterialCommunityIcons
          name="pencil"
          size={14}
          color={theme.colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    editContainer: {
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: theme.colors.primary + '50',
      borderRadius: theme.borderRadius.md,
      position: 'relative',
    },
    pencilBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.round,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      ...theme.shadows.sm,
    },
  });
