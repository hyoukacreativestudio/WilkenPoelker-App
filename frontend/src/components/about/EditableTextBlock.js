import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function EditableTextBlock({
  value,
  onSave,
  isEditMode,
  style,
  multiline = false,
  placeholder,
}) {
  const { theme } = useTheme();
  const s = styles(theme);
  const [text, setText] = useState(value || '');

  useEffect(() => {
    setText(value || '');
  }, [value]);

  const handleBlur = () => {
    if (text !== value) {
      onSave(text);
    }
  };

  if (!isEditMode) {
    return <Text style={style}>{value}</Text>;
  }

  return (
    <View style={s.editWrapper}>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          style,
          s.input,
          multiline && s.multilineInput,
        ]}
      />
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    editWrapper: {
      position: 'relative',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.inputBackground,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      color: theme.colors.text,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });
