import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { truncateText, formatRelativeTime } from '../../utils/formatters';

const CATEGORY_ICONS = {
  repair: 'wrench',
  appointment: 'calendar',
  chat: 'message-text',
  feed: 'newspaper',
  offer: 'tag',
  system: 'information',
};

export default function NotificationCard({
  notification,
  onPress,
  onLongPress,
  onAccept,
  onDecline,
  style,
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { title, message, type, category, read, createdAt, relatedType } = notification;

  const iconName = CATEGORY_ICONS[category] || CATEGORY_ICONS.system;
  const iconColor = theme.colors.notification?.[category] || theme.colors.primary;

  // Appointment proposal actions
  const isAppointmentProposal = category === 'appointment' && relatedType === 'appointment' && type === 'appointment_reminder';
  const [showActions, setShowActions] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleAccept = async () => {
    if (!onAccept) return;
    setActionLoading(true);
    try {
      await onAccept(notification, customerNote.trim() || undefined);
    } finally {
      setActionLoading(false);
      setShowActions(false);
      setCustomerNote('');
    }
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    setActionLoading(true);
    try {
      await onDecline(notification);
    } finally {
      setActionLoading(false);
      setShowActions(false);
    }
  };

  return (
    <View style={[
      {
        backgroundColor: read ? theme.colors.card : theme.colors.primaryLight,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.sm,
      },
      style,
    ]}>
      <TouchableOpacity
        onPress={isAppointmentProposal && onAccept ? () => setShowActions(!showActions) : onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        }}
      >
        {/* Left: Category Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.borderRadius.round,
            backgroundColor: read ? theme.colors.surface : theme.colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
        </View>

        {/* Center: Title + Message + Time */}
        <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
          <Text
            style={[
              theme.typography.styles.body,
              {
                color: theme.colors.text,
                fontWeight: read
                  ? theme.typography.weights.regular
                  : theme.typography.weights.bold,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                theme.typography.styles.caption,
                { color: theme.colors.textSecondary, marginTop: 2 },
              ]}
              numberOfLines={2}
            >
              {truncateText(message, 80)}
            </Text>
          ) : null}
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textTertiary, marginTop: theme.spacing.xs },
            ]}
          >
            {formatRelativeTime(createdAt)}
          </Text>
        </View>

        {/* Right: Unread Dot or Expand indicator */}
        {isAppointmentProposal && onAccept ? (
          <MaterialCommunityIcons
            name={showActions ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textTertiary}
            style={{ marginLeft: theme.spacing.sm }}
          />
        ) : !read ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: theme.borderRadius.round,
              backgroundColor: theme.colors.info,
              marginLeft: theme.spacing.sm,
            }}
          />
        ) : null}
      </TouchableOpacity>

      {/* Expandable Accept/Decline Actions */}
      {isAppointmentProposal && onAccept && showActions && (
        <View style={{
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
          marginTop: -2,
        }}>
          {/* Customer Note Input */}
          <Text style={[
            theme.typography.styles.caption,
            { color: theme.colors.textTertiary, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
          ]}>
            {t('notifications.appointmentNoteHint')}
          </Text>
          <TextInput
            value={customerNote}
            onChangeText={setCustomerNote}
            placeholder={t('appointments.customerNotePlaceholder')}
            placeholderTextColor={theme.colors.placeholder}
            style={[
              theme.typography.styles.bodySmall,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
                minHeight: 50,
                marginBottom: theme.spacing.sm,
              },
            ]}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <TouchableOpacity
              onPress={handleDecline}
              disabled={actionLoading}
              activeOpacity={0.7}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.error + '15',
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.sm,
                gap: 4,
              }}
            >
              <MaterialCommunityIcons name="close" size={18} color={theme.colors.error} />
              <Text style={[
                theme.typography.styles.bodySmall,
                { color: theme.colors.error, fontWeight: theme.typography.weights.semiBold },
              ]}>
                {t('notifications.decline')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAccept}
              disabled={actionLoading}
              activeOpacity={0.7}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.success,
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.sm,
                gap: 4,
              }}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  <Text style={[
                    theme.typography.styles.bodySmall,
                    { color: '#FFFFFF', fontWeight: theme.typography.weights.semiBold },
                  ]}>
                    {t('notifications.accept')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
