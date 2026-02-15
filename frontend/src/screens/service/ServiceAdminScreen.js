import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { usePagination } from '../../hooks/usePagination';
import { serviceApi } from '../../api/service';
import TicketCard from '../../components/service/TicketCard';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

const TABS = ['open', 'mine', 'all'];

export default function ServiceAdminScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('open');

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  const fetchTickets = useCallback(
    (params) => serviceApi.getAdminTickets({ ...params, tab: activeTab }),
    [activeTab]
  );

  const {
    items: tickets,
    loading,
    refreshing,
    fetchItems,
    refresh,
  } = usePagination(fetchTickets, 20);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const handleTicketPress = useCallback(
    (ticket) => {
      navigation.navigate('TicketDetail', { ticketId: ticket._id || ticket.id });
    },
    [navigation]
  );

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'open':
        return t('serviceAdmin.tabOpen');
      case 'mine':
        return t('serviceAdmin.tabMine');
      case 'all':
        return t('serviceAdmin.tabAll');
      default:
        return tab;
    }
  };

  const renderTicket = ({ item }) => (
    <TicketCard
      ticket={item}
      onPress={() => handleTicketPress(item)}
      style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    const emptyMessages = {
      open: { icon: 'inbox-outline', title: t('serviceAdmin.noOpenTickets') },
      mine: { icon: 'account-check-outline', title: t('serviceAdmin.noAssignedTickets') },
      all: { icon: 'ticket-outline', title: t('serviceAdmin.noTickets') },
    };
    const msg = emptyMessages[activeTab] || emptyMessages.all;
    return <EmptyState icon={msg.icon} title={msg.title} />;
  };

  const renderSkeletons = () => (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3, 4].map((key) => (
        <View
          key={key}
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }}
        >
          <SkeletonLoader width="50%" height={16} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.sm }} />
          <SkeletonLoader width="100%" height={12} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
          <SkeletonLoader width="30%" height={12} borderRadius={theme.borderRadius.sm} />
        </View>
      ))}
    </View>
  );

  const s = styles(theme);

  const visibleTabs = isAdmin ? TABS : TABS.filter((tab) => tab !== 'all');

  return (
    <SafeAreaView style={s.container}>
      {/* Tab Bar */}
      <View style={s.tabBar}>
        {visibleTabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {getTabLabel(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticket List */}
      {loading && tickets.length === 0 ? (
        renderSkeletons()
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={
            tickets.length === 0
              ? { flex: 1, justifyContent: 'center' }
              : { paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
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
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.bold,
    },
  });
