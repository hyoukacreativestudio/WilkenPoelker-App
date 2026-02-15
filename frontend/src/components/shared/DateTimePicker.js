import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

export default function DateTimePicker({
  value,
  onChange,
  mode = 'date',
  label,
  minimumDate,
  maximumDate,
  style,
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState(mode === 'datetime' ? 'date' : mode);

  const currentValue = value || new Date();
  const locale = i18n.language || 'de';

  const formatDisplayValue = () => {
    if (!value) {
      return t('datePicker.select', 'Select...');
    }

    try {
      if (mode === 'date') {
        return value.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      if (mode === 'time') {
        return value.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      // datetime
      return value.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value.toString();
    }
  };

  const getIcon = () => {
    if (mode === 'time') return 'clock-outline';
    return 'calendar-outline';
  };

  const handlePress = () => {
    if (mode === 'datetime') {
      setPickerMode('date');
    } else {
      setPickerMode(mode);
    }
    setShowPicker(true);
  };

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    if (selectedDate) {
      if (mode === 'datetime' && pickerMode === 'date') {
        // After selecting date, show time picker
        if (onChange) {
          onChange(selectedDate);
        }
        if (Platform.OS === 'android') {
          setTimeout(() => {
            setPickerMode('time');
            setShowPicker(true);
          }, 100);
        } else {
          setPickerMode('time');
        }
        return;
      }

      if (onChange) {
        onChange(selectedDate);
      }

      if (Platform.OS === 'ios' && mode !== 'datetime') {
        // iOS keeps the picker open; user can dismiss manually
      } else {
        setShowPicker(false);
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.xs,
              ...theme.typography.styles.caption,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={getIcon()}
          size={20}
          color={theme.colors.textSecondary}
          style={{ marginRight: theme.spacing.sm }}
        />
        <Text
          style={[
            styles.valueText,
            {
              color: value ? theme.colors.text : theme.colors.placeholder,
              ...theme.typography.styles.body,
            },
          ]}
        >
          {formatDisplayValue()}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <RNDateTimePicker
          value={currentValue}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          locale={locale}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  valueText: {
    flex: 1,
  },
});
