import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { truncateText, formatRelativeTime } from '../../utils/formatters';
import Card from '../ui/Card';

const TYPE_ICONS = {
  repair: 'wrench',
  inspection: 'clipboard-check-outline',
  consultation: 'chat-question-outline',
  maintenance: 'cog-outline',
  bike_question: 'bicycle',
  cleaning_question: 'spray-bottle',
  motor_question: 'engine',
  complaint: 'alert-circle-outline',
  inquiry: 'help-circle-outline',
  feedback: 'message-text-outline',
  other: 'dots-horizontal-circle-outline',
};

export default function TicketCard({ ticket, onPress, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { ticketNumber, title, type, description, status, urgency, createdAt, updatedAt } = ticket;

  const getStatusConfig = (statusValue) => {
    switch (statusValue) {
      case 'open':
        return { color: theme.colors.info, label: t('ticket.status.open', 'Open') };
      case 'in_progress':
        return { color: theme.colors.warning, label: t('ticket.status.inProgress', 'In Progress') };
      case 'waiting':
        return { color: '#F97316', label: t('ticket.status.waiting', 'Waiting') };
      case 'confirmed':
        return { color: '#8B5CF6', label: t('ticket.status.confirmed', 'Confirmed') };
      case 'completed':
        return { color: theme.colors.success, label: t('ticket.status.completed', 'Completed') };
      case 'resolved':
        return { color: theme.colors.success, label: t('ticket.status.resolved', 'Resolved') };
      case 'cancelled':
        return { color: theme.colors.error, label: t('ticket.status.cancelled', 'Cancelled') };
      case 'closed':
        return { color: theme.colors.textSecondary, label: t('ticket.status.closed', 'Closed') };
      default:
        return { color: theme.colors.textSecondary, label: statusValue };
    }
  };

  const getUrgencyColor = (urgencyValue) => {
    switch (urgencyValue) {
      case 'urgent':
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      case 'normal':
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const statusConfig = getStatusConfig(status);
  const typeIcon = TYPE_ICONS[type] || TYPE_ICONS.other;

  return (
    <Card onPress={onPress} style={style}>
      {/* Top Row: Ticket Number + Status Badge */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: theme.spacing.sm }}>
          <Text
            style={[
              theme.typography.styles.caption,
              {
                color: theme.colors.textTertiary,
                fontFamily: 'monospace',
                marginRight: theme.spacing.xs,
              },
            ]}
          >
            #{ticketNumber}
          </Text>
          {title ? (
            <Text
              style={[
                theme.typography.styles.body,
                {
                  color: theme.colors.text,
                  fontWeight: theme.typography.weights.bold,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            backgroundColor: statusConfig.color,
            borderRadius: theme.borderRadius.round,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
          }}
        >
          <Text
            style={[
              theme.typography.styles.small,
              { color: '#FFFFFF', fontWeight: theme.typography.weights.semiBold },
            ]}
          >
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Description */}
      {description ? (
        <Text
          style={[
            theme.typography.styles.body,
            { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
          ]}
          numberOfLines={2}
        >
          {truncateText(description, 100)}
        </Text>
      ) : null}

      {/* Bottom Row: Type + Urgency + Time */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name={typeIcon} size={16} color={theme.colors.textSecondary} />
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textSecondary, marginLeft: theme.spacing.xs },
            ]}
          >
            {t(`ticket.type.${type}`, type)}
          </Text>

          {urgency && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: theme.borderRadius.round,
                backgroundColor: getUrgencyColor(urgency),
                marginLeft: theme.spacing.sm,
              }}
            />
          )}
        </View>

        <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
          {formatRelativeTime(updatedAt || createdAt)}
        </Text>
      </View>
    </Card>
  );
}
