import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

function isWinterSeason(date = new Date()) {
  const month = date.getMonth(); // 0-based: 0=Jan, 10=Nov, 11=Dec
  const day = date.getDate();
  // November (10) and December (11) are always winter
  if (month >= 10) return true;
  // January (0) is always winter
  if (month === 0) return true;
  // 1. February (month=1, day=1) is still winter
  if (month === 1 && day === 1) return true;
  return false;
}

function getOpeningHours(isWinter) {
  return {
    weekdays: {
      morning: { open: '8:00', close: '13:00' },
      afternoon: { open: '14:00', close: isWinter ? '17:00' : '18:00' },
    },
    saturday: {
      morning: { open: '9:00', close: '13:00' },
    },
  };
}

function isCurrentlyOpen(hours, date = new Date()) {
  const day = date.getDay();
  const time = date.getHours() * 60 + date.getMinutes();

  if (day === 0) return false;

  const parseTime = (str) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };

  if (day >= 1 && day <= 5) {
    const { morning, afternoon } = hours.weekdays;
    const inMorning = time >= parseTime(morning.open) && time < parseTime(morning.close);
    const inAfternoon = time >= parseTime(afternoon.open) && time < parseTime(afternoon.close);
    return inMorning || inAfternoon;
  }

  if (day === 6) {
    const { morning } = hours.saturday;
    return time >= parseTime(morning.open) && time < parseTime(morning.close);
  }

  return false;
}

export default function OpeningHoursBanner() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { isWinter, isOpen, weekdayClose } = useMemo(() => {
    const now = new Date();
    const winter = isWinterSeason(now);
    const h = getOpeningHours(winter);
    return {
      isWinter: winter,
      isOpen: isCurrentlyOpen(h, now),
      weekdayClose: winter ? '17:00' : '18:00',
    };
  }, []);

  const statusColor = isOpen ? '#2E7D32' : '#D32F2F';
  const statusBg = isOpen ? '#E8F5E9' : '#FFEBEE';

  return (
    <View
      style={[
        s.container,
        {
          marginHorizontal: theme.spacing.xs,
          marginTop: theme.spacing.sm,
          marginBottom: theme.spacing.xs,
          maxWidth: 600,
          width: '100%',
          alignSelf: 'center',
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.primary,
          ...theme.shadows.md,
        },
      ]}
    >
      {/* Title row with status badge */}
      <View style={s.titleRow}>
        <View style={s.titleLeft}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} />
          <Text
            style={[
              s.title,
              {
                color: theme.colors.text,
                fontWeight: theme.typography.weights.bold,
                marginLeft: 8,
              },
            ]}
          >
            {t('openingHours.title', 'Aktuelle Öffnungszeiten:')}
          </Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusText, { color: statusColor }]}>
            {isOpen ? t('openingHours.open', 'Geöffnet') : t('openingHours.closed', 'Geschlossen')}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: theme.colors.divider }]} />

      {/* Hours grid */}
      <View style={s.hoursGrid}>
        {/* Mon-Fri */}
        <View style={s.hoursColumn}>
          <Text style={[s.dayLabel, { color: theme.colors.textSecondary }]}>
            {t('openingHours.monFri', 'Montag - Freitag')}
          </Text>
          <Text style={[s.timeText, { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold }]}>
            8:00 - 13:00 Uhr
          </Text>
          <Text style={[s.timeText, { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold }]}>
            14:00 - {weekdayClose} Uhr
          </Text>
        </View>

        {/* Vertical divider */}
        <View style={[s.verticalDivider, { backgroundColor: theme.colors.divider }]} />

        {/* Saturday */}
        <View style={s.hoursColumn}>
          <Text style={[s.dayLabel, { color: theme.colors.textSecondary }]}>
            {t('openingHours.sat', 'Samstag')}
          </Text>
          <Text style={[s.timeText, { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold }]}>
            9:00 - 13:00 Uhr
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  hoursGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hoursColumn: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 16,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
