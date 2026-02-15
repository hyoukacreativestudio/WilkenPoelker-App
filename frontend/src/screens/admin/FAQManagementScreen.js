import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { faqApi } from '../../api/faq';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import { useToast } from '../../components/ui/Toast';

const FAQ_CATEGORIES = ['general', 'bike', 'cleaning', 'motor', 'service'];

const CATEGORY_ICONS = {
  general: 'help-circle-outline',
  bike: 'bicycle',
  cleaning: 'spray-bottle',
  motor: 'engine',
  service: 'wrench',
};

const CATEGORY_COLORS = {
  general: '#607D8B',
  bike: '#2196F3',
  cleaning: '#00BCD4',
  motor: '#FF9800',
  service: '#9C27B0',
};

export default function FAQManagementScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  // Form state
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formOrder, setFormOrder] = useState('0');

  // Filter state
  const [filterCategory, setFilterCategory] = useState(null);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const data = await faqApi.getAllFAQs();
      setFaqs(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast({ type: 'error', message: t('faq.fetchError', 'Fehler beim Laden der FAQs') });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await faqApi.getAllFAQs();
      setFaqs(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast({ type: 'error', message: t('faq.fetchError', 'Fehler beim Laden der FAQs') });
    } finally {
      setRefreshing(false);
    }
  }, [showToast, t]);

  const openCreateModal = () => {
    setEditingFaq(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('general');
    setFormOrder('0');
    setModalVisible(true);
  };

  const openEditModal = (faq) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question || '');
    setFormAnswer(faq.answer || '');
    setFormCategory(faq.category || 'general');
    setFormOrder(String(faq.order ?? 0));
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingFaq(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('general');
    setFormOrder('0');
  };

  const handleSave = async () => {
    if (!formQuestion.trim()) {
      showToast({ type: 'error', message: t('faq.questionRequired', 'Frage ist erforderlich') });
      return;
    }
    if (!formAnswer.trim()) {
      showToast({ type: 'error', message: t('faq.answerRequired', 'Antwort ist erforderlich') });
      return;
    }

    const payload = {
      question: formQuestion.trim(),
      answer: formAnswer.trim(),
      category: formCategory,
      order: parseInt(formOrder, 10) || 0,
    };

    try {
      setSaving(true);
      if (editingFaq) {
        const updated = await faqApi.updateFAQ(editingFaq.id, payload);
        setFaqs((prev) =>
          prev.map((f) => (f.id === editingFaq.id ? updated : f))
        );
        showToast({ type: 'success', message: t('faq.updateSuccess', 'FAQ aktualisiert') });
      } else {
        const created = await faqApi.createFAQ(payload);
        setFaqs((prev) => [created, ...prev]);
        showToast({ type: 'success', message: t('faq.createSuccess', 'FAQ erstellt') });
      }
      closeModal();
    } catch (error) {
      showToast({
        type: 'error',
        message: editingFaq
          ? t('faq.updateError', 'Fehler beim Aktualisieren')
          : t('faq.createError', 'Fehler beim Erstellen'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (faq) => {
    try {
      const updated = await faqApi.updateFAQ(faq.id, { isActive: !faq.isActive });
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? updated : f))
      );
      showToast({
        type: 'success',
        message: updated.isActive
          ? t('faq.activated', 'FAQ aktiviert')
          : t('faq.deactivated', 'FAQ deaktiviert'),
      });
    } catch (error) {
      showToast({ type: 'error', message: t('faq.toggleError', 'Fehler beim Umschalten') });
    }
  };

  const handleDelete = (faq) => {
    Alert.alert(
      t('faq.deleteTitle', 'FAQ loeschen'),
      t('faq.deleteConfirm', 'Moechten Sie diese FAQ wirklich loeschen?'),
      [
        { text: t('common.cancel', 'Abbrechen'), style: 'cancel' },
        {
          text: t('common.delete', 'Loeschen'),
          style: 'destructive',
          onPress: async () => {
            try {
              await faqApi.deleteFAQ(faq.id);
              setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
              showToast({ type: 'success', message: t('faq.deleteSuccess', 'FAQ geloescht') });
            } catch (error) {
              showToast({ type: 'error', message: t('faq.deleteError', 'Fehler beim Loeschen') });
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
  };

  const getCategoryIcon = (category) => {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS.general;
  };

  const getCategoryLabel = (category) => {
    return t(`faq.category_${category}`, category.charAt(0).toUpperCase() + category.slice(1));
  };

  const filteredFaqs = filterCategory
    ? faqs.filter((f) => f.category === filterCategory)
    : faqs;

  const s = styles(theme);

  const renderFAQItem = ({ item }) => {
    const catColor = getCategoryColor(item.category);
    const answerPreview =
      item.answer && item.answer.length > 120
        ? item.answer.substring(0, 120) + '...'
        : item.answer;

    return (
      <Card style={[s.faqCard, !item.isActive && s.faqCardInactive]}>
        {/* Header row: category tag + active toggle */}
        <View style={s.faqHeader}>
          <View style={[s.categoryTag, { backgroundColor: catColor + '20' }]}>
            <MaterialCommunityIcons
              name={getCategoryIcon(item.category)}
              size={14}
              color={catColor}
            />
            <Text style={[s.categoryTagText, { color: catColor }]}>
              {getCategoryLabel(item.category)}
            </Text>
          </View>
          <View style={s.activeToggleRow}>
            <Text
              style={[
                theme.typography.styles.caption,
                {
                  color: item.isActive ? theme.colors.success : theme.colors.textTertiary,
                  marginRight: theme.spacing.xs,
                },
              ]}
            >
              {item.isActive
                ? t('faq.active', 'Aktiv')
                : t('faq.inactive', 'Inaktiv')}
            </Text>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{ false: theme.colors.border, true: theme.colors.success + '60' }}
              thumbColor={item.isActive ? theme.colors.success : theme.colors.textTertiary}
            />
          </View>
        </View>

        {/* Question */}
        <Text style={s.questionText} numberOfLines={3}>
          {item.question}
        </Text>

        {/* Answer preview */}
        <Text style={s.answerPreview} numberOfLines={3}>
          {answerPreview}
        </Text>

        {/* Order indicator */}
        {item.order > 0 ? (
          <View style={s.orderRow}>
            <MaterialCommunityIcons
              name="sort-numeric-ascending"
              size={14}
              color={theme.colors.textTertiary}
            />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginLeft: 4 }]}>
              {t('faq.order', 'Reihenfolge')}: {item.order}
            </Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.colors.primary + '15' }]}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={[s.actionButtonText, { color: theme.colors.primary }]}>
              {t('common.edit', 'Bearbeiten')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.colors.error + '15' }]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={18}
              color={theme.colors.error}
            />
            <Text style={[s.actionButtonText, { color: theme.colors.error }]}>
              {t('common.delete', 'Loeschen')}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderEmptyList = () => (
    <View style={s.emptyContainer}>
      <MaterialCommunityIcons
        name="frequently-asked-questions"
        size={64}
        color={theme.colors.textTertiary}
      />
      <Text style={s.emptyTitle}>
        {t('faq.noFaqs', 'Keine FAQs vorhanden')}
      </Text>
      <Text style={s.emptySubtitle}>
        {t('faq.noFaqsSubtitle', 'Erstellen Sie Ihre erste FAQ')}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={s.headerContainer}>
      {/* Title row */}
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>
          {t('faq.manageFaqs', 'FAQ Verwaltung')}
        </Text>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{filteredFaqs.length}</Text>
        </View>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipScrollContent}
        style={s.chipScroll}
      >
        <Chip
          label={t('faq.allCategories', 'Alle')}
          selected={filterCategory === null}
          onPress={() => setFilterCategory(null)}
          variant="outlined"
          size="small"
        />
        {FAQ_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={getCategoryLabel(cat)}
            selected={filterCategory === cat}
            onPress={() => setFilterCategory(filterCategory === cat ? null : cat)}
            variant="outlined"
            size="small"
            color={getCategoryColor(cat)}
            icon={
              <MaterialCommunityIcons
                name={getCategoryIcon(cat)}
                size={14}
                color={
                  filterCategory === cat
                    ? '#FFFFFF'
                    : getCategoryColor(cat)
                }
              />
            }
          />
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            {t('common.loading', 'Laden...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={filteredFaqs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFAQItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreateModal}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={s.modalOverlay} onPress={closeModal}>
          <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal title */}
              <Text style={s.modalTitle}>
                {editingFaq
                  ? t('faq.editFaq', 'FAQ bearbeiten')
                  : t('faq.addFaq', 'FAQ hinzufuegen')}
              </Text>

              <View style={{ height: theme.spacing.md }} />

              {/* Question input */}
              <Input
                label={t('faq.questionLabel', 'Frage')}
                value={formQuestion}
                onChangeText={setFormQuestion}
                placeholder={t('faq.questionPlaceholder', 'Geben Sie die Frage ein...')}
                maxLength={500}
              />

              {/* Answer input */}
              <Input
                label={t('faq.answerLabel', 'Antwort')}
                value={formAnswer}
                onChangeText={setFormAnswer}
                placeholder={t('faq.answerPlaceholder', 'Geben Sie die Antwort ein...')}
                multiline
              />

              {/* Category selection */}
              <Text style={s.formLabel}>
                {t('faq.categoryLabel', 'Kategorie')}
              </Text>
              <View style={s.categoryChipRow}>
                {FAQ_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={getCategoryLabel(cat)}
                    selected={formCategory === cat}
                    onPress={() => setFormCategory(cat)}
                    variant="outlined"
                    size="small"
                    color={getCategoryColor(cat)}
                    icon={
                      <MaterialCommunityIcons
                        name={getCategoryIcon(cat)}
                        size={14}
                        color={
                          formCategory === cat
                            ? '#FFFFFF'
                            : getCategoryColor(cat)
                        }
                      />
                    }
                  />
                ))}
              </View>

              {/* Order input */}
              <Input
                label={t('faq.orderLabel', 'Reihenfolge (0 = Standard)')}
                value={formOrder}
                onChangeText={setFormOrder}
                placeholder="0"
                keyboardType="numeric"
              />

              {/* Action buttons */}
              <View style={{ height: theme.spacing.sm }} />
              <Button
                title={
                  editingFaq
                    ? t('common.save', 'Speichern')
                    : t('faq.createButton', 'FAQ erstellen')
                }
                onPress={handleSave}
                loading={saving}
                fullWidth
                icon={
                  <MaterialCommunityIcons
                    name={editingFaq ? 'content-save' : 'plus-circle'}
                    size={18}
                    color="#FFFFFF"
                  />
                }
              />
              <View style={{ height: theme.spacing.xs }} />
              <TouchableOpacity
                style={s.modalCancel}
                onPress={closeModal}
              >
                <Text
                  style={[
                    theme.typography.styles.body,
                    { color: theme.colors.textSecondary, textAlign: 'center' },
                  ]}
                >
                  {t('common.cancel', 'Abbrechen')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xxl + 60,
    },
    headerContainer: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    screenTitle: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    countBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
    },
    countBadgeText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.small,
      fontWeight: theme.typography.weights.bold,
      fontFamily: theme.typography.fontFamily,
    },
    chipScroll: {
      marginBottom: theme.spacing.xs,
    },
    chipScrollContent: {
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.md,
    },
    faqCard: {
      marginBottom: theme.spacing.sm,
    },
    faqCardInactive: {
      opacity: 0.6,
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    categoryTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    categoryTagText: {
      ...theme.typography.styles.caption,
      fontWeight: theme.typography.weights.semiBold,
      marginLeft: 4,
    },
    activeToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    questionText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
      marginBottom: theme.spacing.xs,
    },
    answerPreview: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      lineHeight: 20,
    },
    orderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    actionButtonText: {
      ...theme.typography.styles.caption,
      fontWeight: theme.typography.weights.semiBold,
      marginLeft: 4,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
    },
    emptySubtitle: {
      ...theme.typography.styles.body,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.xl,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.md,
      elevation: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 440,
      maxHeight: '85%',
    },
    modalTitle: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    formLabel: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
      marginBottom: theme.spacing.xs,
    },
    categoryChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    modalCancel: {
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.spacing.xs,
    },
  });
