import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { serviceApi } from '../../api/service';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

function TicketCard({ ticket, onPress, theme, t }) {
  const creator = ticket.creator || ticket.User || {};
  const creatorName = creator.firstName
    ? `${creator.firstName} ${creator.lastName || ''}`
    : creator.username || t('chat.customer');
  const assignee = ticket.assignee || null;
  const assigneeName = assignee
    ? (assignee.firstName ? `${assignee.firstName} ${assignee.lastName || ''}` : assignee.username)
    : null;

  const createdAt = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const statusColors = {
    open: theme.colors.warning,
    in_progress: theme.colors.info || theme.colors.primary,
    confirmed: theme.colors.success,
    completed: theme.colors.success,
    cancelled: theme.colors.error,
    closed: theme.colors.textTertiary,
  };

  const statusLabels = {
    open: 'Offen',
    in_progress: 'In Bearbeitung',
    confirmed: 'Bestätigt',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
    closed: 'Geschlossen',
  };

  const categoryIcons = {
    bike: 'bicycle',
    cleaning: 'vacuum',
    motor: 'engine',
    general: 'help-circle-outline',
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(ticket)}
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{
        padding: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        {/* Category icon */}
        <View style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: (statusColors[ticket.status] || theme.colors.primary) + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}>
          <MaterialCommunityIcons
            name={categoryIcons[ticket.category] || 'help-circle-outline'}
            size={22}
            color={statusColors[ticket.status] || theme.colors.primary}
          />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          {/* Ticket number + status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
              #{ticket.ticketNumber}
            </Text>
            <View style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: statusColors[ticket.status] || theme.colors.textTertiary,
              marginLeft: 8,
              marginRight: 4,
            }} />
            <Text style={[theme.typography.styles.small, { color: statusColors[ticket.status] || theme.colors.textTertiary }]}>
              {statusLabels[ticket.status] || ticket.status}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold }]}
            numberOfLines={1}
          >
            {ticket.title || ticket.description?.slice(0, 50) || '–'}
          </Text>

          {/* Creator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <MaterialCommunityIcons name="account" size={14} color={theme.colors.textSecondary} />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>
              {creatorName}
            </Text>
            {assigneeName ? (
              <>
                <MaterialCommunityIcons name="arrow-right" size={12} color={theme.colors.textTertiary} />
                <MaterialCommunityIcons name="shield-account" size={14} color={theme.colors.primary} />
                <Text style={[theme.typography.styles.caption, { color: theme.colors.primary }]}>
                  {assigneeName}
                </Text>
              </>
            ) : null}
          </View>

          {/* Date */}
          <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary, marginTop: 4 }]}>
            {createdAt}
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminOpenTicketsScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await serviceApi.getAdminTickets({ tab: 'open', limit: 50 });
      setTickets(res.data?.tickets || res.data || []);
    } catch (err) {
      console.error('Failed to fetch admin tickets:', err);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    await fetchTickets();
    setLoading(false);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, [fetchTickets]);

  const handleTicketPress = useCallback((ticket) => {
    navigation.navigate('Service', {
      screen: 'TicketDetail',
      params: { ticketId: ticket.id || ticket._id },
    });
  }, [navigation]);

  const renderSkeleton = () => (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3, 4].map((key) => (
        <View key={key} style={{
          marginBottom: theme.spacing.md,
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <SkeletonLoader width={42} height={42} borderRadius={21} />
          <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
            <SkeletonLoader width={80} height={10} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={180} height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={120} height={12} borderRadius={theme.borderRadius.sm} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderItem = useCallback(({ item }) => (
    <TicketCard
      ticket={item}
      onPress={handleTicketPress}
      theme={theme}
      t={t}
    />
  ), [handleTicketPress, theme, t]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon="ticket-outline"
        title={t('adminTickets.noTickets')}
        message={t('adminTickets.noTickets')}
      />
    );
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || item._id)}
          contentContainerStyle={
            tickets.length === 0
              ? { flex: 1 }
              : { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });
