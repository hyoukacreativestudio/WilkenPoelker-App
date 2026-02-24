import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { serviceApi } from '../../api/service';
import { getServerUrl } from '../../api/client';
import { formatRelativeTime } from '../../utils/formatters';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

const STATUS_CONFIG = {
  open: { icon: 'circle-outline', colorKey: 'info' },
  in_progress: { icon: 'progress-clock', colorKey: 'warning' },
  confirmed: { icon: 'calendar-check', colorKey: 'info' },
  completed: { icon: 'check-circle', colorKey: 'success' },
  cancelled: { icon: 'cancel', colorKey: 'error' },
  closed: { icon: 'close-circle-outline', colorKey: 'textSecondary' },
};

export default function CustomerProfileScreen({ route, navigation }) {
  const { customerId, customerName } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerTickets();
  }, [customerId]);

  useEffect(() => {
    if (customer) {
      const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.username || '';
      navigation.setOptions({ title: name });
    }
  }, [customer, navigation]);

  const loadCustomerTickets = async () => {
    setLoading(true);
    try {
      const result = await serviceApi.getCustomerTickets(customerId);
      const data = result.data?.data;
      setCustomer(data?.customer || null);
      setTickets(data?.tickets || []);
    } catch (err) {
      showToast({ type: 'error', message: t('customerProfile.loadError') });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return theme.colors.textSecondary;
    return theme.colors[cfg.colorKey] || theme.colors.textSecondary;
  };

  const getStatusIcon = (status) => {
    return STATUS_CONFIG[status]?.icon || 'help-circle-outline';
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: t('ticket.status.open', 'Offen'),
      in_progress: t('ticket.status.inProgress', 'In Bearbeitung'),
      confirmed: t('ticket.status.confirmed', 'Bestätigt'),
      completed: t('ticket.status.completed', 'Abgeschlossen'),
      cancelled: t('ticket.status.cancelled', 'Storniert'),
      closed: t('ticket.status.closed', 'Geschlossen'),
    };
    return labels[status] || status;
  };

  const renderCustomerHeader = () => {
    if (!customer) return null;

    const avatar = customer.profilePicture
      ? (customer.profilePicture.startsWith('/uploads') ? `${getServerUrl()}${customer.profilePicture}` : customer.profilePicture)
      : null;
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.username || '';

    return (
      <View style={s.headerCard}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center' }]}>
            <MaterialCommunityIcons name="account" size={36} color={theme.colors.primary} />
          </View>
        )}
        <Text style={s.customerName}>{fullName}</Text>
        {customer.username && (
          <Text style={s.customerUsername}>@{customer.username}</Text>
        )}
        {customer.email && (
          <View style={s.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={s.infoText}>{customer.email}</Text>
          </View>
        )}
        {customer.customerNumber && (
          <View style={s.infoRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={s.infoText}>{t('customerProfile.customerNumber')}: {customer.customerNumber}</Text>
          </View>
        )}

        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statNumber}>{tickets.length}</Text>
            <Text style={s.statLabel}>{t('customerProfile.totalTickets')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.colors.divider }]} />
          <View style={s.statItem}>
            <Text style={s.statNumber}>{tickets.filter(t => t.status === 'closed' || t.status === 'completed').length}</Text>
            <Text style={s.statLabel}>{t('customerProfile.closedTickets')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.colors.divider }]} />
          <View style={s.statItem}>
            <Text style={s.statNumber}>{tickets.filter(t => t.status !== 'closed' && t.status !== 'completed' && t.status !== 'cancelled').length}</Text>
            <Text style={s.statLabel}>{t('customerProfile.activeTickets')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTicketItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const assigneeName = item.assignee
      ? (item.assignee.firstName || item.assignee.username || '')
      : null;

    return (
      <TouchableOpacity
        style={s.ticketCard}
        onPress={() => navigation.navigate('Chat', { ticketId: item.id })}
        activeOpacity={0.7}
      >
        <View style={s.ticketHeader}>
          <View style={s.ticketTitleRow}>
            <Text style={s.ticketNumber}>#{item.ticketNumber}</Text>
            <View style={[s.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <MaterialCommunityIcons name={getStatusIcon(item.status)} size={12} color={statusColor} />
              <Text style={[s.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
            </View>
          </View>
          <Text style={s.ticketTitle} numberOfLines={1}>
            {item.title || item.type}
          </Text>
        </View>

        <Text style={s.ticketDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={s.ticketFooter}>
          <View style={s.ticketMeta}>
            <MaterialCommunityIcons name="calendar-outline" size={13} color={theme.colors.textTertiary} />
            <Text style={s.ticketMetaText}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          {item.messageCount > 0 && (
            <View style={s.ticketMeta}>
              <MaterialCommunityIcons name="chat-outline" size={13} color={theme.colors.textTertiary} />
              <Text style={s.ticketMetaText}>{item.messageCount}</Text>
            </View>
          )}
          {assigneeName && (
            <View style={s.ticketMeta}>
              <MaterialCommunityIcons name="account-outline" size={13} color={theme.colors.textTertiary} />
              <Text style={s.ticketMetaText}>{assigneeName}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const s = styles(theme);

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
        data={tickets}
        renderItem={renderTicketItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderCustomerHeader}
        ListEmptyComponent={
          <EmptyState
            icon="ticket-outline"
            title={t('customerProfile.noTickets')}
            message={t('customerProfile.noTicketsMessage')}
          />
        }
        contentContainerStyle={
          tickets.length === 0
            ? { flex: 1 }
            : { paddingBottom: theme.spacing.xxl }
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
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
      padding: theme.spacing.xl,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    customerName: {
      ...theme.typography.styles.h3,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    customerUsername: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    infoText: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
      alignSelf: 'stretch',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statNumber: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
    },
    statLabel: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 30,
    },
    sectionTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    ticketCard: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    ticketHeader: {
      marginBottom: theme.spacing.xs,
    },
    ticketTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    ticketNumber: {
      ...theme.typography.styles.caption,
      color: theme.colors.textTertiary,
      fontWeight: '600',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    statusText: {
      ...theme.typography.styles.caption,
      marginLeft: 4,
      fontWeight: '500',
    },
    ticketTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
    ticketDescription: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    ticketFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    ticketMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ticketMetaText: {
      ...theme.typography.styles.caption,
      color: theme.colors.textTertiary,
      marginLeft: 3,
    },
  });
