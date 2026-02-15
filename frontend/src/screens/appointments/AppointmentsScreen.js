import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import NoCustomerNumberGate from '../../components/shared/NoCustomerNumberGate';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { usePagination } from '../../hooks/usePagination';
import { appointmentsApi } from '../../api/appointments';
import { parseDateSafe as parseDateOnly } from '../../utils/formatters';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import OfflineBanner from '../../components/ui/OfflineBanner';
import Button from '../../components/ui/Button';
import AppointmentCard from '../../components/appointment/AppointmentCard';
import AppointmentRequestsScreen from './AppointmentRequestsScreen';
import OngoingAppointmentsScreen from './OngoingAppointmentsScreen';
import UnregisteredAppointmentsScreen from './UnregisteredAppointmentsScreen';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';

// Platform-safe alert that works on web too
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

const STAFF_ROLES = ['admin', 'super_admin', 'service_manager', 'robby_manager'];

export default function AppointmentsScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme, isDark, setThemeMode } = useTheme();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const isStaff = user && STAFF_ROLES.includes(user.role);
  const hasCustomerNumber = !!user?.customerNumber;

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('upcoming');
  const [initialLoad, setInitialLoad] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const {
    items: appointments,
    loading,
    refreshing,
    hasMore,
    fetchItems,
    loadMore,
    refresh,
  } = usePagination(appointmentsApi.getAppointments);

  // Customer tabs (visible to all)
  const customerTabs = useMemo(() => [
    { key: 'upcoming', label: t('appointments.upcoming') },
    { key: 'past', label: t('appointments.past') },
  ], [t]);

  // Staff-only tabs
  const staffTabs = useMemo(() => [
    { key: 'requests', label: t('appointments.requests') },
    { key: 'unregistered', label: t('appointments.unregistered') },
    { key: 'ongoing', label: t('appointments.ongoing') },
  ], [t]);

  const isStaffTab = activeTab === 'requests' || activeTab === 'unregistered' || activeTab === 'ongoing';

  const isFirstLoad = useRef(true);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    fetchItems().then(() => setInitialLoad(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      refreshRef.current();
    }, [])
  );

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    if (activeTab === 'upcoming') {
      return appointments.filter((a) => {
        // Appointments without date (pending) are always upcoming
        if (!a.date) return a.status !== 'cancelled' && a.status !== 'completed';
        const appointmentDate = parseDateOnly(a.date);
        return appointmentDate >= now && a.status !== 'cancelled';
      });
    }
    return appointments.filter((a) => {
      if (!a.date) return a.status === 'cancelled' || a.status === 'completed';
      const appointmentDate = parseDateOnly(a.date);
      return appointmentDate < now || a.status === 'cancelled' || a.status === 'completed';
    });
  }, [appointments, activeTab]);

  const handleAppointmentPress = useCallback((appointment) => {
    navigation.navigate('AppointmentDetail', { appointmentId: appointment._id || appointment.id });
  }, [navigation]);

  const handleNewAppointment = useCallback(() => {
    navigation.navigate('NewAppointment');
  }, [navigation]);

  const toggleDarkMode = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  // Accept a proposed appointment directly from the list
  const handleAcceptProposal = useCallback((appointment) => {
    const id = appointment._id || appointment.id;
    const doAccept = async () => {
      try {
        setActionLoadingId(id);
        await appointmentsApi.respondToProposal(id, { accept: true });
        showToast({ type: 'success', message: t('appointments.proposalAccepted') });
        refresh();
      } catch {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      } finally {
        setActionLoadingId(null);
      }
    };

    showAlert(
      t('appointments.acceptProposal'),
      t('common.areYouSure'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: doAccept },
      ]
    );
  }, [t, refresh, showToast]);

  // Decline a proposed appointment – navigate to detail for more options
  const handleDeclineProposal = useCallback((appointment) => {
    const id = appointment._id || appointment.id;
    navigation.navigate('AppointmentDetail', { appointmentId: id });
  }, [navigation]);

  const renderSkeletons = () => (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3].map((key) => (
        <View
          key={key}
          style={{
            marginBottom: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            flexDirection: 'row',
            ...theme.shadows.md,
          }}
        >
          <View style={{ width: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginRight: theme.spacing.md }} />
          <View style={{ flex: 1 }}>
            <SkeletonLoader width={100} height={12} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.sm }} />
            <SkeletonLoader width={180} height={16} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={80} height={12} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.sm }} />
            <SkeletonLoader width={120} height={12} borderRadius={theme.borderRadius.sm} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderAppointment = useCallback(({ item }) => (
    <AppointmentCard
      appointment={item}
      onPress={() => handleAppointmentPress(item)}
      onAccept={!isStaff && item.status === 'proposed' ? handleAcceptProposal : undefined}
      onDecline={!isStaff && item.status === 'proposed' ? handleDeclineProposal : undefined}
      actionLoading={actionLoadingId === (item._id || item.id)}
      style={{ marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md, maxWidth: 600, alignSelf: 'center', width: '100%' }}
    />
  ), [handleAppointmentPress, handleAcceptProposal, handleDeclineProposal, actionLoadingId, isStaff, theme]);

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
        icon="calendar-blank-outline"
        title={t('appointments.noAppointments')}
        message={t('appointments.noAppointments')}
        actionLabel={t('appointments.newAppointment')}
        onAction={handleNewAppointment}
      />
    );
  };

  const s = styles(theme);

  // Block customers without customer number
  if (!isStaff && !hasCustomerNumber) {
    return <NoCustomerNumberGate>{null}</NoCustomerNumberGate>;
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header - matching Feed style */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.primary} />
          <Text style={s.headerTitle}>{t('appointments.title')}</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[s.headerButton, { marginRight: theme.spacing.sm }]}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
            {unreadCount > 0 && (
              <Badge
                count={unreadCount}
                color={theme.colors.error}
                size="small"
                style={{ position: 'absolute', top: -4, right: -4 }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleDarkMode}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.headerButton}
          >
            <MaterialCommunityIcons
              name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA: Request appointment */}
      <View style={s.ctaRow}>
        <Button
          title={t('appointments.newAppointment')}
          onPress={handleNewAppointment}
          variant="primary"
          size="large"
          fullWidth
          icon={<MaterialCommunityIcons name="calendar-plus" size={20} color="#FFFFFF" />}
        />
      </View>

      {/* Customer Tabs */}
      <Tabs
        tabs={customerTabs}
        activeTab={!isStaffTab ? activeTab : null}
        onTabChange={handleTabChange}
      />

      {/* Staff Tabs – separate section */}
      {isStaff && (
        <View style={s.staffSection}>
          <View style={s.staffLabelRow}>
            <MaterialCommunityIcons name="shield-account-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={s.staffLabel}>{t('appointments.staffArea', 'Verwaltung')}</Text>
          </View>
          <Tabs
            tabs={staffTabs}
            activeTab={isStaffTab ? activeTab : null}
            onTabChange={handleTabChange}
          />
        </View>
      )}

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Content: Switch between own appointments, ongoing, unregistered, and requests */}
      {activeTab === 'requests' ? (
        <AppointmentRequestsScreen navigation={navigation} />
      ) : activeTab === 'unregistered' ? (
        <UnregisteredAppointmentsScreen navigation={navigation} />
      ) : activeTab === 'ongoing' ? (
        <OngoingAppointmentsScreen navigation={navigation} />
      ) : (
        <>
          {initialLoad ? (
            renderSkeletons()
          ) : (
            <FlatList
              data={filteredAppointments}
              renderItem={renderAppointment}
              keyExtractor={(item) => String(item._id || item.id)}
              contentContainerStyle={
                filteredAppointments.length === 0
                  ? { flex: 1, alignItems: 'center' }
                  : { paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl }
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
        </>
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
    ctaRow: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.headerBackground,
    },
    staffSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    staffLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs + 2,
    },
    staffLabel: {
      ...theme.typography.styles.small,
      color: theme.colors.textTertiary,
      fontWeight: theme.typography.weights.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      backgroundColor: theme.colors.headerBackground,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerTitle: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
