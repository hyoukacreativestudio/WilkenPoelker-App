import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { usePagination } from '../../hooks/usePagination';
import { repairsApi } from '../../api/repairs';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../../components/ui/EmptyState';
import OfflineBanner from '../../components/ui/OfflineBanner';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import NoCustomerNumberGate from '../../components/shared/NoCustomerNumberGate';

// Ampelfarben: Rot = In Bearbeitung, Gelb = Fertig, Grün = Abholbereit
const STATUS_COLORS = {
  in_repair: '#E53E3E',
  quote_created: '#E53E3E',
  parts_ordered: '#E53E3E',
  repair_done: '#ECC94B',
  ready: '#38A169',
  completed: '#2D8659',
};

const ACTIVE_STATUSES = ['in_repair', 'quote_created', 'parts_ordered', 'repair_done', 'ready'];

// Rollen die alle Reparaturen sehen dürfen
const STAFF_ROLES = ['admin', 'super_admin', 'service_manager', 'bike_manager', 'cleaning_manager', 'motor_manager', 'robby_manager'];

// Admin tabs
const ADMIN_TABS = ['open', 'ready', 'archived'];

export default function RepairsListScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const isStaff = user && STAFF_ROLES.includes(user.role);
  const hasCustomerNumber = !!user?.customerNumber;

  const [initialLoad, setInitialLoad] = useState(true);
  const [adminTab, setAdminTab] = useState('open');

  // Admin-Bereich: aufklappbar
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);

  // Eigene Reparaturen
  const {
    items: myRepairs,
    loading: myLoading,
    refreshing: myRefreshing,
    hasMore: myHasMore,
    fetchItems: fetchMyRepairs,
    loadMore: loadMoreMy,
    refresh: refreshMy,
  } = usePagination(repairsApi.getRepairs);

  // Alle Reparaturen (nur für Staff)
  const {
    items: allRepairs,
    loading: allLoading,
    refreshing: allRefreshing,
    hasMore: allHasMore,
    fetchItems: fetchAllRepairs,
    loadMore: loadMoreAll,
    refresh: refreshAll,
  } = usePagination(repairsApi.getAllRepairs);

  useEffect(() => {
    loadInitialRepairs();
  }, []);

  const loadInitialRepairs = async () => {
    if (isStaff) {
      await Promise.all([fetchMyRepairs(), fetchAllRepairs()]);
    } else {
      await fetchMyRepairs();
    }
    setInitialLoad(false);
  };

  const handleRefresh = useCallback(() => {
    refreshMy();
    if (isStaff) refreshAll();
  }, [isStaff, refreshAll, refreshMy]);

  const handleLoadMore = useCallback(() => {
    if (myHasMore && !myLoading) loadMoreMy();
  }, [myHasMore, myLoading, loadMoreMy]);

  const displayedRepairs = useMemo(() => {
    return myRepairs.filter((r) => ACTIVE_STATUSES.includes(r.status));
  }, [myRepairs]);

  // Admin tab filtered repairs
  const adminOpenRepairs = useMemo(() => {
    return allRepairs.filter((r) => r.status !== 'ready' || (!r.acknowledgedAt && !r.archivedAt));
  }, [allRepairs]);

  const adminReadyRepairs = useMemo(() => {
    return allRepairs.filter((r) => r.status === 'ready' && !r.archivedAt);
  }, [allRepairs]);

  const adminArchivedRepairs = useMemo(() => {
    return allRepairs.filter((r) => r.archivedAt);
  }, [allRepairs]);

  const getAdminTabRepairs = useCallback(() => {
    switch (adminTab) {
      case 'open':
        // All repairs that are still in progress (not ready, not completed, not archived)
        return allRepairs.filter((r) => r.status !== 'ready' && r.status !== 'completed' && !r.archivedAt);
      case 'ready':
        // Ready repairs (not archived) - split by acknowledged/not
        return allRepairs.filter((r) => r.status === 'ready' && !r.archivedAt);
      case 'archived':
        // Completed or explicitly archived repairs
        return allRepairs.filter((r) => r.archivedAt || r.status === 'completed');
      default:
        return [];
    }
  }, [adminTab, allRepairs]);

  const adminTabRepairs = useMemo(() => getAdminTabRepairs(), [getAdminTabRepairs]);

  // Tab counts
  const openCount = useMemo(() => allRepairs.filter((r) => r.status !== 'ready' && r.status !== 'completed' && !r.archivedAt).length, [allRepairs]);
  const readyCount = useMemo(() => allRepairs.filter((r) => r.status === 'ready' && !r.archivedAt).length, [allRepairs]);
  const archivedCount = useMemo(() => allRepairs.filter((r) => r.archivedAt || r.status === 'completed').length, [allRepairs]);

  const getStatusLabel = useCallback((status) => {
    const labels = {
      in_repair: t('repairs.statusInRepair'),
      quote_created: t('repairs.statusQuoteCreated'),
      parts_ordered: t('repairs.statusPartsOrdered'),
      repair_done: t('repairs.statusRepairDone'),
      ready: t('repairs.statusReady'),
      completed: t('repairs.statusCompleted', 'Abgeschlossen'),
    };
    return labels[status] || status;
  }, [t]);

  const renderSkeletons = () => (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3, 4].map((key) => (
        <View
          key={key}
          style={{
            marginBottom: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
            <SkeletonLoader width={120} height={14} borderRadius={theme.borderRadius.sm} />
            <SkeletonLoader width={80} height={24} borderRadius={theme.borderRadius.round} />
          </View>
          <SkeletonLoader width={180} height={16} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.sm }} />
          <SkeletonLoader width={100} height={12} borderRadius={theme.borderRadius.sm} />
        </View>
      ))}
    </View>
  );

  // Normale Reparatur-Karte (eigene Reparaturen)
  const renderRepairItem = useCallback(({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || theme.colors.textSecondary;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('RepairDetail', { repairId: item._id || item.id })}
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginHorizontal: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          ...theme.shadows.sm,
        }}
      >
        {/* Top row: Repair number + Taifun ID + Status badge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
          <View>
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>
              {t('repairs.repairNumber')} {item.repairNumber || item.number}
            </Text>
            {item.taifunRepairId ? (
              <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary, marginTop: 2 }]}>
                Taifun: {item.taifunRepairId}
              </Text>
            ) : null}
          </View>
          <View style={{ backgroundColor: statusColor, borderRadius: theme.borderRadius.round, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 }}>
            <Text style={[theme.typography.styles.small, { color: '#FFFFFF', fontWeight: theme.typography.weights.semiBold }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Device name with status indicator dot */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor, marginRight: theme.spacing.xs }} />
          <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.bold, flex: 1 }]} numberOfLines={1}>
            {item.deviceName || item.device}
          </Text>
        </View>

        {/* Date */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.colors.textTertiary} />
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginLeft: theme.spacing.xs }]}>
            {formatDate(item.createdAt || item.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [theme, navigation, t, getStatusLabel]);

  // Admin Reparatur-Karte (mit Kundenname + Kundennummer im Titel)
  const renderAdminRepairItem = useCallback(({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || theme.colors.textSecondary;
    const isReady = item.status === 'ready';
    const isAcknowledged = !!item.acknowledgedAt;

    // Farbcodierung für ready-Reparaturen: gelb = nicht bestätigt, grün = bestätigt
    let cardBorderColor = 'transparent';
    if (isReady && !item.archivedAt) {
      cardBorderColor = isAcknowledged ? '#38A169' : '#ECC94B';
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('RepairDetail', { repairId: item._id || item.id })}
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginHorizontal: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          borderLeftWidth: isReady && !item.archivedAt ? 4 : 0,
          borderLeftColor: cardBorderColor,
          ...theme.shadows.sm,
        }}
      >
        {/* Kundenname + Kundennummer als Titel */}
        {item.customer && (
          <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing.xs }]} numberOfLines={1}>
            {item.customer.firstName} {item.customer.lastName}
            {item.customer.customerNumber ? ` (${item.customer.customerNumber})` : ''}
          </Text>
        )}

        {/* Device name + Status badge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: theme.spacing.sm }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor, marginRight: theme.spacing.xs }} />
            <Text style={[theme.typography.styles.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
              {item.deviceName || item.device}
            </Text>
          </View>
          <View style={{ backgroundColor: statusColor, borderRadius: theme.borderRadius.round, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 }}>
            <Text style={[theme.typography.styles.small, { color: '#FFFFFF', fontWeight: theme.typography.weights.semiBold }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Repair number + Date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
            {item.repairNumber || item.number}
          </Text>
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
            {formatDate(item.createdAt || item.date)}
          </Text>
        </View>

        {/* Telefonnummer (bei Klick anrufen) */}
        {item.customer?.phone && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              Linking.openURL(`tel:${item.customer.phone}`);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}
          >
            <MaterialCommunityIcons name="phone-outline" size={14} color={theme.colors.primary} />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.primary, marginLeft: theme.spacing.xs }]}>
              {item.customer.phone}
            </Text>
          </TouchableOpacity>
        )}

        {/* Acknowledged indicator for ready tab */}
        {isReady && !item.archivedAt && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
            <MaterialCommunityIcons
              name={isAcknowledged ? 'check-circle' : 'clock-outline'}
              size={14}
              color={isAcknowledged ? '#38A169' : '#ECC94B'}
            />
            <Text style={[theme.typography.styles.small, { color: isAcknowledged ? '#38A169' : '#ECC94B', marginLeft: 4 }]}>
              {isAcknowledged ? t('repairs.acknowledged') : t('repairs.notAcknowledged', 'Nicht bestätigt')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [theme, navigation, t, getStatusLabel]);

  const renderFooter = () => {
    if (!myLoading || myRefreshing) return null;
    return (
      <View style={{ paddingVertical: theme.spacing.lg, alignItems: 'center' }}>
        <SkeletonLoader width={200} height={16} borderRadius={theme.borderRadius.sm} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (myLoading || initialLoad) return null;
    return (
      <EmptyState
        icon="wrench-outline"
        title={t('repairs.noRepairs')}
        message={t('repairs.noRepairs')}
      />
    );
  };

  // Admin Tab Bar
  const renderAdminTabs = () => {
    const tabs = [
      { key: 'open', label: t('repairs.tabOpen', 'Offen'), count: openCount, icon: 'wrench-outline' },
      { key: 'ready', label: t('repairs.tabReady', 'Fertig'), count: readyCount, icon: 'check-circle-outline' },
      { key: 'archived', label: t('repairs.tabArchived', 'Abgeschlossen'), count: archivedCount, icon: 'archive-outline' },
    ];

    return (
      <View style={{ flexDirection: 'row', marginHorizontal: theme.spacing.md, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
        {tabs.map((tab) => {
          const isActive = adminTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => setAdminTab(tab.key)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? theme.colors.primary : 'transparent',
              }}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={16}
                color={isActive ? theme.colors.primary : theme.colors.textTertiary}
              />
              <Text style={[
                theme.typography.styles.small,
                {
                  color: isActive ? theme.colors.primary : theme.colors.textTertiary,
                  fontWeight: isActive ? theme.typography.weights.bold : theme.typography.weights.regular,
                  marginLeft: 4,
                },
              ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={{
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.textTertiary + '40',
                  borderRadius: theme.borderRadius.round,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  marginLeft: 4,
                  minWidth: 18,
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: theme.typography.weights.bold }}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Admin-Bereich als Footer in der FlatList
  const renderListFooter = () => (
    <View>
      {renderFooter()}

      {/* Admin/Service-Manager Bereich */}
      {isStaff && !initialLoad && (
        <View style={{ marginTop: theme.spacing.lg }}>
          {/* Admin-Balken */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAdminSectionOpen((prev) => !prev);
              if (!adminSectionOpen && allRepairs.length === 0) {
                fetchAllRepairs();
              }
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.primary + '15',
              borderTopWidth: 2,
              borderTopColor: theme.colors.primary,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm + 2,
              marginHorizontal: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="shield-account-outline" size={20} color={theme.colors.primary} />
              <Text style={[
                theme.typography.styles.body,
                { color: theme.colors.primary, fontWeight: theme.typography.weights.bold, marginLeft: theme.spacing.sm },
              ]}>
                {t('repairs.allRepairs', 'Alle Reparaturen')}
              </Text>
              {allRepairs.length > 0 && (
                <View style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.borderRadius.round,
                  paddingHorizontal: 8,
                  paddingVertical: 1,
                  marginLeft: theme.spacing.sm,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: theme.typography.weights.bold }}>
                    {allRepairs.length}
                  </Text>
                </View>
              )}
            </View>
            <MaterialCommunityIcons
              name={adminSectionOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.colors.primary}
            />
          </TouchableOpacity>

          {/* Admin-Reparaturliste mit Tabs */}
          {adminSectionOpen && (
            <View style={{ marginTop: theme.spacing.xs }}>
              {/* Tab Bar */}
              {renderAdminTabs()}

              {/* Tab Content */}
              {allLoading && allRepairs.length === 0 ? (
                <View style={{ padding: theme.spacing.md }}>
                  {[1, 2].map((key) => (
                    <View
                      key={key}
                      style={{
                        marginBottom: theme.spacing.sm,
                        backgroundColor: theme.colors.card,
                        borderRadius: theme.borderRadius.lg,
                        padding: theme.spacing.md,
                        marginHorizontal: theme.spacing.md,
                      }}
                    >
                      <SkeletonLoader width={150} height={14} borderRadius={theme.borderRadius.sm} />
                    </View>
                  ))}
                </View>
              ) : adminTabRepairs.length === 0 ? (
                <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
                  <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary }]}>
                    {t('repairs.noRepairs')}
                  </Text>
                </View>
              ) : (
                <>
                  {adminTabRepairs.map((item) => (
                    <View key={String(item._id || item.id)}>
                      {renderAdminRepairItem({ item })}
                    </View>
                  ))}
                  {allHasMore && (
                    <TouchableOpacity
                      onPress={loadMoreAll}
                      style={{
                        alignItems: 'center',
                        paddingVertical: theme.spacing.md,
                        marginHorizontal: theme.spacing.md,
                      }}
                    >
                      <Text style={[theme.typography.styles.body, { color: theme.colors.primary, fontWeight: theme.typography.weights.semiBold }]}>
                        {t('common.loadMore', 'Mehr laden...')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: theme.spacing.lg }} />
    </View>
  );

  const s = styles(theme);

  // Block customers without customer number
  if (!isStaff && !hasCustomerNumber) {
    return <NoCustomerNumberGate>{null}</NoCustomerNumberGate>;
  }

  return (
    <SafeAreaView style={s.container}>
      <OfflineBanner />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('repairs.title')}</Text>
      </View>

      {/* Content */}
      {initialLoad ? (
        renderSkeletons()
      ) : (
        <FlatList
          data={displayedRepairs}
          renderItem={renderRepairItem}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={
            displayedRepairs.length === 0 && !isStaff
              ? { flex: 1 }
              : { paddingTop: theme.spacing.md }
          }
          refreshControl={
            <RefreshControl
              refreshing={myRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={!isStaff ? renderEmpty : null}
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
