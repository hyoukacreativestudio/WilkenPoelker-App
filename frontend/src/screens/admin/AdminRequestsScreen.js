import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { customerNumberApi } from '../../api/customerNumber';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
// Badge import removed – using inline styled tags instead

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

function RequestCard({ request, onApprove, onReject, theme, t }) {
  const [customerNumber, setCustomerNumber] = useState('');
  const [expanded, setExpanded] = useState(false);

  const user = request.requester || request.User || {};
  const userName = user.firstName
    ? `${user.firstName} ${user.lastName || ''}`
    : user.username || '–';
  const userEmail = user.email || '';
  const address = request.address || {};
  const isExisting = request.isExistingCustomer;
  const createdAt = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const statusColors = {
    pending: theme.colors.warning,
    approved: theme.colors.success,
    rejected: theme.colors.error,
  };

  const statusLabels = {
    pending: t('customerNumber.statusPending'),
    approved: t('adminRequests.approved'),
    rejected: t('adminRequests.rejected'),
  };

  return (
    <View style={{
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
        style={{
          padding: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Avatar */}
        <View style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: isExisting ? theme.colors.primary + '15' : theme.colors.warning + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}>
          <MaterialCommunityIcons
            name={isExisting ? 'account-check' : 'account-plus'}
            size={22}
            color={isExisting ? theme.colors.primary : theme.colors.warning}
          />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold }]}>
            {userName}
          </Text>
          <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {userEmail}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            <View style={{
              backgroundColor: (isExisting ? theme.colors.primary : theme.colors.warning) + '15',
              borderRadius: theme.borderRadius.sm,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}>
              <Text style={[theme.typography.styles.small, { color: isExisting ? theme.colors.primary : theme.colors.warning, fontWeight: theme.typography.weights.semiBold }]}>
                {isExisting ? t('adminRequests.existingCustomer') : t('adminRequests.newCustomer')}
              </Text>
            </View>
            <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary }]}>
              {createdAt}
            </Text>
          </View>
        </View>

        {/* Status dot */}
        <View style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: statusColors[request.status] || theme.colors.textTertiary,
          marginLeft: theme.spacing.sm,
        }} />
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={{
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          paddingTop: theme.spacing.md,
        }}>
          {/* Phone */}
          {request.phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <MaterialCommunityIcons name="phone" size={16} color={theme.colors.textSecondary} />
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, marginLeft: theme.spacing.sm }]}>
                {request.phone}
              </Text>
            </View>
          ) : null}

          {/* Address */}
          {address.street || address.zip || address.city ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.sm }}>
              <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, marginLeft: theme.spacing.sm, flex: 1 }]}>
                {[address.street, `${address.zip || ''} ${address.city || ''}`.trim()].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}

          {/* Message */}
          {request.message ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.sm }}>
              <MaterialCommunityIcons name="message-text" size={16} color={theme.colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text, marginLeft: theme.spacing.sm, flex: 1 }]}>
                {request.message}
              </Text>
            </View>
          ) : null}

          {/* Status info for already processed */}
          {request.status !== 'pending' && (
            <View style={{
              backgroundColor: statusColors[request.status] + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.sm,
            }}>
              <Text style={[theme.typography.styles.bodySmall, { color: statusColors[request.status], fontWeight: theme.typography.weights.semiBold }]}>
                {statusLabels[request.status]}
                {request.assignedCustomerNumber ? ` — ${request.assignedCustomerNumber}` : ''}
              </Text>
              {request.reviewNote ? (
                <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                  {request.reviewNote}
                </Text>
              ) : null}
            </View>
          )}

          {/* Actions for pending */}
          {request.status === 'pending' && (
            <View>
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  color: theme.colors.text,
                  ...theme.typography.styles.body,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  marginBottom: theme.spacing.sm,
                }}
                placeholder={t('adminRequests.customerNumberInput')}
                placeholderTextColor={theme.colors.textTertiary}
                value={customerNumber}
                onChangeText={setCustomerNumber}
                autoCapitalize="none"
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <TouchableOpacity
                  onPress={() => {
                    if (!customerNumber.trim()) {
                      showAlert(t('common.error'), t('adminRequests.customerNumberInput'));
                      return;
                    }
                    onApprove(request, customerNumber.trim());
                  }}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.success,
                    borderRadius: theme.borderRadius.md,
                    paddingVertical: theme.spacing.sm + 2,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  <Text style={[theme.typography.styles.bodySmall, { color: '#FFFFFF', fontWeight: theme.typography.weights.semiBold }]}>
                    {t('adminRequests.approve')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onReject(request)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.error + '15',
                    borderRadius: theme.borderRadius.md,
                    paddingVertical: theme.spacing.sm + 2,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <MaterialCommunityIcons name="close" size={18} color={theme.colors.error} />
                  <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.error, fontWeight: theme.typography.weights.semiBold }]}>
                    {t('adminRequests.reject')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function AdminRequestsScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  const tabs = [
    { key: 'pending', label: t('customerNumber.statusPending') },
    { key: 'approved', label: t('adminRequests.approved') },
    { key: 'rejected', label: t('adminRequests.rejected') },
  ];

  const fetchRequests = useCallback(async (status) => {
    try {
      const res = await customerNumberApi.getAllRequests(status || activeTab);
      setRequests(res.data?.requests || res.data || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  }, [activeTab]);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    await fetchRequests('pending');
    setLoading(false);
  };

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setLoading(true);
    fetchRequests(tab).finally(() => setLoading(false));
  }, [fetchRequests]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests(activeTab);
    setRefreshing(false);
  }, [fetchRequests, activeTab]);

  const handleApprove = useCallback(async (request, customerNumber) => {
    try {
      await customerNumberApi.approveRequest(request.id || request._id, customerNumber);
      showAlert(t('common.success'), t('adminRequests.approved'));
      fetchRequests(activeTab);
    } catch (err) {
      const msg = err.response?.data?.message || t('errors.somethingWentWrong');
      showAlert(t('common.error'), msg);
    }
  }, [fetchRequests, activeTab, t]);

  const handleReject = useCallback((request) => {
    if (Platform.OS === 'web') {
      const note = window.prompt(t('adminRequests.reject') + ':\n');
      if (note !== null) {
        doReject(request, note);
      }
    } else {
      Alert.prompt?.(
        t('adminRequests.reject'),
        '',
        (note) => doReject(request, note),
        'plain-text',
        ''
      ) || doReject(request, '');
    }
  }, []);

  const doReject = async (request, note) => {
    try {
      await customerNumberApi.rejectRequest(request.id || request._id, note || '');
      showAlert(t('common.success'), t('adminRequests.rejected'));
      fetchRequests(activeTab);
    } catch (err) {
      showAlert(t('common.error'), t('errors.somethingWentWrong'));
    }
  };

  const renderSkeleton = () => (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3].map((key) => (
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
            <SkeletonLoader width={140} height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={200} height={12} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width={80} height={10} borderRadius={theme.borderRadius.sm} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderItem = useCallback(({ item }) => (
    <RequestCard
      request={item}
      onApprove={handleApprove}
      onReject={handleReject}
      theme={theme}
      t={t}
    />
  ), [handleApprove, handleReject, theme, t]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        icon="account-question-outline"
        title={t('adminRequests.noRequests')}
        message={t('adminRequests.noRequests')}
      />
    );
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id || item._id)}
          contentContainerStyle={
            requests.length === 0
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
