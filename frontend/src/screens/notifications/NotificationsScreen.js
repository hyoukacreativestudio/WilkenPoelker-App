import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../hooks/useNotifications';
import { usePagination } from '../../hooks/usePagination';
import { notificationsApi } from '../../api/notifications';
import { appointmentsApi } from '../../api/appointments';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import OfflineBanner from '../../components/ui/OfflineBanner';
import NotificationCard from '../../components/notification/NotificationCard';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

// Platform-safe alert
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        const yesBtn = buttons.find(b => b.style === 'destructive' || b.text?.toLowerCase() === 'ja');
        if (yesBtn?.onPress) yesBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      const btn = buttons?.find(b => b.onPress);
      if (btn) btn.onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const CATEGORY_FILTERS = [
  { key: 'all', category: null },
  { key: 'repair', category: 'repair' },
  { key: 'appointment', category: 'appointment' },
  { key: 'chat', category: 'chat' },
  { key: 'feed', category: 'feed' },
  { key: 'system', category: 'system' },
];

export default function NotificationsScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { fetchUnreadCount, decrementUnread, resetUnread } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [initialLoad, setInitialLoad] = useState(true);

  const {
    items: notifications,
    loading,
    refreshing,
    hasMore,
    fetchItems,
    loadMore,
    refresh,
    setItems,
  } = usePagination(notificationsApi.getNotifications);

  const markAllReadApi = useApi(notificationsApi.markAllAsRead);
  const markAsReadApi = useApi(notificationsApi.markAsRead);
  const deleteApi = useApi(notificationsApi.deleteNotification);
  const respondApi = useApi(appointmentsApi.respondToProposal);

  const tabs = useMemo(() => [
    { key: 'all', label: t('common.all') },
    { key: 'repair', label: t('notifications.repairUpdates') },
    { key: 'appointment', label: t('notifications.appointmentReminders') },
    { key: 'chat', label: t('notifications.chatMessages') },
    { key: 'feed', label: t('notifications.feedUpdates') },
    { key: 'system', label: t('notifications.systemNotifications') },
  ], [t]);

  useEffect(() => {
    loadInitialNotifications();
  }, []);

  const loadInitialNotifications = async () => {
    await fetchItems();
    setInitialLoad(false);
  };

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
    fetchUnreadCount();
  }, [refresh, fetchUnreadCount]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllReadApi.execute();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      resetUnread();
    } catch (err) {
      showAlert(t('common.error'), t('errors.somethingWentWrong'));
    }
  }, [markAllReadApi, setItems, resetUnread, t]);

  // Parse deepLink string or object into navigation params
  const parseDeepLink = useCallback((deepLink) => {
    if (!deepLink) return null;

    // Handle object format: { type: 'repair', id: '...' }
    if (typeof deepLink === 'object' && deepLink.type) {
      return deepLink;
    }

    // Handle string format: '/repairs/{id}', '/service/tickets/{id}/chat', etc.
    if (typeof deepLink === 'string') {
      const repairMatch = deepLink.match(/\/repairs\/([a-f0-9-]+)/i);
      if (repairMatch) return { type: 'repair', id: repairMatch[1] };

      const chatMatch = deepLink.match(/\/service\/tickets\/([a-f0-9-]+)\/chat/i);
      if (chatMatch) return { type: 'chat', id: chatMatch[1] };

      const ticketRateMatch = deepLink.match(/\/service\/tickets\/([a-f0-9-]+)\/rate/i);
      if (ticketRateMatch) return { type: 'ticket', id: ticketRateMatch[1] };

      const ticketMatch = deepLink.match(/\/service\/tickets\/([a-f0-9-]+)/i);
      if (ticketMatch) return { type: 'ticket', id: ticketMatch[1] };

      const appointmentMatch = deepLink.match(/\/appointments\/([a-f0-9-]+)/i);
      if (appointmentMatch) return { type: 'appointment', id: appointmentMatch[1] };

      const postMatch = deepLink.match(/\/feed\/post\/([a-f0-9-]+)/i);
      if (postMatch) return { type: 'post', id: postMatch[1] };
    }

    return null;
  }, []);

  const handleNotificationPress = useCallback(async (notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markAsReadApi.execute(notification._id || notification.id);
        setItems((prev) =>
          prev.map((n) => {
            if ((n._id || n.id) === (notification._id || notification.id)) {
              return { ...n, read: true };
            }
            return n;
          })
        );
        decrementUnread(1);
      } catch (err) {
        // Silently fail
      }
    }

    // Navigate via deepLink (string or object)
    const link = parseDeepLink(notification.deepLink);

    if (link) {
      if (link.type === 'repair' && link.id) {
        navigation.navigate('Repairs', { screen: 'RepairDetail', params: { repairId: link.id } });
      } else if (link.type === 'appointment' && link.id) {
        navigation.navigate('Appointments', { screen: 'AppointmentDetail', params: { appointmentId: link.id } });
      } else if (link.type === 'chat' && link.id) {
        navigation.navigate('Service', { screen: 'Chat', params: { ticketId: link.id } });
      } else if (link.type === 'ticket' && link.id) {
        navigation.navigate('Service', { screen: 'TicketDetail', params: { ticketId: link.id } });
      } else if (link.type === 'post' && link.id) {
        navigation.navigate('Feed', { screen: 'PostDetail', params: { postId: link.id } });
      }
    } else if (notification.category === 'repair' && (notification.relatedId || notification.referenceId)) {
      navigation.navigate('Repairs', { screen: 'RepairDetail', params: { repairId: notification.relatedId || notification.referenceId } });
    } else if (notification.category === 'appointment' && (notification.relatedId || notification.referenceId)) {
      navigation.navigate('Appointments', { screen: 'AppointmentDetail', params: { appointmentId: notification.relatedId || notification.referenceId } });
    } else if (notification.category === 'chat' && (notification.relatedId || notification.referenceId)) {
      navigation.navigate('Service', { screen: 'Chat', params: { ticketId: notification.relatedId || notification.referenceId } });
    }
  }, [markAsReadApi, navigation, setItems, decrementUnread, parseDeepLink]);

  const handleDeleteNotification = useCallback((notification) => {
    showAlert(
      t('common.delete'),
      t('common.areYouSure'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteApi.execute(notification._id || notification.id);
              setItems((prev) =>
                prev.filter((n) => (n._id || n.id) !== (notification._id || notification.id))
              );
              if (!notification.read) {
                decrementUnread(1);
              }
            } catch (err) {
              showAlert(t('common.error'), t('errors.somethingWentWrong'));
            }
          },
        },
      ]
    );
  }, [deleteApi, setItems, decrementUnread, t]);

  // Accept appointment proposal directly from notification
  const handleAcceptProposal = useCallback(async (notification, customerNote) => {
    const appointmentId = notification.relatedId;
    if (!appointmentId) return;

    try {
      await respondApi.execute(appointmentId, {
        accept: true,
        message: customerNote,
      });

      // Mark notification as read
      if (!notification.read) {
        try {
          await markAsReadApi.execute(notification._id || notification.id);
          decrementUnread(1);
        } catch {}
      }

      // Update the notification in the list to show it's been handled
      setItems((prev) =>
        prev.map((n) => {
          if ((n._id || n.id) === (notification._id || notification.id)) {
            return { ...n, read: true, type: 'appointment_confirmed' };
          }
          return n;
        })
      );

      showAlert(t('common.success'), t('appointments.proposalAccepted'));
      fetchUnreadCount();
    } catch (err) {
      showAlert(t('common.error'), t('errors.somethingWentWrong'));
    }
  }, [respondApi, markAsReadApi, setItems, decrementUnread, fetchUnreadCount, t]);

  // Decline appointment proposal directly from notification
  const handleDeclineProposal = useCallback(async (notification) => {
    const appointmentId = notification.relatedId;
    if (!appointmentId) return;

    try {
      await respondApi.execute(appointmentId, {
        accept: false,
      });

      // Mark notification as read
      if (!notification.read) {
        try {
          await markAsReadApi.execute(notification._id || notification.id);
          decrementUnread(1);
        } catch {}
      }

      // Update the notification in the list
      setItems((prev) =>
        prev.map((n) => {
          if ((n._id || n.id) === (notification._id || notification.id)) {
            return { ...n, read: true, type: 'appointment_declined' };
          }
          return n;
        })
      );

      showAlert(t('common.success'), t('appointments.proposalDeclined'));
      fetchUnreadCount();
    } catch (err) {
      showAlert(t('common.error'), t('errors.somethingWentWrong'));
    }
  }, [respondApi, markAsReadApi, setItems, decrementUnread, fetchUnreadCount, t]);

  const renderSkeletons = () => (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View
          key={key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
          }}
        >
          <SkeletonLoader width={40} height={40} borderRadius={theme.borderRadius.round} />
          <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
            <SkeletonLoader width={160} height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={220} height={12} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={80} height={10} borderRadius={theme.borderRadius.sm} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderNotification = useCallback(({ item }) => (
    <NotificationCard
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleDeleteNotification(item)}
      onAccept={handleAcceptProposal}
      onDecline={handleDeclineProposal}
      style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}
    />
  ), [handleNotificationPress, handleDeleteNotification, handleAcceptProposal, handleDeclineProposal, theme]);

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={{ paddingVertical: theme.spacing.lg, alignItems: 'center' }}>
        <SkeletonLoader width={200} height={16} borderRadius={theme.borderRadius.sm} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading || initialLoad) return null;
    return (
      <EmptyState
        icon="bell-off-outline"
        title={t('notifications.noNotifications')}
        message={t('notifications.noNotifications')}
      />
    );
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <OfflineBanner />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('notifications.title')}</Text>
        <TouchableOpacity
          onPress={handleMarkAllRead}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={markAllReadApi.loading}
        >
          <Text
            style={[
              theme.typography.styles.bodySmall,
              {
                color: theme.colors.primary,
                fontWeight: theme.typography.weights.semiBold,
              },
            ]}
          >
            {t('notifications.markAllRead')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Content */}
      {initialLoad ? (
        renderSkeletons()
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={
            filteredNotifications.length === 0
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.headerBackground,
    },
    headerTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
  });
