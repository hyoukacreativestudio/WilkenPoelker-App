import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

export default function SearchBar({
  value,
  onChangeText,
  placeholder,
  onClear,
  autoFocus = false,
  style,
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const displayPlaceholder = placeholder || t('common.search');
  const hasValue = value && value.length > 0;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.round,
          paddingHorizontal: theme.spacing.sm,
          height: 44,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={22}
        color={theme.colors.textTertiary}
        style={{ marginRight: theme.spacing.xs }}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={displayPlaceholder}
        placeholderTextColor={theme.colors.placeholder}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        style={[
          theme.typography.styles.body,
          {
            flex: 1,
            color: theme.colors.text,
            paddingVertical: 0,
          },
        ]}
      />

      {hasValue ? (
        <TouchableOpacity
          onPress={() => {
            if (onClear) onClear();
            else if (onChangeText) onChangeText('');
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={20}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
