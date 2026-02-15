import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatTime } from '../../utils/formatters';

const TYPE_COLORS = {
  repair: '#E53E3E',
  consultation: '#3182CE',
  pickup: '#38A169',
  service: '#D69E2E',
  inspection: '#805AD5',
  delivery: '#DD6B20',
  property_viewing: '#38A169',
  other: '#718096',
};

export default function AppointmentCard({ appointment, onPress, onAccept, onDecline, actionLoading, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { title, type, date, startTime, endTime, status, location, proposedText } = appointment;

  const typeColor = TYPE_COLORS[type] || TYPE_COLORS.other;
  const hasDate = date && (startTime || proposedText);

  const getStatusConfig = (statusValue) => {
    switch (statusValue) {
      case 'confirmed':
        return { color: theme.colors.success, label: t('appointments.statusConfirmed') };
      case 'pending':
        return { color: theme.colors.warning, label: t('appointments.statusPending') };
      case 'proposed':
        return { color: '#3182CE', label: t('appointments.statusProposed') };
      case 'cancelled':
        return { color: theme.colors.error, label: t('appointments.statusCancelled') };
      case 'completed':
        return { color: theme.colors.textSecondary, label: t('appointments.statusCompleted') };
      case 'rescheduled':
        return { color: theme.colors.textSecondary, label: t('appointments.statusRescheduled') };
      default:
        return { color: theme.colors.textSecondary, label: statusValue };
    }
  };

  const statusConfig = getStatusConfig(status);

  const getTypeTranslation = (typeKey) => {
    const transKey = `appointments.type${typeKey.charAt(0).toUpperCase() + typeKey.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;
    return t(transKey, typeKey);
  };

  const s = styles(theme);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={[s.card, style]}
    >
      {/* Left Color Bar */}
      <View style={[s.colorBar, { backgroundColor: typeColor }]} />

      {/* Content */}
      <View style={s.content}>
        {/* Date or "Awaiting" */}
        {hasDate ? (
          <Text style={s.dateText} numberOfLines={1}>
            {formatDate(date)}
          </Text>
        ) : (
          <View style={s.awaitingRow}>
            <MaterialCommunityIcons name="clock-alert-outline" size={16} color={theme.colors.warning} />
            <Text style={s.awaitingText}>{t('appointments.awaitingProposal')}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Type */}
        <Text style={s.typeText}>
          {getTypeTranslation(type)}
        </Text>

        {/* Bottom row: Time/ProposedText + Location */}
        <View style={s.bottomRow}>
          {hasDate && proposedText ? (
            <View style={s.infoItem}>
              <MaterialCommunityIcons name="text-box-outline" size={15} color={theme.colors.textTertiary} />
              <Text style={s.infoText} numberOfLines={1}>
                {proposedText}
              </Text>
            </View>
          ) : hasDate && startTime ? (
            <View style={s.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={15} color={theme.colors.textTertiary} />
              <Text style={s.infoText}>
                {formatTime(startTime)}{endTime ? ` – ${formatTime(endTime)}` : ''}
              </Text>
            </View>
          ) : null}

          {location ? (
            <View style={s.infoItem}>
              <MaterialCommunityIcons name="map-marker-outline" size={15} color={theme.colors.textTertiary} />
              <Text style={s.infoText} numberOfLines={1}>
                {typeof location === 'object' ? location.name : location}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Status Badge */}
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: statusConfig.color + '18' }]}>
            <View style={[s.badgeDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[s.badgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Accept/Decline buttons for proposed appointments */}
        {status === 'proposed' && (onAccept || onDecline) && (
          <View style={s.proposalActions}>
            {/* Prominent date + message box */}
            <View style={s.proposalDetailBox}>
              <View style={s.proposalDetailRow}>
                <View style={s.proposalIconWrap}>
                  <MaterialCommunityIcons name="calendar" size={18} color="#3182CE" />
                </View>
                <Text style={s.proposalDateText}>{formatDate(date)}</Text>
              </View>
              {proposedText ? (
                <View style={s.proposalDetailRow}>
                  <View style={s.proposalIconWrap}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#3182CE" />
                  </View>
                  <Text style={s.proposalMessageText}>{proposedText}</Text>
                </View>
              ) : null}
            </View>
            <View style={s.proposalButtons}>
              {onAccept && (
                <TouchableOpacity
                  style={[s.proposalButton, s.acceptButton]}
                  onPress={(e) => { e.stopPropagation?.(); onAccept(appointment); }}
                  activeOpacity={0.7}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                      <Text style={s.acceptButtonText}>{t('appointments.acceptProposal')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {onDecline && (
                <TouchableOpacity
                  style={[s.proposalButton, s.declineButton, { borderColor: theme.colors.border }]}
                  onPress={(e) => { e.stopPropagation?.(); onDecline(appointment); }}
                  activeOpacity={0.7}
                  disabled={actionLoading}
                >
                  <MaterialCommunityIcons name="calendar-refresh" size={18} color={theme.colors.primary} />
                  <Text style={[s.declineButtonText, { color: theme.colors.primary }]}>
                    {t('appointments.requestOtherDate')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Chevron */}
      <View style={s.chevron}>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    colorBar: {
      width: 5,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md + 2,
    },
    dateText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
      marginBottom: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    awaitingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 3,
      gap: 5,
    },
    awaitingText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.warning,
      fontWeight: theme.typography.weights.semiBold,
    },
    title: {
      fontSize: 17,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: 3,
    },
    typeText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    infoText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textTertiary,
      fontSize: 13,
    },
    badgeRow: {
      flexDirection: 'row',
      marginTop: theme.spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: 4,
      gap: 6,
    },
    badgeDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: theme.typography.weights.semiBold,
    },
    chevron: {
      justifyContent: 'center',
      paddingRight: theme.spacing.sm,
    },
    // Proposal action buttons
    proposalActions: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
    proposalDetailBox: {
      backgroundColor: '#3182CE' + '12',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm + 2,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs + 2,
    },
    proposalDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    proposalIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#3182CE' + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    proposalDateText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      flex: 1,
    },
    proposalMessageText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
      flex: 1,
    },
    proposalButtons: {
      gap: theme.spacing.xs,
    },
    proposalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      gap: 6,
    },
    acceptButton: {
      backgroundColor: theme.colors.success,
    },
    acceptButtonText: {
      color: '#FFFFFF',
      fontWeight: theme.typography.weights.bold,
      fontSize: 13,
    },
    declineButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
    },
    declineButtonText: {
      fontWeight: theme.typography.weights.semiBold,
      fontSize: 13,
    },
  });
