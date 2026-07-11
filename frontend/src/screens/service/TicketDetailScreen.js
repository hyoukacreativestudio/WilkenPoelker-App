import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { serviceApi } from '../../api/service';
import { getServerUrl } from '../../api/client';
import Button from '../../components/ui/Button';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import { formatRelativeTime } from '../../utils/formatters';
import { useToast } from '../../components/ui/Toast';

const STATUS_ORDER = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

export default function TicketDetailScreen({ route, navigation }) {
  const { ticketId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isStaff = user && user.role !== 'customer';

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  useEffect(() => {
    if (ticket?.ticketNumber) {
      navigation.setOptions({
        title: `#${ticket.ticketNumber}`,
      });
    }
  }, [ticket, navigation]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      const result = await serviceApi.getTicket(ticketId);
      const data = result.data?.data;
      setTicket(data?.ticket || data || result.data);
    } catch (err) {
      const code = err?.code || err?.response?.data?.error?.code;
      if (code === 'TICKET_ACCESS_DENIED' || code === 'CHAT_ACCESS_DENIED') {
        showToast({ type: 'error', message: t('service.ticketAccessDenied', 'Dieses Ticket ist einem anderen Mitarbeiter zugewiesen.') });
        navigation.goBack();
        return;
      }
      showToast({ type: 'error', message: t('service.loadTicketError') });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'open':
        return { color: theme.colors.info, label: t('ticket.status.open'), icon: 'circle-outline' };
      case 'in_progress':
        return { color: theme.colors.warning, label: t('ticket.status.inProgress'), icon: 'progress-clock' };
      case 'waiting':
        return { color: '#F97316', label: t('ticket.status.waiting'), icon: 'clock-outline' };
      case 'resolved':
        return { color: theme.colors.success, label: t('ticket.status.resolved'), icon: 'check-circle-outline' };
      case 'closed':
        return { color: theme.colors.textSecondary, label: t('ticket.status.closed'), icon: 'close-circle-outline' };
      default:
        return { color: theme.colors.textSecondary, label: status, icon: 'help-circle-outline' };
    }
  };

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return { color: theme.colors.error, label: t('ticket.urgency.urgent'), icon: 'alert-circle' };
      case 'normal':
        return { color: theme.colors.success, label: t('ticket.urgency.normal'), icon: 'information' };
      default:
        return { color: theme.colors.textSecondary, label: urgency, icon: 'help-circle' };
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      inspection: 'clipboard-check-outline',
      repair: 'wrench',
      warranty: 'shield-check-outline',
      custom_order: 'cog-outline',
      consultation: 'chat-processing-outline',
      complaint: 'alert-circle-outline',
      return: 'keyboard-return',
      other: 'dots-horizontal-circle-outline',
    };
    return icons[type] || 'help-circle-outline';
  };

  const getCurrentStatusIndex = () => {
    if (!ticket) return -1;
    return STATUS_ORDER.indexOf(ticket.status);
  };

  const handleOpenChat = () => {
    navigation.navigate('Chat', { ticketId });
  };

  const s = styles(theme);

  if (loading) {
    return (
      <View style={s.container}>
        <View style={{ padding: theme.spacing.md }}>
          <SkeletonLoader width="50%" height={24} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.lg }} />
          <SkeletonLoader width="30%" height={28} borderRadius={theme.borderRadius.round} style={{ marginBottom: theme.spacing.lg }} />
          <SkeletonLoader width="100%" height={80} borderRadius={theme.borderRadius.md} style={{ marginBottom: theme.spacing.lg }} />
          <SkeletonLoader width="100%" height={120} borderRadius={theme.borderRadius.md} />
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
        <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
          {t('service.ticketNotFound')}
        </Text>
      </View>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);
  const urgencyConfig = getUrgencyConfig(ticket.urgency);
  const currentStatusIndex = getCurrentStatusIndex();

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Ticket Number Header */}
      <View style={s.headerCard}>
        <View style={s.ticketNumberRow}>
          <Text style={s.ticketNumber}>#{ticket.ticketNumber}</Text>
          {/* Status Badge */}
          <View style={[s.statusBadge, { backgroundColor: statusConfig.color }]}>
            <MaterialCommunityIcons name={statusConfig.icon} size={14} color="#FFFFFF" />
            <Text style={s.statusBadgeText}>{statusConfig.label}</Text>
          </View>
        </View>
        <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginTop: theme.spacing.xs }]}>
          {t('service.createdOn')} {formatRelativeTime(ticket.createdAt)}
        </Text>
      </View>

      {/* Details Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('service.details')}</Text>

        {/* Type */}
        <View style={s.detailRow}>
          <View style={s.detailLabel}>
            <MaterialCommunityIcons name={getTypeIcon(ticket.type)} size={18} color={theme.colors.textSecondary} />
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm }]}>
              {t('service.ticketType')}
            </Text>
          </View>
          <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.medium }]}>
            {t(`ticket.type.${ticket.type}`)}
          </Text>
        </View>

        {/* Urgency */}
        <View style={s.detailRow}>
          <View style={s.detailLabel}>
            <MaterialCommunityIcons name={urgencyConfig.icon} size={18} color={urgencyConfig.color} />
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm }]}>
              {t('service.urgency')}
            </Text>
          </View>
          <Text style={[theme.typography.styles.body, { color: urgencyConfig.color, fontWeight: theme.typography.weights.medium }]}>
            {urgencyConfig.label}
          </Text>
        </View>

        {/* Created */}
        <View style={s.detailRow}>
          <View style={s.detailLabel}>
            <MaterialCommunityIcons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.sm }]}>
              {t('service.created')}
            </Text>
          </View>
          <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
            {new Date(ticket.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Customer Card (staff view) */}
      {isStaff && ticket.creator && ticket.creator.role === 'customer' && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            const customerId = ticket.creator._id || ticket.creator.id;
            const name = [ticket.creator.firstName, ticket.creator.lastName].filter(Boolean).join(' ') || ticket.creator.username || '';
            navigation.navigate('CustomerProfile', { customerId, customerName: name });
          }}
        >
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('service.customer', 'Kunde')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {ticket.creator.profilePicture ? (
                <Image
                  source={{ uri: (ticket.creator.profilePicture.startsWith('/uploads') ? getServerUrl() : '') + ticket.creator.profilePicture }}
                  style={{ width: 48, height: 48, borderRadius: 24, marginRight: theme.spacing.md }}
                />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 24, marginRight: theme.spacing.md, backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="account" size={26} color={theme.colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold }]}>
                  {[ticket.creator.firstName, ticket.creator.lastName].filter(Boolean).join(' ') || ticket.creator.username}
                </Text>
                {ticket.creator.customerNumber ? (
                  <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>
                    {t('customerProfile.customerNumber', 'Kundennr.')}: {ticket.creator.customerNumber}
                  </Text>
                ) : null}
                {ticket.creator.phone ? (
                  <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>{ticket.creator.phone}</Text>
                ) : null}
                {ticket.creator.email ? (
                  <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>{ticket.creator.email}</Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textTertiary} />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Description Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('service.description')}</Text>
        <Text style={[theme.typography.styles.body, { color: theme.colors.text, lineHeight: 22 }]}>
          {ticket.description}
        </Text>
      </View>

      {/* Attachments Card (only when the ticket has images) */}
      {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('service.attachments', 'Anhänge')} ({ticket.attachments.length})</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {ticket.attachments.map((att, idx) => {
              const rawUrl = typeof att === 'string' ? att : (att.url || att.uri || '');
              const uri = rawUrl.startsWith('http') ? rawUrl : `${getServerUrl()}${rawUrl}`;
              if (!rawUrl) return null;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ImageViewer', { uri })}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: 96, height: 96, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Status Timeline */}
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('service.statusTimeline')}</Text>
        {STATUS_ORDER.map((statusStep, index) => {
          const stepConfig = getStatusConfig(statusStep);
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isLast = index === STATUS_ORDER.length - 1;

          return (
            <View key={statusStep} style={{ flexDirection: 'row' }}>
              {/* Timeline Indicator */}
              <View style={{ alignItems: 'center', width: 32 }}>
                <View
                  style={[
                    s.timelineDot,
                    {
                      backgroundColor: isCompleted ? stepConfig.color : theme.colors.border,
                      borderWidth: isCurrent ? 2 : 0,
                      borderColor: isCurrent ? stepConfig.color : 'transparent',
                    },
                    isCurrent && { backgroundColor: theme.colors.card },
                  ]}
                >
                  {isCompleted && !isCurrent && (
                    <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                  )}
                  {isCurrent && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: theme.borderRadius.round,
                        backgroundColor: stepConfig.color,
                      }}
                    />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      s.timelineLine,
                      {
                        backgroundColor: isCompleted && index < currentStatusIndex
                          ? stepConfig.color
                          : theme.colors.border,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Status Label */}
              <View style={{ flex: 1, paddingBottom: theme.spacing.md, paddingLeft: theme.spacing.sm }}>
                <Text
                  style={[
                    theme.typography.styles.body,
                    {
                      color: isCompleted ? theme.colors.text : theme.colors.textTertiary,
                      fontWeight: isCurrent ? theme.typography.weights.bold : theme.typography.weights.regular,
                    },
                  ]}
                >
                  {stepConfig.label}
                </Text>
                {isCurrent && ticket.updatedAt && (
                  <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginTop: 2 }]}>
                    {formatRelativeTime(ticket.updatedAt)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Open Chat Button */}
      <View style={s.chatButtonContainer}>
        <Button
          title={t('service.openChat')}
          onPress={handleOpenChat}
          icon={<MaterialCommunityIcons name="chat-outline" size={20} color="#FFFFFF" />}
          fullWidth
        />
      </View>

      <View style={{ height: theme.spacing.xxl }} />
    </ScrollView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerCard: {
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    },
    ticketNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ticketNumber: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      fontFamily: 'monospace',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    statusBadgeText: {
      ...theme.typography.styles.small,
      color: '#FFFFFF',
      fontWeight: theme.typography.weights.semiBold,
      marginLeft: theme.spacing.xs,
    },
    card: {
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    },
    cardTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.md,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    detailLabel: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timelineDot: {
      width: 20,
      height: 20,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 20,
    },
    chatButtonContainer: {
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
  });
