import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/formatters';

// Step order per category. 'ready' is the shared pickup-ready end state.
const STATUS_ORDERS = {
  reparatur: ['ordered', 'in_repair', 'quote_created', 'parts_ordered', 'repair_done', 'ready'],
  leasing: ['leasing_in_progress', 'ready'],
  neu: ['sale_in_progress', 'sale_test_drive', 'ready'],
};

export default function StatusTimeline({ statusHistory = [], currentStatus, category, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const STATUS_ORDER = STATUS_ORDERS[category] || STATUS_ORDERS.reparatur;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  const getHistoryItem = (statusKey) => {
    return statusHistory.find((h) => h.status === statusKey);
  };

  const getStatusLabel = (statusKey) => {
    if (statusKey === 'ready' && category === 'leasing') {
      return t('repairs.statusLeasingDone', 'Leasing abgeschlossen');
    }
    const labels = {
      ordered: t('repairs.statusOrdered', 'Bestellt'),
      in_repair: t('repairs.statusInRepair', 'In Arbeit'),
      quote_created: t('repairs.statusQuoteCreated', 'KVA erstellt'),
      parts_ordered: t('repairs.statusPartsOrdered', 'Teile bestellt'),
      repair_done: t('repairs.statusRepairDone', 'Reparatur fertig'),
      ready: t('repairs.statusReady', 'Abholbereit'),
      leasing_in_progress: t('repairs.statusLeasingInProgress', 'Leasing in Bearbeitung'),
      sale_in_progress: t('repairs.statusInProgress', 'In Bearbeitung'),
      sale_test_drive: t('repairs.statusTestDrive', 'Zur Probefahrt'),
    };
    return labels[statusKey] || statusKey;
  };

  return (
    <View style={style}>
      {STATUS_ORDER.map((statusKey, index) => {
        const stepIndex = index;
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = stepIndex === currentIndex;
        const isFuture = stepIndex > currentIndex;
        const historyItem = getHistoryItem(statusKey);
        const isLast = index === STATUS_ORDER.length - 1;

        // Dot color
        let dotColor = theme.colors.border;
        if (isCompleted) dotColor = theme.colors.success;
        if (isCurrent) dotColor = theme.colors.primary;

        // Line color
        const lineColor = isCompleted ? theme.colors.success : theme.colors.border;

        return (
          <View key={statusKey} style={{ flexDirection: 'row' }}>
            {/* Left column: dot + line */}
            <View style={{ alignItems: 'center', width: 32 }}>
              {/* Dot */}
              {isCurrent ? (
                <Animated.View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: theme.borderRadius.round,
                    backgroundColor: dotColor,
                    opacity: pulseAnim,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: isCompleted ? 16 : 12,
                    height: isCompleted ? 16 : 12,
                    borderRadius: theme.borderRadius.round,
                    backgroundColor: isCompleted ? dotColor : 'transparent',
                    borderWidth: isFuture ? 2 : 0,
                    borderColor: isFuture ? theme.colors.border : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCompleted && (
                    <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
                  )}
                </View>
              )}

              {/* Connecting Line */}
              {!isLast && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 24,
                    backgroundColor: lineColor,
                    marginVertical: 4,
                  }}
                />
              )}
            </View>

            {/* Right column: label + info */}
            <View
              style={{
                flex: 1,
                marginLeft: theme.spacing.sm,
                paddingBottom: isLast ? 0 : theme.spacing.md,
              }}
            >
              <Text
                style={[
                  theme.typography.styles.body,
                  {
                    color: isFuture ? theme.colors.textTertiary : theme.colors.text,
                    fontWeight: isCurrent
                      ? theme.typography.weights.bold
                      : theme.typography.weights.regular,
                  },
                ]}
              >
                {getStatusLabel(statusKey)}
              </Text>

              {historyItem?.timestamp && (
                <Text
                  style={[
                    theme.typography.styles.caption,
                    { color: theme.colors.textSecondary, marginTop: 2 },
                  ]}
                >
                  {formatDateTime(historyItem.timestamp)}
                </Text>
              )}

              {historyItem?.note && (
                <Text
                  style={[
                    theme.typography.styles.caption,
                    {
                      color: theme.colors.textSecondary,
                      fontStyle: 'italic',
                      marginTop: theme.spacing.xs,
                    },
                  ]}
                >
                  {historyItem.note}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
