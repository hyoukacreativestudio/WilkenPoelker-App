import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/formatters';
import { visibleHistoryNote } from '../../utils/repairDisplay';
import { repairStatusLabel } from '../../utils/repairStatus';

// Step order per category - only the statuses customers see since 2026-11-06.
// 'ready' (or 'sale_delivery' for delivered new devices) is the end state.
const STATUS_ORDERS = {
  reparatur: ['quote_created', 'parts_ordered', 'ready'],
  leasing: ['ready'],
  neu: ['reserved', 'sale_test_drive', 'sale_delivery', 'ready'],
};
const END_STEPS = new Set(['ready']);

export default function StatusTimeline({ statusHistory = [], currentStatus, category, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Steps before the end are only shown when the order actually went through
  // them - otherwise the customer would see e.g. "KVA geschrieben" ticked
  // although there never was one. Delivered new devices end with "wird geliefert".
  const visited = new Set((statusHistory || []).map((h) => h.status));
  const delivered = currentStatus === 'sale_delivery' || (visited.has('sale_delivery') && currentStatus !== 'ready');
  const STATUS_ORDER = (STATUS_ORDERS[category] || STATUS_ORDERS.reparatur).filter((st) => {
    if (st === 'ready') return !delivered;
    return END_STEPS.has(st) || visited.has(st) || st === currentStatus;
  });

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

  // 'completed' = customer acknowledged the pickup: every step is done.
  const currentIndex = currentStatus === 'completed' ? STATUS_ORDER.length : STATUS_ORDER.indexOf(currentStatus);

  const getHistoryItem = (statusKey) => {
    return statusHistory.find((h) => h.status === statusKey);
  };

  const getStatusLabel = (statusKey) => repairStatusLabel(t, statusKey, category);

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

              {visibleHistoryNote(historyItem?.note) && (
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
                  {visibleHistoryNote(historyItem.note)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
