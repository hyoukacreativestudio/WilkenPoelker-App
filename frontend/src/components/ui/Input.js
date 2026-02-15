import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  multiline = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  maxLength,
  keyboardType,
  autoCapitalize,
  style,
}) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : isFocused
    ? theme.colors.primary
    : theme.colors.border;

  return (
    <View style={[{ marginBottom: theme.spacing.md }, style]}>
      {label ? (
        <Text
          style={[
            theme.typography.styles.bodySmall,
            {
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.xs,
              fontWeight: theme.typography.weights.medium,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.inputBackground,
          borderWidth: 1,
          borderColor,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.sm,
          minHeight: multiline ? 100 : 48,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {leftIcon ? (
          <View style={{ marginRight: theme.spacing.xs }}>{leftIcon}</View>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={!disabled}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            theme.typography.styles.body,
            {
              flex: 1,
              color: theme.colors.text,
              paddingVertical: theme.spacing.sm,
            },
          ]}
        />

        {rightIcon ? (
          typeof rightIcon === 'string' ? (
            <TouchableOpacity
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: theme.spacing.xs, marginLeft: theme.spacing.xs }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={rightIcon}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ marginLeft: theme.spacing.xs }}>{rightIcon}</View>
          )
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: theme.spacing.xs,
        }}
      >
        {error ? (
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.error, flex: 1 },
            ]}
          >
            {error}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {maxLength ? (
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textTertiary },
            ]}
          >
            {(value || '').length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
