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
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { settingsApi } from '../../api/settings';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

/**
 * Format a date string (YYYY-MM-DD) to German format (DD.MM.YYYY).
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function ClosedDaysScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isAdmin = user && ['admin', 'super_admin'].includes(user.role);

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [isRange, setIsRange] = useState(false);
  const [formName, setFormName] = useState('');
  const [formIsClosed, setFormIsClosed] = useState(true);
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formOpenTime, setFormOpenTime] = useState('08:00');
  const [formCloseTime, setFormCloseTime] = useState('12:00');

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getHolidays();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast({ type: 'error', message: t('closedDays.fetchError', 'Fehler beim Laden') });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await settingsApi.getHolidays();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast({ type: 'error', message: t('closedDays.fetchError', 'Fehler beim Laden') });
    } finally {
      setRefreshing(false);
    }
  }, [showToast, t]);

  const openCreateModal = () => {
    if (!isAdmin) {
      showToast({ type: 'error', message: t('closedDays.adminOnly', 'Nur Admins können geschlossene Tage verwalten') });
      return;
    }
    setFormDate('');
    setFormEndDate('');
    setIsRange(false);
    setFormName('');
    setFormIsClosed(true);
    setFormIsRecurring(false);
    setFormOpenTime('08:00');
    setFormCloseTime('12:00');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  // Generate all dates between start and end (inclusive)
  const getDateRange = (startStr, endStr) => {
    const dates = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleSave = async () => {
    if (!formDate.trim()) {
      showToast({ type: 'error', message: t('closedDays.date', 'Datum') + ' ' + t('common.required', 'erforderlich') });
      return;
    }
    if (!formName.trim()) {
      showToast({ type: 'error', message: t('closedDays.name', 'Bezeichnung') + ' ' + t('common.required', 'erforderlich') });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formDate.trim())) {
      showToast({ type: 'error', message: t('closedDays.datePlaceholder', 'JJJJ-MM-TT') + ' Format' });
      return;
    }

    if (isRange && !formEndDate.trim()) {
      showToast({ type: 'error', message: t('closedDays.endDate', 'Enddatum') + ' ' + t('common.required', 'erforderlich') });
      return;
    }

    if (isRange && !dateRegex.test(formEndDate.trim())) {
      showToast({ type: 'error', message: t('closedDays.datePlaceholder', 'JJJJ-MM-TT') + ' Format' });
      return;
    }

    const specialHours = !formIsClosed ? [{ open: formOpenTime.trim(), close: formCloseTime.trim() }] : undefined;

    try {
      setSaving(true);

      if (isRange) {
        const dates = getDateRange(formDate.trim(), formEndDate.trim());
        if (dates.length === 0) {
          showToast({ type: 'error', message: t('closedDays.invalidRange', 'Ungültiger Zeitraum') });
          return;
        }
        if (dates.length > 60) {
          showToast({ type: 'error', message: t('closedDays.rangeTooLong', 'Maximal 60 Tage') });
          return;
        }

        const created = [];
        for (const date of dates) {
          try {
            const payload = {
              date,
              name: formName.trim(),
              isClosed: formIsClosed,
              isRecurring: formIsRecurring,
            };
            if (specialHours) payload.specialHours = specialHours;
            const result = await settingsApi.addHoliday(payload);
            created.push(result);
          } catch (err) {
            // Skip duplicates silently
          }
        }
        setHolidays((prev) => [...prev, ...created].sort((a, b) => a.date.localeCompare(b.date)));
        showToast({ type: 'success', message: t('closedDays.savedRange', `${created.length} Tage gespeichert`) });
      } else {
        const payload = {
          date: formDate.trim(),
          name: formName.trim(),
          isClosed: formIsClosed,
          isRecurring: formIsRecurring,
        };
        if (specialHours) payload.specialHours = specialHours;
        const result = await settingsApi.addHoliday(payload);
        setHolidays((prev) => [...prev, result].sort((a, b) => a.date.localeCompare(b.date)));
        showToast({ type: 'success', message: t('closedDays.saved', 'Geschlossener Tag gespeichert') });
      }
      closeModal();
    } catch (error) {
      const msg = error?.response?.data?.error || t('closedDays.saveError', 'Fehler beim Speichern');
      showToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (holiday) => {
    const doDelete = async () => {
      try {
        await settingsApi.removeHoliday(holiday.id);
        setHolidays((prev) => prev.filter((h) => h.id !== holiday.id));
        showToast({ type: 'success', message: t('closedDays.deleted', 'Geschlossener Tag gelöscht') });
      } catch (error) {
        showToast({ type: 'error', message: t('closedDays.deleteError', 'Fehler beim Löschen') });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('closedDays.deleteConfirm', 'Diesen geschlossenen Tag wirklich löschen?'))) {
        doDelete();
      }
    } else {
      Alert.alert(
        t('closedDays.deleteTitle', 'Tag löschen'),
        t('closedDays.deleteConfirm', 'Diesen geschlossenen Tag wirklich löschen?'),
        [
          { text: t('common.cancel', 'Abbrechen'), style: 'cancel' },
          { text: t('common.delete', 'Löschen'), style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const s = styles(theme);

  const renderHolidayItem = ({ item }) => {
    const isClosed = item.isClosed !== false;
    const hasSpecialHours = !isClosed && item.specialHours && item.specialHours.length > 0;
    const specialHoursStr = hasSpecialHours
      ? item.specialHours.map((p) => `${p.open} - ${p.close}`).join(', ')
      : '';

    return (
      <Card style={s.card}>
        <View style={s.cardHeader}>
          {/* Date + Name */}
          <View style={{ flex: 1 }}>
            <Text style={s.dateText}>{formatDate(item.date)}</Text>
            <Text style={s.nameText}>{item.name}</Text>
          </View>

          {/* Status badge */}
          <View
            style={[
              s.statusBadge,
              { backgroundColor: isClosed ? theme.colors.error + '15' : theme.colors.warning + '15' },
            ]}
          >
            <MaterialCommunityIcons
              name={isClosed ? 'lock-outline' : 'clock-outline'}
              size={14}
              color={isClosed ? theme.colors.error : theme.colors.warning}
            />
            <Text
              style={[
                s.statusText,
                { color: isClosed ? theme.colors.error : theme.colors.warning },
              ]}
            >
              {isClosed
                ? t('closedDays.closed', 'Geschlossen')
                : t('closedDays.specialHours', 'Sonderöffnungszeiten')}
            </Text>
          </View>
        </View>

        {/* Special hours info */}
        {hasSpecialHours ? (
          <Text style={s.specialHoursText}>{specialHoursStr} Uhr</Text>
        ) : null}

        {/* Tags row */}
        <View style={s.tagsRow}>
          {item.isRecurring ? (
            <View style={[s.tag, { backgroundColor: theme.colors.info + '15' }]}>
              <MaterialCommunityIcons name="refresh" size={12} color={theme.colors.info} />
              <Text style={[s.tagText, { color: theme.colors.info }]}>
                {t('closedDays.recurring', 'Wiederkehrend')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Delete button */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.colors.error + '15' }]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="delete-outline" size={18} color={theme.colors.error} />
            <Text style={[s.actionButtonText, { color: theme.colors.error }]}>
              {t('common.delete', 'Löschen')}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderEmptyList = () => (
    <View style={s.emptyContainer}>
      <MaterialCommunityIcons
        name="calendar-remove-outline"
        size={64}
        color={theme.colors.textTertiary}
      />
      <Text style={s.emptyTitle}>
        {t('closedDays.noClosedDays', 'Keine geschlossenen Tage')}
      </Text>
      <Text style={s.emptySubtitle}>
        {t('closedDays.noClosedDaysSubtitle', 'Fügen Sie geschlossene Tage hinzu')}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={s.headerContainer}>
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>
          {t('closedDays.title', 'Geschlossene Tage')}
        </Text>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{holidays.length}</Text>
        </View>
      </View>
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
        data={holidays}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderHolidayItem}
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

      {/* Floating Add Button (admin only) */}
      {isAdmin && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: theme.colors.primary }]}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Create Modal */}
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
              style={Platform.OS === 'web' ? { overflow: 'visible' } : undefined}
              contentContainerStyle={Platform.OS === 'web' ? { overflow: 'visible' } : undefined}
            >
              {/* Modal title */}
              <Text style={s.modalTitle}>
                {t('closedDays.addClosedDay', 'Geschlossenen Tag hinzufügen')}
              </Text>

              <View style={{ height: theme.spacing.md }} />

              {/* Date Range Toggle */}
              <View style={s.switchRow}>
                <Text style={s.switchLabel}>
                  {t('closedDays.dateRange', 'Zeitraum (von-bis)')}
                </Text>
                <Switch
                  value={isRange}
                  onValueChange={setIsRange}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                  thumbColor={isRange ? theme.colors.primary : theme.colors.textTertiary}
                />
              </View>

              {/* Date input(s) */}
              {Platform.OS === 'web' ? (
                <View style={{ marginBottom: theme.spacing.md, overflow: 'visible', zIndex: 10 }}>
                  <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
                    {isRange ? t('closedDays.startDate', 'Startdatum') : t('closedDays.date', 'Datum')}
                  </Text>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.inputBackground || theme.colors.background,
                      color: theme.colors.text,
                      fontSize: 16,
                    }}
                  />
                  {isRange && (
                    <View style={{ marginTop: theme.spacing.sm }}>
                      <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
                        {t('closedDays.endDate', 'Enddatum')}
                      </Text>
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        min={formDate}
                        style={{
                          width: '100%',
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.inputBackground || theme.colors.background,
                          color: theme.colors.text,
                          fontSize: 16,
                        }}
                      />
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <Input
                    label={isRange ? t('closedDays.startDate', 'Startdatum') : t('closedDays.date', 'Datum')}
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder={t('closedDays.datePlaceholder', 'JJJJ-MM-TT')}
                    maxLength={10}
                  />
                  {isRange && (
                    <Input
                      label={t('closedDays.endDate', 'Enddatum')}
                      value={formEndDate}
                      onChangeText={setFormEndDate}
                      placeholder={t('closedDays.datePlaceholder', 'JJJJ-MM-TT')}
                      maxLength={10}
                    />
                  )}
                </View>
              )}

              {/* Name input */}
              <Input
                label={t('closedDays.name', 'Bezeichnung')}
                value={formName}
                onChangeText={setFormName}
                placeholder={t('closedDays.namePlaceholder', 'z.B. Betriebsurlaub')}
                maxLength={100}
              />

              {/* Is Closed switch */}
              <View style={s.switchRow}>
                <Text style={s.switchLabel}>
                  {t('closedDays.isClosed', 'Ganztägig geschlossen')}
                </Text>
                <Switch
                  value={formIsClosed}
                  onValueChange={setFormIsClosed}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                  thumbColor={formIsClosed ? theme.colors.primary : theme.colors.textTertiary}
                />
              </View>

              {/* Special hours inputs (only when not fully closed) */}
              {!formIsClosed ? (
                <View style={s.specialHoursForm}>
                  <Text style={s.formLabel}>
                    {t('closedDays.specialHours', 'Sonderöffnungszeiten')}
                  </Text>
                  <View style={s.timeRow}>
                    <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                      <Input
                        label={t('closedDays.openTime', 'Öffnung')}
                        value={formOpenTime}
                        onChangeText={setFormOpenTime}
                        placeholder="08:00"
                        maxLength={5}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label={t('closedDays.closeTime', 'Schließung')}
                        value={formCloseTime}
                        onChangeText={setFormCloseTime}
                        placeholder="12:00"
                        maxLength={5}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Is Recurring switch */}
              <View style={s.switchRow}>
                <Text style={s.switchLabel}>
                  {t('closedDays.isRecurring', 'Jährlich wiederkehrend')}
                </Text>
                <Switch
                  value={formIsRecurring}
                  onValueChange={setFormIsRecurring}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                  thumbColor={formIsRecurring ? theme.colors.primary : theme.colors.textTertiary}
                />
              </View>

              {/* Action buttons */}
              <View style={{ height: theme.spacing.sm }} />
              <Button
                title={t('closedDays.addClosedDay', 'Geschlossenen Tag hinzufügen')}
                onPress={handleSave}
                loading={saving}
                fullWidth
                icon={
                  <MaterialCommunityIcons name="plus-circle" size={18} color="#FFFFFF" />
                }
              />
              <View style={{ height: theme.spacing.xs }} />
              <TouchableOpacity style={s.modalCancel} onPress={closeModal}>
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
    card: {
      marginBottom: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    dateText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    nameText: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      marginLeft: theme.spacing.sm,
    },
    statusText: {
      ...theme.typography.styles.caption,
      fontWeight: theme.typography.weights.semiBold,
      marginLeft: 4,
    },
    specialHoursText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.warning,
      marginBottom: theme.spacing.xs,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
    },
    tagText: {
      ...theme.typography.styles.caption,
      fontWeight: theme.typography.weights.medium,
      marginLeft: 4,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
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
      maxHeight: '92%',
      ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
    },
    modalTitle: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    switchLabel: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      flex: 1,
    },
    formLabel: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
      marginBottom: theme.spacing.xs,
    },
    specialHoursForm: {
      marginBottom: theme.spacing.xs,
      paddingLeft: theme.spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.warning,
    },
    timeRow: {
      flexDirection: 'row',
    },
    modalCancel: {
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.spacing.xs,
    },
  });
