import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../api/appointments';
import AppointmentCard from '../../components/appointment/AppointmentCard';
import EmptyState from '../../components/ui/EmptyState';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// 'YYYY-MM-DD' key for a Date (local).
function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// The app stores dates as 'YYYY-MM-DD' (date-only). Normalise to a key.
function apptDayKey(a) {
  if (!a?.date) return null;
  return String(a.date).slice(0, 10);
}

/**
 * Month calendar for staff — mirrors the PC program. Confirmed appointments are
 * shown as dots on their day; tapping a day lists that day's appointments below.
 */
export default function CalendarScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const s = styles(theme);

  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(() => dayKey(today));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // A generous page keeps the whole month (and neighbours) in memory.
      const res = await appointmentsApi.getOngoingAppointments({ limit: 500 });
      const list = res?.data?.data || [];
      setAppointments(Array.isArray(list) ? list : []);
    } catch (e) {
      // keep whatever we had; calendar stays usable offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isFirst = useRef(true);
  useFocusEffect(useCallback(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    load();
  }, [load]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  // Map dayKey -> count of appointments that day
  const countByDay = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      const k = apptDayKey(a);
      if (!k) return;
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [appointments]);

  const daysOfSelected = useMemo(
    () => appointments
      .filter((a) => apptDayKey(a) === selectedKey)
      .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || ''))),
    [appointments, selectedKey],
  );

  // Build the 6-week grid for the current month (Mon-first).
  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // JS: 0=Sun … 6=Sat → shift to Mon-first (0=Mon … 6=Sun)
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - lead);
    const grid = [];
    for (let w = 0; w < 6; w += 1) {
      const row = [];
      for (let d = 0; d < 7; d += 1) {
        const cell = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
        row.push(cell);
      }
      grid.push(row);
    }
    return grid;
  }, [cursor]);

  const goMonth = (delta) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const todayKey = dayKey(today);

  const handlePress = useCallback((appointment) => {
    navigation.navigate('AppointmentDetail', { appointmentId: appointment._id || appointment.id });
  }, [navigation]);

  const renderHeader = () => (
    <View>
      {/* Month switcher */}
      <View style={s.monthBar}>
        <TouchableOpacity onPress={() => goMonth(-1)} style={s.arrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</Text>
        <TouchableOpacity onPress={() => goMonth(1)} style={s.arrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="chevron-right" size={26} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Weekday row */}
      <View style={s.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={s.weekday}>{w}</Text>
        ))}
      </View>

      {/* Day grid */}
      {weeks.map((row, wi) => (
        <View key={wi} style={s.weekRow}>
          {row.map((cell) => {
            const k = dayKey(cell);
            const inMonth = cell.getMonth() === cursor.getMonth();
            const count = countByDay[k] || 0;
            const isSelected = k === selectedKey;
            const isToday = k === todayKey;
            return (
              <TouchableOpacity
                key={k}
                style={[
                  s.dayCell,
                  isSelected && { backgroundColor: theme.colors.primary },
                  !isSelected && isToday && { borderColor: theme.colors.primary, borderWidth: 1 },
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedKey(k)}
              >
                <Text
                  style={[
                    s.dayNum,
                    { color: isSelected ? '#FFFFFF' : (inMonth ? theme.colors.text : theme.colors.textTertiary) },
                  ]}
                >
                  {cell.getDate()}
                </Text>
                {count > 0 ? (
                  <View style={[s.dot, { backgroundColor: isSelected ? '#FFFFFF' : theme.colors.primary }]}>
                    <Text style={[s.dotText, { color: isSelected ? theme.colors.primary : '#FFFFFF' }]}>
                      {count > 9 ? '9+' : count}
                    </Text>
                  </View>
                ) : (
                  <View style={s.dotPlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Selected-day heading */}
      <Text style={s.dayHeading}>
        {(() => {
          const [y, m, d] = selectedKey.split('-').map((n) => parseInt(n, 10));
          return `${String(d).padStart(2, '0')}. ${MONTHS[m - 1]} ${y}`;
        })()}
        {daysOfSelected.length ? `  ·  ${daysOfSelected.length} ${t('appointments.title', 'Termine')}` : ''}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={daysOfSelected}
        keyExtractor={(item) => String(item._id || item.id)}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <AppointmentCard appointment={item} onPress={() => handlePress(item)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-blank-outline"
            title={t('appointments.noAppointmentsThisDay', 'Keine Termine')}
            message={t('appointments.noAppointmentsThisDayMsg', 'An diesem Tag sind keine Termine eingetragen.')}
          />
        }
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  arrow: {
    padding: theme.spacing.xs,
  },
  monthLabel: {
    ...theme.typography.styles.h5,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
  },
  weekday: {
    ...theme.typography.styles.caption,
    color: theme.colors.textTertiary,
    fontWeight: theme.typography.weights.semiBold,
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
  },
  dayNum: {
    ...theme.typography.styles.body,
    fontWeight: theme.typography.weights.medium,
  },
  dot: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dotPlaceholder: {
    height: 16,
    marginTop: 2,
  },
  dayHeading: {
    ...theme.typography.styles.body,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
});
