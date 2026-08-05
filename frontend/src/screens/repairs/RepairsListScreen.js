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
  ordered: '#E53E3E',
  in_repair: '#E53E3E',
  quote_created: '#E53E3E',
  parts_ordered: '#E53E3E',
  repair_done: '#ECC94B',
  ready: '#38A169',
  completed: '#2D8659',
  // Leasing
  leasing_in_progress: '#E53E3E',
  // Neu / Verkauf
  sale_in_progress: '#E53E3E',
  sale_test_drive: '#ECC94B',
};

const ACTIVE_STATUSES = [
  'ordered', 'in_repair', 'quote_created', 'parts_ordered', 'repair_done', 'ready',
  'leasing_in_progress',
  'sale_in_progress', 'sale_test_drive',
];

// App tabs for the customer's own repairs (matches Repair.category)
const CATEGORY_TABS = ['reparatur', 'neu', 'leasing'];

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
  const [categoryTab, setCategoryTab] = useState('reparatur');

  // Staff outreach list (Taifun orders without an app account)
  const [outreach, setOutreach] = useState([]);
  const [outreachCounts, setOutreachCounts] = useState({ open: 0, reached: 0, total: 0 });
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachFilter, setOutreachFilter] = useState('open'); // 'open' | 'all'

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

  // Active repairs for the currently selected category tab. Repairs without a
  // category (app-created) fall back to 'reparatur'.
  const displayedRepairs = useMemo(() => {
    return myRepairs.filter(
      (r) => ACTIVE_STATUSES.includes(r.status) && (r.category || 'reparatur') === categoryTab
    );
  }, [myRepairs, categoryTab]);

  // Per-category counts for the tab badges.
  const categoryCounts = useMemo(() => {
    const counts = { reparatur: 0, neu: 0, leasing: 0 };
    myRepairs.forEach((r) => {
      if (!ACTIVE_STATUSES.includes(r.status)) return;
      const cat = r.category || 'reparatur';
      if (counts[cat] !== undefined) counts[cat] += 1;
    });
    return counts;
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

  // Fetch the staff outreach list (customers without an app account to call)
  const fetchOutreach = useCallback(async (filter) => {
    setOutreachLoading(true);
    try {
      const res = await repairsApi.getOutreach({ filter: filter || outreachFilter, scope: 'no_account' });
      const data = res?.data?.data || res?.data;
      setOutreach(data?.items || []);
      setOutreachCounts(data?.counts || { open: 0, reached: 0, total: 0 });
    } catch (e) {
      // silent — staff can pull-to-refresh
    } finally {
      setOutreachLoading(false);
    }
  }, [outreachFilter]);

  useEffect(() => {
    if (isStaff && adminSectionOpen && adminTab === 'kontakte') {
      fetchOutreach();
    }
  }, [isStaff, adminSectionOpen, adminTab, outreachFilter, fetchOutreach]);

  // Toggle "reached" for one customer (optimistic)
  const toggleReached = useCallback(async (item) => {
    const next = !item.reachedAt;
    const nowIso = new Date().toISOString();
    setOutreach((prev) => prev.map((o) => (o.nr === item.nr ? { ...o, reachedAt: next ? nowIso : null } : o)));
    setOutreachCounts((c) => ({ ...c, open: c.open + (next ? -1 : 1), reached: c.reached + (next ? 1 : -1) }));
    try {
      await repairsApi.markOutreachReached(item.nr, next);
    } catch (e) {
      // revert on failure
      setOutreach((prev) => prev.map((o) => (o.nr === item.nr ? { ...o, reachedAt: item.reachedAt } : o)));
      setOutreachCounts((c) => ({ ...c, open: c.open + (next ? 1 : -1), reached: c.reached + (next ? -1 : 1) }));
    }
  }, []);

  const getStatusLabel = useCallback((status, category) => {
    // 'ready' is shared across categories; leasing shows its own label.
    if (status === 'ready' && category === 'leasing') {
      return t('repairs.statusLeasingDone', 'Leasing abgeschlossen');
    }
    const labels = {
      ordered: t('repairs.statusOrdered', 'Bestellt'),
      in_repair: t('repairs.statusInRepair'),
      quote_created: t('repairs.statusQuoteCreated'),
      parts_ordered: t('repairs.statusPartsOrdered'),
      repair_done: t('repairs.statusRepairDone'),
      ready: t('repairs.statusReady'),
      completed: t('repairs.statusCompleted', 'Abgeschlossen'),
      leasing_in_progress: t('repairs.statusLeasingInProgress', 'Leasing in Bearbeitung'),
      sale_in_progress: t('repairs.statusInProgress', 'In Bearbeitung'),
      sale_test_drive: t('repairs.statusTestDrive', 'Zur Probefahrt'),
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
              {getStatusLabel(item.status, item.category)}
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
              {getStatusLabel(item.status, item.category)}
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

  // Category tabs for the customer's own repairs: Reparatur / Neu / Leasing
  const renderCategoryTabs = () => {
    const tabs = [
      { key: 'reparatur', label: t('repairs.categoryReparatur', 'Reparatur'), count: categoryCounts.reparatur, icon: 'wrench-outline' },
      { key: 'neu', label: t('repairs.categoryNeu', 'Neu'), count: categoryCounts.neu, icon: 'star-outline' },
      { key: 'leasing', label: t('repairs.categoryLeasing', 'Leasing'), count: categoryCounts.leasing, icon: 'bike' },
    ];

    return (
      <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.headerBackground, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }}>
        {tabs.map((tab) => {
          const isActive = categoryTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => setCategoryTab(tab.key)}
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

  // Admin Tab Bar
  const renderAdminTabs = () => {
    const tabs = [
      { key: 'open', label: t('repairs.tabOpen', 'Offen'), count: openCount, icon: 'wrench-outline' },
      { key: 'ready', label: t('repairs.tabReady', 'Fertig'), count: readyCount, icon: 'check-circle-outline' },
      { key: 'archived', label: t('repairs.tabArchived', 'Abgeschlossen'), count: archivedCount, icon: 'archive-outline' },
      { key: 'kontakte', label: t('repairs.tabContacts', 'Kontakte'), count: outreachCounts.open, icon: 'phone-outline' },
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

  // One customer in the staff outreach (contact) list
  const renderOutreachItem = (item) => {
    const reached = !!item.reachedAt;
    const tel = item.phone || item.mobile;
    return (
      <View
        key={String(item.nr)}
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginHorizontal: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          opacity: reached ? 0.6 : 1,
          borderLeftWidth: 4,
          borderLeftColor: reached ? '#38A169' : '#ECC94B',
          ...theme.shadows.sm,
        }}
      >
        {/* Name + status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.bold, flex: 1 }]} numberOfLines={1}>
            {item.customerName || item.kdNr || t('repairs.unknownCustomer', 'Unbekannter Kunde')}
          </Text>
          {item.appStatusLabel ? (
            <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary, marginLeft: theme.spacing.sm }]} numberOfLines={1}>
              {item.appStatusLabel}
            </Text>
          ) : null}
        </View>

        {/* Address + order info */}
        {(item.city || item.info) ? (
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginBottom: theme.spacing.xs }]} numberOfLines={1}>
            {[item.zip, item.city].filter(Boolean).join(' ')}{item.info ? `  ·  ${item.info}` : ''}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.xs }}>
          {/* Call */}
          {tel ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${tel}`)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialCommunityIcons name="phone" size={16} color={theme.colors.primary} />
              <Text style={[theme.typography.styles.caption, { color: theme.colors.primary, marginLeft: 4 }]}>{tel}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
              {t('repairs.noPhone', 'Keine Nummer')}
            </Text>
          )}

          {/* Reached toggle */}
          <TouchableOpacity
            onPress={() => toggleReached(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 4,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.borderRadius.round,
              backgroundColor: reached ? '#38A169' : 'transparent',
              borderWidth: reached ? 0 : 1,
              borderColor: theme.colors.border,
            }}
          >
            <MaterialCommunityIcons
              name={reached ? 'check-circle' : 'circle-outline'}
              size={16}
              color={reached ? '#FFFFFF' : theme.colors.textSecondary}
            />
            <Text style={[theme.typography.styles.small, { marginLeft: 4, color: reached ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: theme.typography.weights.semiBold }]}>
              {reached ? t('repairs.contactReached', 'Erreicht') : t('repairs.contactMarkReached', 'Erreicht?')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // The whole outreach (contact) list, shown under the admin "Kontakte" tab
  const renderOutreachList = () => (
    <View style={{ marginTop: theme.spacing.xs }}>
      {/* Filter: only-open vs all */}
      <View style={{ flexDirection: 'row', marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
        {[
          { key: 'open', label: `${t('repairs.contactsOpen', 'Offen')} (${outreachCounts.open})` },
          { key: 'all', label: `${t('repairs.contactsAll', 'Alle')} (${outreachCounts.total})` },
        ].map((f) => {
          const active = outreachFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setOutreachFilter(f.key)}
              style={{
                paddingVertical: 4,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.borderRadius.round,
                backgroundColor: active ? theme.colors.primary : 'transparent',
                borderWidth: active ? 0 : 1,
                borderColor: theme.colors.border,
                marginRight: theme.spacing.sm,
              }}
            >
              <Text style={[theme.typography.styles.small, { color: active ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: theme.typography.weights.semiBold }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => fetchOutreach()} style={{ marginLeft: 'auto', padding: 4 }}>
          <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }]}>
        {t('repairs.contactsHint', 'Kunden ohne App-Konto – von oben nach unten abtelefonieren und als erreicht markieren.')}
      </Text>

      {outreachLoading && outreach.length === 0 ? (
        <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
          <SkeletonLoader width={200} height={16} borderRadius={theme.borderRadius.sm} />
        </View>
      ) : outreach.length === 0 ? (
        <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
          <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary }]}>
            {t('repairs.contactsNone', 'Keine offenen Kontakte')}
          </Text>
        </View>
      ) : (
        outreach.map((item) => renderOutreachItem(item))
      )}
    </View>
  );

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
              {adminTab === 'kontakte' ? (
                renderOutreachList()
              ) : allLoading && allRepairs.length === 0 ? (
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

      {/* Category tabs: Reparatur / Neu / Leasing */}
      {!initialLoad && renderCategoryTabs()}

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
