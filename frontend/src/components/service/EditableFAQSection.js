import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useFAQs } from '../../hooks/useFAQs';
import AccordionSection from '../shared/AccordionSection';
import Card from '../ui/Card';

// Cross-platform confirm dialog
function confirmAction(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

/**
 * Self-contained FAQ section that loads FAQs from DB and provides inline editing.
 * Shows a pencil toggle if the user has permission to edit FAQs in this category.
 *
 * @param {string} category - FAQ category ('bike', 'cleaning', 'motor', 'service', 'general')
 * @param {string} title - Section title (optional, defaults to i18n key)
 * @param {object} style - Container style
 */
export default function EditableFAQSection({ category, title, style }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    faqs,
    loading,
    saving,
    canEdit,
    createFAQ,
    updateFAQ,
    deleteFAQ,
  } = useFAQs(category);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null); // { id, question, answer } or { isNew: true, question, answer }
  const s = styles(theme);

  const sectionTitle = title || t('service.faqTitle');

  const handleToggleEdit = useCallback(() => {
    setIsEditMode((prev) => !prev);
    setEditingFAQ(null);
  }, []);

  const handleStartCreate = useCallback(() => {
    setEditingFAQ({ isNew: true, question: '', answer: '' });
  }, []);

  const handleStartEdit = useCallback((faq) => {
    setEditingFAQ({ id: faq.id, question: faq.question, answer: faq.answer });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingFAQ(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingFAQ) return;
    if (!editingFAQ.question.trim() || !editingFAQ.answer.trim()) return;

    if (editingFAQ.isNew) {
      await createFAQ({
        question: editingFAQ.question.trim(),
        answer: editingFAQ.answer.trim(),
      });
    } else {
      await updateFAQ(editingFAQ.id, {
        question: editingFAQ.question.trim(),
        answer: editingFAQ.answer.trim(),
      });
    }
    setEditingFAQ(null);
  }, [editingFAQ, createFAQ, updateFAQ]);

  const handleDelete = useCallback((faq) => {
    confirmAction(
      t('faq.deleteFAQ', 'FAQ löschen'),
      t('faq.confirmDelete', 'Diese FAQ wirklich löschen?'),
      () => deleteFAQ(faq.id)
    );
  }, [deleteFAQ, t]);

  // Loading state
  if (loading) {
    return (
      <View style={[s.container, style]}>
        <View style={s.headerRow}>
          <Text style={s.sectionTitle}>{sectionTitle}</Text>
        </View>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  // No FAQs and not in edit mode
  if (faqs.length === 0 && !isEditMode) {
    return canEdit ? (
      <View style={[s.container, style]}>
        <View style={s.headerRow}>
          <Text style={s.sectionTitle}>{sectionTitle}</Text>
          <TouchableOpacity
            onPress={handleToggleEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>{t('faq.noFAQs', 'Keine FAQs vorhanden')}</Text>
        </View>
      </View>
    ) : null;
  }

  return (
    <View style={[s.container, style]}>
      {/* Header with pencil toggle */}
      <View style={s.headerRow}>
        <Text style={s.sectionTitle}>{sectionTitle}</Text>
        {canEdit && (
          <TouchableOpacity
            onPress={handleToggleEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={isEditMode ? 'pencil' : 'pencil-outline'}
              size={20}
              color={isEditMode ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* FAQ List */}
      <Card style={s.card}>
        {faqs.map((faq, index) => (
          <View key={faq.id}>
            {/* Is this FAQ being edited? */}
            {editingFAQ && editingFAQ.id === faq.id ? (
              <View style={s.editForm}>
                <TextInput
                  style={s.editInput}
                  value={editingFAQ.question}
                  onChangeText={(text) => setEditingFAQ((prev) => ({ ...prev, question: text }))}
                  placeholder={t('faq.question', 'Frage')}
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                />
                <TextInput
                  style={[s.editInput, s.editInputAnswer]}
                  value={editingFAQ.answer}
                  onChangeText={(text) => setEditingFAQ((prev) => ({ ...prev, answer: text }))}
                  placeholder={t('faq.answer', 'Antwort')}
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                />
                <View style={s.editActions}>
                  <TouchableOpacity onPress={handleCancelEdit} style={s.editActionBtn}>
                    <Text style={[s.editActionText, { color: theme.colors.textSecondary }]}>
                      {t('common.cancel', 'Abbrechen')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={[s.editActionBtn, s.editActionBtnPrimary]}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[s.editActionText, { color: '#fff' }]}>
                        {t('common.save', 'Speichern')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <AccordionSection
                  title={
                    <Text
                      style={[
                        theme.typography.styles.body,
                        { color: theme.colors.text, fontWeight: theme.typography.weights.bold, flex: 1 },
                      ]}
                    >
                      {faq.question}
                    </Text>
                  }
                  style={
                    index < faqs.length - 1 || isEditMode
                      ? { borderBottomWidth: 1, borderBottomColor: theme.colors.divider }
                      : undefined
                  }
                >
                  <Text
                    style={[
                      theme.typography.styles.body,
                      { color: theme.colors.textSecondary, paddingBottom: theme.spacing.md },
                    ]}
                  >
                    {faq.answer}
                  </Text>

                  {/* Edit/Delete buttons inside the expanded accordion */}
                  {isEditMode && (
                    <View style={s.faqItemActions}>
                      <TouchableOpacity
                        onPress={() => handleStartEdit(faq)}
                        style={s.faqActionBtn}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.colors.primary} />
                        <Text style={[s.faqActionText, { color: theme.colors.primary }]}>
                          {t('common.edit', 'Bearbeiten')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(faq)}
                        style={s.faqActionBtn}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.colors.error} />
                        <Text style={[s.faqActionText, { color: theme.colors.error }]}>
                          {t('common.delete', 'Löschen')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </AccordionSection>
              </View>
            )}
          </View>
        ))}

        {/* New FAQ form (inline at bottom) */}
        {editingFAQ && editingFAQ.isNew && (
          <View style={s.editForm}>
            <TextInput
              style={s.editInput}
              value={editingFAQ.question}
              onChangeText={(text) => setEditingFAQ((prev) => ({ ...prev, question: text }))}
              placeholder={t('faq.question', 'Frage')}
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              autoFocus
            />
            <TextInput
              style={[s.editInput, s.editInputAnswer]}
              value={editingFAQ.answer}
              onChangeText={(text) => setEditingFAQ((prev) => ({ ...prev, answer: text }))}
              placeholder={t('faq.answer', 'Antwort')}
              placeholderTextColor={theme.colors.textTertiary}
              multiline
            />
            <View style={s.editActions}>
              <TouchableOpacity onPress={handleCancelEdit} style={s.editActionBtn}>
                <Text style={[s.editActionText, { color: theme.colors.textSecondary }]}>
                  {t('common.cancel', 'Abbrechen')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[s.editActionBtn, s.editActionBtnPrimary]}
                disabled={saving || !editingFAQ.question.trim() || !editingFAQ.answer.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[s.editActionText, { color: '#fff' }]}>
                    {t('faq.addFAQ', 'FAQ hinzufügen')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add FAQ button */}
        {isEditMode && !editingFAQ && (
          <TouchableOpacity onPress={handleStartCreate} style={s.addButton} activeOpacity={0.7}>
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
            <Text style={s.addButtonText}>{t('faq.addFAQ', 'FAQ hinzufügen')}</Text>
          </TouchableOpacity>
        )}
      </Card>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      marginTop: theme.spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    card: {
      marginHorizontal: theme.spacing.md,
      padding: 0,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
    },
    emptyText: {
      ...theme.typography.styles.body,
      color: theme.colors.textTertiary,
    },
    editForm: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    editInput: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      minHeight: 40,
    },
    editInputAnswer: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    editActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    editActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    editActionBtnPrimary: {
      backgroundColor: theme.colors.primary,
    },
    editActionText: {
      ...theme.typography.styles.bodySmall,
      fontWeight: theme.typography.weights.medium,
    },
    faqItemActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    faqActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    faqActionText: {
      ...theme.typography.styles.bodySmall,
      fontWeight: theme.typography.weights.medium,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    addButtonText: {
      ...theme.typography.styles.body,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
    },
  });
