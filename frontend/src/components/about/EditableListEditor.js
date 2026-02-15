import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

// Cross-platform confirm dialog
function confirmDelete(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function EditableListEditor({
  items = [],
  onSave,
  isEditMode,
  itemType = 'string',
  objectFields = [],
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = styles(theme);

  if (!isEditMode) {
    return null;
  }

  const updateItem = (index, fieldKeyOrValue, value) => {
    const newItems = [...items];
    if (itemType === 'string') {
      newItems[index] = fieldKeyOrValue;
    } else {
      newItems[index] = { ...newItems[index], [fieldKeyOrValue]: value };
    }
    onSave(newItems);
  };

  const deleteItem = (index) => {
    const itemLabel =
      itemType === 'string'
        ? items[index] || 'Eintrag'
        : items[index]?.label || items[index]?.title || items[index]?.text || 'Eintrag';
    confirmDelete(
      t('aboutUs.edit.deleteConfirmTitle', 'Eintrag entfernen'),
      t('aboutUs.edit.deleteConfirmMsg', '"{{name}}" wirklich entfernen?', { name: itemLabel }),
      () => {
        const newItems = items.filter((_, i) => i !== index);
        onSave(newItems);
      }
    );
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    onSave(newItems);
  };

  const addItem = () => {
    const newItems = [...items];
    if (itemType === 'string') {
      newItems.push('');
    } else {
      const newObj = {};
      objectFields.forEach((field) => {
        newObj[field.key] = '';
      });
      newItems.push(newObj);
    }
    onSave(newItems);
  };

  return (
    <View style={s.container}>
      {items.map((item, index) => (
        <View key={index} style={s.itemRow}>
          <View style={s.fieldsContainer}>
            {itemType === 'string' ? (
              <TextInput
                value={item}
                onChangeText={(text) => updateItem(index, text)}
                placeholder={t('common.enterValue', 'Wert eingeben')}
                placeholderTextColor={theme.colors.placeholder}
                style={s.input}
              />
            ) : (
              objectFields.map((field) => (
                <TextInput
                  key={field.key}
                  value={item[field.key] || ''}
                  onChangeText={(text) => updateItem(index, field.key, text)}
                  placeholder={field.placeholder || field.key}
                  placeholderTextColor={theme.colors.placeholder}
                  style={[s.input, s.objectFieldInput]}
                />
              ))
            )}
          </View>

          <View style={s.actions}>
            <TouchableOpacity
              onPress={() => moveItem(index, -1)}
              disabled={index === 0}
              style={[s.actionBtn, index === 0 && s.actionBtnDisabled]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons
                name="chevron-up"
                size={18}
                color={index === 0 ? theme.colors.textTertiary : theme.colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => moveItem(index, 1)}
              disabled={index === items.length - 1}
              style={[s.actionBtn, index === items.length - 1 && s.actionBtnDisabled]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={
                  index === items.length - 1
                    ? theme.colors.textTertiary
                    : theme.colors.textSecondary
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deleteItem(index)}
              style={s.deleteBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity onPress={addItem} style={s.addButton} activeOpacity={0.7}>
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={20}
          color={theme.colors.primary}
        />
        <Text style={s.addButtonText}>
          {t('aboutUs.edit.addEntry', 'Hinzufügen')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      marginTop: theme.spacing.sm,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xs,
    },
    fieldsContainer: {
      flex: 1,
    },
    input: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    objectFieldInput: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    actionBtn: {
      padding: theme.spacing.xs,
    },
    actionBtnDisabled: {
      opacity: 0.4,
    },
    deleteBtn: {
      padding: theme.spacing.xs,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: theme.colors.error + '10',
    },
    addButton: {
      flexDirection: 'row',
      alignSelf: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: 44,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      gap: 6,
    },
    addButtonText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
    },
  });
