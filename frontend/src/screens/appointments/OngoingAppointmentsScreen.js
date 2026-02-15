import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { usePagination } from '../../hooks/usePagination';
import { appointmentsApi } from '../../api/appointments';
import AppointmentCard from '../../components/appointment/AppointmentCard';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

export default function OngoingAppointmentsScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [initialLoad, setInitialLoad] = useState(true);

  const {
    items: ongoing,
    loading,
    refreshing,
    hasMore,
    fetchItems,
    loadMore,
    refresh,
  } = usePagination(appointmentsApi.getOngoingAppointments);

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

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const handlePress = useCallback((appointment) => {
    navigation.navigate('AppointmentDetail', { appointmentId: appointment._id || appointment.id });
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

  const renderItem = useCallback(({ item }) => {
    const customer = item.customer;
    const customerName = customer
      ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
      : null;

    return (
      <View style={{ marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
        {/* Customer info badge above the card */}
        {customerName && (
          <View style={[s.customerBadge, { backgroundColor: theme.colors.card, ...theme.shadows.sm }]}>
            <View style={[s.customerAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[s.customerInitials, { color: theme.colors.primary }]}>
                {(customer.firstName?.[0] || '') + (customer.lastName?.[0] || '')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.customerName, { color: theme.colors.text }]} numberOfLines={1}>
                {customerName}
              </Text>
              {customer.customerNumber && (
                <Text style={[s.customerNumber, { color: theme.colors.primary }]}>
                  Kundennr. {customer.customerNumber}
                </Text>
              )}
            </View>
            {customer.phone && (
              <View style={s.customerContact}>
                <MaterialCommunityIcons name="phone-outline" size={13} color={theme.colors.textTertiary} />
              </View>
            )}
          </View>
        )}

        {/* Customer note below badge */}
        {item.customerNote && (
          <View style={[s.customerNoteBadge, { backgroundColor: theme.colors.card, ...theme.shadows.sm }]}>
            <MaterialCommunityIcons name="note-text-outline" size={13} color={theme.colors.textTertiary} />
            <Text style={[s.customerNoteText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {item.customerNote}
            </Text>
          </View>
        )}

        <AppointmentCard
          appointment={item}
          onPress={() => handlePress(item)}
        />
      </View>
    );
  }, [handlePress, theme]);

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
        icon="calendar-check-outline"
        title={t('appointments.noOngoing')}
        message={t('appointments.noOngoingMessage')}
      />
    );
  };

  const s = styles(theme);

  if (initialLoad) {
    return renderSkeletons();
  }

  return (
    <FlatList
      data={ongoing}
      renderItem={renderItem}
      keyExtractor={(item) => String(item._id || item.id)}
      contentContainerStyle={
        ongoing.length === 0
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
  );
}

const styles = (theme) =>
  StyleSheet.create({
    customerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    customerAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    customerInitials: {
      fontSize: 12,
      fontWeight: '700',
    },
    customerName: {
      fontSize: 13,
      fontWeight: '600',
    },
    customerNumber: {
      fontSize: 11,
      fontWeight: '600',
    },
    customerContact: {
      padding: 4,
    },
    customerNoteBadge: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 2,
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    customerNoteText: {
      fontSize: 12,
      flex: 1,
      lineHeight: 16,
    },
  });
