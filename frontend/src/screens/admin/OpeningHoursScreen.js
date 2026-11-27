import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useScreenEdges } from '../../hooks/useScreenEdges';
import { useTheme } from '../../hooks/useTheme';
import { settingsApi } from '../../api/settings';
import { loadOpeningHours } from '../../hooks/useOpeningHours';
import { DAY_KEYS, WEEK_ORDER, dayProblem, normalizeTime } from '../../utils/openingHours';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

// Weekly opening hours for summer ('standard') and winter. What is saved here
// is what the app, the PC program and the website show (the website is
// rebuilt about a minute after saving).
const SEASONS = ['standard', 'winter'];
const MAX_PERIODS = 3;

const emptyWeek = () => WEEK_ORDER.map((d) => ({ dayOfWeek: d, isClosed: d === 0, periods: [] }));

function toWeek(schedule) {
  const byDay = new Map((schedule || []).map((d) => [d.dayOfWeek, d]));
  return emptyWeek().map((empty) => {
    const d = byDay.get(empty.dayOfWeek);
    if (!d) return empty;
    return {
      dayOfWeek: d.dayOfWeek,
      isClosed: !!d.isClosed,
      periods: (d.periods || []).map((p) => ({ open: p.open, close: p.close })),
    };
  });
}

export default function OpeningHoursScreen() {
  const safeEdges = useScreenEdges();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const s = styles(theme);

  const [season, setSeason] = useState('standard');
  const [weeks, setWeeks] = useState({});
  const [saved, setSaved] = useState({}); // last loaded/saved state as JSON per season
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summer, winter] = await Promise.all(SEASONS.map((x) => settingsApi.getOpeningHours(x)));
      const next = { standard: toWeek(summer?.schedule), winter: toWeek(winter?.schedule) };
      setWeeks(next);
      setSaved({ standard: JSON.stringify(next.standard), winter: JSON.stringify(next.winter) });
    } catch {
      showToast({ type: 'error', message: t('openingHoursEdit.loadError') });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const week = weeks[season] || [];
  const changed = !!weeks[season] && JSON.stringify(week) !== saved[season];

  const updateDay = (dayOfWeek, fn) => {
    setWeeks((prev) => ({
      ...prev,
      [season]: prev[season].map((d) => (d.dayOfWeek === dayOfWeek ? fn(d) : d)),
    }));
  };

  const setClosed = (day, closed) => updateDay(day.dayOfWeek, (d) => ({
    ...d,
    isClosed: closed,
    periods: closed ? d.periods : (d.periods.length ? d.periods : [{ open: '08:00', close: '13:00' }]),
  }));

  const setTime = (day, index, field, value) => updateDay(day.dayOfWeek, (d) => ({
    ...d,
    periods: d.periods.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
  }));

  // On leaving a field "8" or "8.30" becomes "08:00" / "08:30"
  const tidyTime = (day, index, field) => updateDay(day.dayOfWeek, (d) => ({
    ...d,
    periods: d.periods.map((p, i) => (i === index ? { ...p, [field]: normalizeTime(p[field]) } : p)),
  }));

  const addPeriod = (day) => updateDay(day.dayOfWeek, (d) => {
    const last = d.periods[d.periods.length - 1];
    return { ...d, periods: [...d.periods, { open: last ? last.close : '08:00', close: '' }] };
  });

  const removePeriod = (day, index) => updateDay(day.dayOfWeek, (d) => {
    const periods = d.periods.filter((_, i) => i !== index);
    return { ...d, periods, isClosed: periods.length ? d.isClosed : true };
  });

  const copyMondayToWeekdays = () => {
    const monday = week.find((d) => d.dayOfWeek === 1);
    if (!monday) return;
    setWeeks((prev) => ({
      ...prev,
      [season]: prev[season].map((d) => (d.dayOfWeek >= 2 && d.dayOfWeek <= 5
        ? { ...d, isClosed: monday.isClosed, periods: monday.periods.map((p) => ({ ...p })) }
        : d)),
    }));
  };

  const save = async () => {
    const clean = week.map((d) => ({
      ...d,
      periods: d.isClosed ? [] : d.periods.map((p) => ({ open: normalizeTime(p.open), close: normalizeTime(p.close) })),
    }));
    if (clean.some((d) => dayProblem(d))) {
      setShowErrors(true);
      showToast({ type: 'error', message: t('openingHoursEdit.fixErrors') });
      return;
    }
    setSaving(true);
    try {
      // One request per day; only the days that changed
      const before = JSON.parse(saved[season] || '[]');
      for (const d of clean) {
        const old = before.find((b) => b.dayOfWeek === d.dayOfWeek);
        if (old && JSON.stringify(old) === JSON.stringify(d)) continue;
        await settingsApi.updateOpeningHours({ season, dayOfWeek: d.dayOfWeek, isClosed: d.isClosed, periods: d.periods });
      }
      setWeeks((prev) => ({ ...prev, [season]: clean }));
      setSaved((prev) => ({ ...prev, [season]: JSON.stringify(clean) }));
      setShowErrors(false);
      loadOpeningHours().catch(() => {});
      showToast({ type: 'success', message: t('openingHoursEdit.saved') });
    } catch (error) {
      const msg = error?.response?.data?.error || t('openingHoursEdit.saveError');
      showToast({ type: 'error', message: typeof msg === 'string' ? msg : t('openingHoursEdit.saveError') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={safeEdges}>
        <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={safeEdges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.intro}>{t('openingHoursEdit.intro')}</Text>

          {/* Season switch */}
          <View style={s.seasonRow}>
            {SEASONS.map((x) => {
              const active = x === season;
              return (
                <TouchableOpacity
                  key={x}
                  onPress={() => { setSeason(x); setShowErrors(false); }}
                  activeOpacity={0.7}
                  style={[s.seasonChip, active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[s.seasonTitle, active && { color: '#FFFFFF' }]}>
                    {t(`openingHoursEdit.season.${x}`)}
                  </Text>
                  <Text style={[s.seasonDates, active && { color: '#FFFFFF' }]}>
                    {t(`openingHoursEdit.seasonDates.${x}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {week.map((day) => {
            const problem = showErrors ? dayProblem({
              ...day,
              periods: day.periods.map((p) => ({ open: normalizeTime(p.open), close: normalizeTime(p.close) })),
            }) : null;
            return (
              <Card key={day.dayOfWeek} style={s.dayCard}>
                <View style={s.dayHeader}>
                  <Text style={s.dayName}>{t(`common.days.${DAY_KEYS[day.dayOfWeek]}`)}</Text>
                  <Text style={[s.dayState, { color: day.isClosed ? theme.colors.textSecondary : theme.colors.success }]}>
                    {day.isClosed ? t('openingHoursEdit.closed') : t('openingHoursEdit.open')}
                  </Text>
                  <Switch
                    value={!day.isClosed}
                    onValueChange={(open) => setClosed(day, !open)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                    thumbColor={!day.isClosed ? theme.colors.primary : theme.colors.textTertiary}
                    accessibilityLabel={t('openingHoursEdit.openSwitch', { day: t(`common.days.${DAY_KEYS[day.dayOfWeek]}`) })}
                  />
                </View>

                {!day.isClosed ? (
                  <>
                    {day.periods.map((p, index) => (
                      <View key={index} style={s.periodRow}>
                        <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                          <Input
                            label={t('openingHoursEdit.from')}
                            value={p.open}
                            onChangeText={(v) => setTime(day, index, 'open', v)}
                            onBlur={() => tidyTime(day, index, 'open')}
                            placeholder="08:00"
                            maxLength={5}
                            keyboardType="numbers-and-punctuation"
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                          <Input
                            label={t('openingHoursEdit.to')}
                            value={p.close}
                            onChangeText={(v) => setTime(day, index, 'close', v)}
                            onBlur={() => tidyTime(day, index, 'close')}
                            placeholder="13:00"
                            maxLength={5}
                            keyboardType="numbers-and-punctuation"
                          />
                        </View>
                        <TouchableOpacity
                          onPress={() => removePeriod(day, index)}
                          style={s.iconButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={t('openingHoursEdit.removePeriod')}
                        >
                          <MaterialCommunityIcons name="close-circle-outline" size={22} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {day.periods.length < MAX_PERIODS ? (
                      <TouchableOpacity onPress={() => addPeriod(day)} style={s.addRow} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
                        <Text style={s.addText}>{t('openingHoursEdit.addPeriod')}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {day.dayOfWeek === 1 ? (
                      <TouchableOpacity onPress={copyMondayToWeekdays} style={s.addRow} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="content-copy" size={16} color={theme.colors.primary} />
                        <Text style={s.addText}>{t('openingHoursEdit.copyMonday')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : null}

                {problem ? (
                  <Text style={s.error}>{t(`openingHoursEdit.problem.${problem}`)}</Text>
                ) : null}
              </Card>
            );
          })}

          <Text style={s.hint}>{t('openingHoursEdit.hint')}</Text>
        </ScrollView>

        <View style={s.footer}>
          <Button
            title={t('openingHoursEdit.save')}
            onPress={save}
            loading={saving}
            disabled={!changed || saving}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
    intro: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    seasonRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
    seasonChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.sm,
      backgroundColor: theme.colors.card,
    },
    seasonTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
    },
    seasonDates: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    dayCard: { marginBottom: theme.spacing.sm },
    dayHeader: { flexDirection: 'row', alignItems: 'center' },
    dayName: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
      flex: 1,
    },
    dayState: { ...theme.typography.styles.caption, marginRight: theme.spacing.sm },
    periodRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm },
    iconButton: { paddingTop: theme.spacing.md },
    addRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, paddingVertical: 4 },
    addText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
      marginLeft: 6,
    },
    error: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.error,
      marginTop: theme.spacing.sm,
    },
    hint: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    footer: {
      padding: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
  });
