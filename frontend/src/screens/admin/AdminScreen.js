import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { adminApi } from '../../api/admin';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import Divider from '../../components/ui/Divider';
import SearchBar from '../../components/ui/SearchBar';
import { getInitials } from '../../utils/helpers';
import { useToast } from '../../components/ui/Toast';

const ALL_ROLES = [
  'customer',
  'bike_manager',
  'cleaning_manager',
  'motor_manager',
  'service_manager',
  'robby_manager',
  'admin',
  'super_admin',
];

const ROLE_COLORS = {
  customer: '#4CAF50',
  bike_manager: '#2196F3',
  cleaning_manager: '#00BCD4',
  motor_manager: '#FF9800',
  service_manager: '#9C27B0',
  robby_manager: '#E91E63',
  admin: '#F44336',
  super_admin: '#B71C1C',
};

const ROLE_ICONS = {
  customer: 'account',
  bike_manager: 'bicycle',
  cleaning_manager: 'spray-bottle',
  motor_manager: 'engine',
  service_manager: 'wrench',
  robby_manager: 'robot',
  admin: 'shield-account',
  super_admin: 'shield-crown',
};

export default function AdminScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  // Dashboard state
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  // Role change modal state
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [roleChanging, setRoleChanging] = useState(false);

  // Direct message modal state
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageUser, setMessageUser] = useState(null);
  const [dmTitle, setDmTitle] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [dmSending, setDmSending] = useState(false);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRoles, setBroadcastRoles] = useState([]);
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Audit log state
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // Yearly overview state
  const [yearlyData, setYearlyData] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyExpanded, setYearlyExpanded] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchUsers();
    fetchAuditLog();
  }, []);

  const fetchDashboard = async () => {
    try {
      setDashboardLoading(true);
      const response = await adminApi.getDashboard();
      setDashboard(response.data?.data || response.data);
    } catch {
      // Silently fail
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await adminApi.getUsers();
      const userData = response.data?.data || response.data;
      setUsers(Array.isArray(userData) ? userData : []);
    } catch {
      // Silently fail
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAuditLog = async () => {
    try {
      setAuditLoading(true);
      const response = await adminApi.getAuditLog();
      const logData = response.data?.data || response.data;
      setAuditLog(Array.isArray(logData) ? logData : []);
    } catch {
      // Silently fail
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchYearlyOverview = async (year) => {
    try {
      setYearlyLoading(true);
      const response = await adminApi.getYearlyOverview(year);
      setYearlyData(response.data?.data || response.data);
    } catch {
      // Silently fail
    } finally {
      setYearlyLoading(false);
    }
  };

  const toggleYearlyOverview = () => {
    const next = !yearlyExpanded;
    setYearlyExpanded(next);
    if (next && !yearlyData) {
      fetchYearlyOverview(selectedYear);
    }
  };

  const handleYearChange = (delta) => {
    const newYear = selectedYear + delta;
    setSelectedYear(newYear);
    fetchYearlyOverview(newYear);
  };

  const doSendBroadcast = async () => {
    try {
      setBroadcastSending(true);
      const response = await adminApi.sendBroadcast({
        title: broadcastTitle,
        message: broadcastMessage,
        roles: broadcastRoles.length > 0 ? broadcastRoles : undefined,
      });
      const count = response.data?.data?.recipientCount ?? response.data?.recipientCount;
      if (count === 0) {
        showToast({ type: 'warning', message: t('admin.broadcastNoRecipients') });
        return;
      }
      const successMsg = count
        ? t('admin.broadcastSentCount', { count })
        : t('admin.broadcastSentMessage');
      showToast({ type: 'success', message: successMsg });
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastRoles([]);
    } catch {
      showToast({ type: 'error', message: t('admin.broadcastError') });
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast({ type: 'error', message: t('admin.broadcastFieldsRequired') });
      return;
    }

    const targetLabel = broadcastRoles.length === 0
      ? t('admin.target_all')
      : broadcastRoles.map((r) => t(`admin.roles.${r}`, r)).join(', ');

    const confirmTitle = t('admin.confirmBroadcast');
    const confirmMessage = t('admin.confirmBroadcastMessage', { target: targetLabel });

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`${confirmTitle}\n\n${confirmMessage}`)) {
        doSendBroadcast();
      }
    } else {
      Alert.alert(confirmTitle, confirmMessage, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('admin.send'), onPress: doSendBroadcast },
      ]);
    }
  };

  const toggleBroadcastRole = (role) => {
    setBroadcastRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleAllBroadcastRoles = () => {
    setBroadcastRoles((prev) => (prev.length === ALL_ROLES.length ? [] : [...ALL_ROLES]));
  };

  const handleUserPress = (user) => {
    const userName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name || user.email;

    const options = [
      { text: t('admin.changeRole'), onPress: () => openRoleModal(user) },
      { text: t('admin.sendMessage'), onPress: () => openMessageModal(user) },
      { text: t('common.cancel'), style: 'cancel' },
    ];

    if (Platform.OS === 'web') {
      // On web, just open role modal by default (message via broadcast section)
      openRoleModal(user);
    } else {
      Alert.alert(userName, t('admin.userActionPrompt'), options);
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    const currentRoles = [user.role];
    if (Array.isArray(user.permissions)) {
      user.permissions.forEach((p) => {
        if (ALL_ROLES.includes(p) && !currentRoles.includes(p)) {
          currentRoles.push(p);
        }
      });
    }
    setSelectedRoles(currentRoles);
    setRoleModalVisible(true);
  };

  const openMessageModal = (user) => {
    setMessageUser(user);
    setDmTitle('');
    setDmMessage('');
    setMessageModalVisible(true);
  };

  const handleSendDirectMessage = async () => {
    if (!dmTitle.trim() || !dmMessage.trim()) {
      showToast({ type: 'error', message: t('admin.broadcastFieldsRequired') });
      return;
    }

    try {
      setDmSending(true);
      const userId = messageUser.id || messageUser._id;
      await adminApi.sendDirectMessage(userId, { title: dmTitle, message: dmMessage });
      const name = messageUser.firstName || messageUser.email;
      showToast({ type: 'success', message: t('admin.messageSent', { name }) });
      setMessageModalVisible(false);
      setMessageUser(null);
      setDmTitle('');
      setDmMessage('');
    } catch {
      showToast({ type: 'error', message: t('admin.messageError') });
    } finally {
      setDmSending(false);
    }
  };

  const toggleRole = (role) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        // Don't allow deselecting the last role
        if (prev.length <= 1) return prev;
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || selectedRoles.length === 0) return;

    const userId = selectedUser.id || selectedUser._id;
    const userName = selectedUser.firstName && selectedUser.lastName
      ? `${selectedUser.firstName} ${selectedUser.lastName}`
      : selectedUser.name || selectedUser.email;

    // Determine primary role (highest in hierarchy)
    const ROLE_PRIORITY = {
      super_admin: 8, admin: 7, bike_manager: 5, cleaning_manager: 5,
      motor_manager: 5, service_manager: 5, robby_manager: 5, customer: 1,
    };
    const sorted = [...selectedRoles].sort((a, b) => (ROLE_PRIORITY[b] || 0) - (ROLE_PRIORITY[a] || 0));
    const primaryRole = sorted[0];
    const extraRoles = sorted.slice(1);

    try {
      setRoleChanging(true);
      // Update primary role
      if (primaryRole !== selectedUser.role) {
        await adminApi.changeUserRole(userId, primaryRole);
      }
      // Update extra roles as permissions
      const existingPerms = Array.isArray(selectedUser.permissions)
        ? selectedUser.permissions.filter((p) => !ALL_ROLES.includes(p))
        : [];
      const newPermissions = [...existingPerms, ...extraRoles];
      await adminApi.updatePermissions(userId, newPermissions);

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          (u.id || u._id) === userId
            ? { ...u, role: primaryRole, permissions: newPermissions }
            : u
        )
      );
      showToast({ type: 'success', message: t('admin.roleChangeSuccess', { name: userName }) });
      fetchAuditLog();
    } catch (err) {
      const msg = err?.response?.data?.message || t('admin.roleChangeError');
      showToast({ type: 'error', message: msg });
    } finally {
      setRoleChanging(false);
      setRoleModalVisible(false);
      setSelectedUser(null);
      setSelectedRoles([]);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const search = userSearch.toLowerCase();
    const name = (u.firstName || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const getRoleBadgeColor = (role) => {
    return ROLE_COLORS[role] || theme.colors.info;
  };

  const s = styles(theme);

  const dashboardCards = [
    {
      key: 'totalUsers',
      label: t('admin.totalUsers'),
      value: dashboard?.totalUsers ?? '-',
      icon: 'account-group',
      color: theme.colors.info,
    },
    {
      key: 'activeTickets',
      label: t('admin.activeTickets'),
      value: dashboard?.activeTickets ?? '-',
      icon: 'ticket-outline',
      color: theme.colors.warning,
    },
    {
      key: 'completedRepairs',
      label: t('admin.completedRepairs'),
      value: dashboard?.completedRepairs ?? '-',
      icon: 'wrench-outline',
      color: theme.colors.success,
    },
    {
      key: 'avgRating',
      label: t('admin.averageRating'),
      value: dashboard?.averageRating != null
        ? Number(dashboard.averageRating).toFixed(1)
        : '-',
      icon: 'star-outline',
      color: theme.colors.accent.orange,
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      >
        {/* Dashboard Cards */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('admin.dashboard')}</Text>
          {dashboardLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <View style={s.dashboardGrid}>
              {dashboardCards.map((card) => (
                <Card key={card.key} style={s.dashboardCard}>
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={28}
                    color={card.color}
                  />
                  <Text style={[s.dashboardValue, { color: theme.colors.text }]}>
                    {card.value}
                  </Text>
                  <Text
                    style={[
                      theme.typography.styles.caption,
                      { color: theme.colors.textSecondary, textAlign: 'center' },
                    ]}
                    numberOfLines={1}
                  >
                    {card.label}
                  </Text>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Yearly Overview (collapsible) */}
        <View style={s.section}>
          <TouchableOpacity onPress={toggleYearlyOverview} activeOpacity={0.7} style={s.collapsibleHeader}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={theme.colors.primary} />
            <Text style={[s.sectionTitle, { flex: 1, marginBottom: 0, marginLeft: theme.spacing.sm }]}>{t('admin.yearlyOverview')}</Text>
            <MaterialCommunityIcons
              name={yearlyExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {yearlyExpanded && (
          <>
          {/* Year selector */}
          <View style={[s.yearSelector, { marginTop: theme.spacing.md }]}>
            <TouchableOpacity onPress={() => handleYearChange(-1)} hitSlop={8}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[theme.typography.styles.h5, { color: theme.colors.text, fontWeight: theme.typography.weights.bold, marginHorizontal: theme.spacing.lg }]}>
              {selectedYear}
            </Text>
            <TouchableOpacity
              onPress={() => handleYearChange(1)}
              disabled={selectedYear >= new Date().getFullYear()}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={28}
                color={selectedYear >= new Date().getFullYear() ? theme.colors.textTertiary : theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {yearlyLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : yearlyData ? (
            <>
              {/* Overall Stats */}
              <Card style={{ marginBottom: theme.spacing.md }}>
                <View style={s.overallHeader}>
                  <MaterialCommunityIcons name="chart-box-outline" size={22} color={theme.colors.primary} />
                  <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.bold, marginLeft: theme.spacing.sm }]}>
                    {t('admin.overallStats')} — {yearlyData.overall?.staffCount || 0} {t('admin.staffMembers')}
                  </Text>
                </View>
                <View style={s.overallGrid}>
                  <View style={s.overallItem}>
                    <MaterialCommunityIcons name="ticket-outline" size={20} color={theme.colors.info} />
                    <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>{t('admin.tickets')}</Text>
                    <Text style={[theme.typography.styles.h5, { color: theme.colors.text, fontWeight: theme.typography.weights.bold }]}>
                      {yearlyData.overall?.tickets?.completed || 0}
                    </Text>
                    <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary }]}>
                      / {yearlyData.overall?.tickets?.total || 0}
                    </Text>
                  </View>
                  <View style={s.overallItem}>
                    <MaterialCommunityIcons name="wrench-outline" size={20} color={theme.colors.success} />
                    <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>{t('admin.repairs')}</Text>
                    <Text style={[theme.typography.styles.h5, { color: theme.colors.text, fontWeight: theme.typography.weights.bold }]}>
                      {yearlyData.overall?.repairs?.completed || 0}
                    </Text>
                    <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary }]}>
                      / {yearlyData.overall?.repairs?.total || 0}
                    </Text>
                  </View>
                  <View style={s.overallItem}>
                    <MaterialCommunityIcons name="calendar-check-outline" size={20} color={theme.colors.warning} />
                    <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>{t('admin.appointments')}</Text>
                    <Text style={[theme.typography.styles.h5, { color: theme.colors.text, fontWeight: theme.typography.weights.bold }]}>
                      {yearlyData.overall?.appointments?.completed || 0}
                    </Text>
                    <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary }]}>
                      / {yearlyData.overall?.appointments?.total || 0}
                    </Text>
                  </View>
                  <View style={s.overallItem}>
                    <MaterialCommunityIcons name="star-outline" size={20} color={theme.colors.accent?.orange || '#FF9800'} />
                    <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}>{t('admin.rating')}</Text>
                    <Text style={[theme.typography.styles.h5, { color: theme.colors.text, fontWeight: theme.typography.weights.bold }]}>
                      {yearlyData.overall?.rating?.average ?? '-'}
                    </Text>
                    <Text style={[theme.typography.styles.small, { color: theme.colors.textTertiary }]}>
                      ({yearlyData.overall?.rating?.count || 0})
                    </Text>
                  </View>
                </View>
                {yearlyData.overall?.repairs?.revenue > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                    <MaterialCommunityIcons name="cash-multiple" size={18} color={theme.colors.success} />
                    <Text style={[theme.typography.styles.body, { color: theme.colors.text, marginLeft: theme.spacing.sm }]}>
                      {t('admin.revenue')}: {yearlyData.overall.repairs.revenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </Text>
                  </View>
                )}
              </Card>

              {/* Employee Ranking */}
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, fontWeight: theme.typography.weights.medium, marginBottom: theme.spacing.sm }]}>
                {t('admin.employeeRanking')}
              </Text>
              {[...yearlyData.employees]
                .sort((a, b) => {
                  const scoreA = a.tickets.completed + a.appointments.completed;
                  const scoreB = b.tickets.completed + b.appointments.completed;
                  return scoreB - scoreA;
                })
                .map((emp, index) => {
                  const roleColor = ROLE_COLORS[emp.role] || theme.colors.info;

                  return (
                    <Card key={emp.id} style={{ marginBottom: theme.spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[s.rankBadge, { backgroundColor: index < 3 ? (index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32') + '20' : theme.colors.background }]}>
                          {index < 3 ? (
                            <MaterialCommunityIcons name="medal-outline" size={18} color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} />
                          ) : (
                            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textTertiary, fontWeight: theme.typography.weights.bold }]}>
                              {index + 1}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                          <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold }]} numberOfLines={1}>
                            {emp.firstName} {emp.lastName}
                          </Text>
                          <Text style={[theme.typography.styles.caption, { color: roleColor }]}>
                            {t(`admin.roles.${emp.role}`, emp.role)}
                          </Text>
                        </View>
                        {emp.rating.average !== null ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="star" size={16} color={theme.colors.accent?.orange || '#FF9800'} />
                            <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: theme.typography.weights.bold, marginLeft: 2 }]}>
                              {emp.rating.average}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
                            {t('admin.noRating')}
                          </Text>
                        )}
                      </View>
                      <View style={[s.empStatsRow, { marginTop: theme.spacing.sm }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="ticket-outline" size={16} color={theme.colors.info} />
                          <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
                            {emp.tickets.completed} {t('admin.tickets')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="calendar-check-outline" size={16} color={theme.colors.warning} />
                          <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
                            {emp.appointments.completed} {t('admin.appointments')}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
            </>
          ) : null}
          </>
          )}
        </View>

        {/* User Management */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('admin.userManagement')}</Text>
          <SearchBar
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder={t('admin.searchUsers')}
            style={{ marginBottom: theme.spacing.md }}
          />
          {usersLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <Card>
              {filteredUsers.length === 0 ? (
                <Text
                  style={[
                    theme.typography.styles.body,
                    { color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.md },
                  ]}
                >
                  {t('admin.noUsersFound')}
                </Text>
              ) : (
                filteredUsers.slice(0, 20).map((u, index) => (
                  <React.Fragment key={u._id || u.id || index}>
                    <TouchableOpacity
                      onPress={() => handleUserPress(u)}
                      activeOpacity={0.7}
                      style={s.userRow}
                    >
                      <View style={[s.userAvatar, { backgroundColor: theme.colors.primary + '30' }]}>
                        <Text
                          style={[
                            theme.typography.styles.bodySmall,
                            { color: theme.colors.primary, fontWeight: theme.typography.weights.bold },
                          ]}
                        >
                          {getInitials(u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name || '')}
                        </Text>
                      </View>
                      <View style={s.userInfo}>
                        <Text
                          style={[theme.typography.styles.body, { color: theme.colors.text }]}
                          numberOfLines={1}
                        >
                          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name || t('admin.unknownUser')}
                        </Text>
                        <Text
                          style={[theme.typography.styles.caption, { color: theme.colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {u.email}
                        </Text>
                      </View>
                      <Badge
                        count={1}
                        showZero
                        color={getRoleBadgeColor(u.role)}
                        style={{ minWidth: 'auto', paddingHorizontal: theme.spacing.sm }}
                      />
                      <Text
                        style={[
                          theme.typography.styles.small,
                          {
                            color: getRoleBadgeColor(u.role),
                            fontWeight: theme.typography.weights.semiBold,
                            marginLeft: -theme.spacing.xs,
                          },
                        ]}
                      >
                        {t(`admin.roles.${u.role}`, u.role || 'user')}
                      </Text>
                    </TouchableOpacity>
                    {index < filteredUsers.slice(0, 20).length - 1 ? (
                      <Divider style={{ marginVertical: 0 }} />
                    ) : null}
                  </React.Fragment>
                ))
              )}
            </Card>
          )}
        </View>

        {/* Broadcast Notification */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('admin.broadcastNotification')}</Text>
          <Card>
            <Input
              label={t('admin.broadcastTitleLabel')}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              placeholder={t('admin.broadcastTitlePlaceholder')}
            />
            <Input
              label={t('admin.broadcastMessageLabel')}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              placeholder={t('admin.broadcastMessagePlaceholder')}
              multiline
            />
            <Text
              style={[
                theme.typography.styles.bodySmall,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.sm,
                  fontWeight: theme.typography.weights.medium,
                },
              ]}
            >
              {t('admin.sendTo')}
            </Text>
            <View style={s.chipRow}>
              <Chip
                label={t('admin.target_all')}
                selected={broadcastRoles.length === 0}
                onPress={() => setBroadcastRoles([])}
                variant="outlined"
              />
              {ALL_ROLES.map((role) => (
                <Chip
                  key={role}
                  label={t(`admin.roles.${role}`, role)}
                  selected={broadcastRoles.includes(role)}
                  onPress={() => toggleBroadcastRole(role)}
                  variant="outlined"
                  color={broadcastRoles.includes(role) ? ROLE_COLORS[role] : undefined}
                />
              ))}
            </View>
            <View style={{ height: theme.spacing.md }} />
            <Button
              title={t('admin.sendBroadcast')}
              onPress={handleSendBroadcast}
              loading={broadcastSending}
              fullWidth
              icon={
                <MaterialCommunityIcons
                  name="send"
                  size={18}
                  color="#FFFFFF"
                />
              }
            />
          </Card>
        </View>

        {/* Audit Log */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('admin.auditLog')}</Text>
          {auditLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : auditLog.length === 0 ? (
            <Card>
              <Text
                style={[
                  theme.typography.styles.body,
                  { color: theme.colors.textSecondary, textAlign: 'center' },
                ]}
              >
                {t('admin.noAuditEntries')}
              </Text>
            </Card>
          ) : (
            auditLog.slice(0, 30).map((entry, index) => (
              <Card
                key={entry._id || entry.id || index}
                style={{ marginBottom: theme.spacing.sm }}
              >
                <View style={s.auditHeader}>
                  <Text
                    style={[
                      theme.typography.styles.body,
                      { color: theme.colors.text, fontWeight: theme.typography.weights.semiBold, flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {entry.action}
                  </Text>
                  <Text
                    style={[
                      theme.typography.styles.caption,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    {formatTimestamp(entry.timestamp || entry.createdAt)}
                  </Text>
                </View>
                <View style={s.auditDetails}>
                  <Text
                    style={[
                      theme.typography.styles.bodySmall,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('admin.auditUser')}: {entry.actor
                      ? `${entry.actor.firstName || ''} ${entry.actor.lastName || ''}`.trim() || entry.actor.email
                      : entry.user || entry.userName || '-'}
                  </Text>
                  {entry.entity ? (
                    <Text
                      style={[
                        theme.typography.styles.bodySmall,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('admin.auditEntity')}: {entry.entity}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Role Change Modal */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setRoleModalVisible(false); setSelectedUser(null); setSelectedRoles([]); }}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => { setRoleModalVisible(false); setSelectedUser(null); setSelectedRoles([]); }}
        >
          <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>{t('admin.changeRole')}</Text>
            {selectedUser && (
              <Text style={s.modalSubtitle}>
                {selectedUser.firstName && selectedUser.lastName
                  ? `${selectedUser.firstName} ${selectedUser.lastName}`
                  : selectedUser.name || selectedUser.email}
              </Text>
            )}
            <View style={{ height: theme.spacing.md }} />
            {roleChanging ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: theme.spacing.xl }} />
            ) : (
              <>
                {ALL_ROLES.map((role) => {
                  const isSelected = selectedRoles.includes(role);
                  const roleColor = ROLE_COLORS[role];
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        s.roleOption,
                        isSelected && { backgroundColor: roleColor + '15', borderColor: roleColor, borderWidth: 1 },
                        !isSelected && { borderColor: 'transparent', borderWidth: 1 },
                      ]}
                      onPress={() => toggleRole(role)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={24}
                        color={isSelected ? roleColor : theme.colors.textTertiary}
                      />
                      <MaterialCommunityIcons
                        name={ROLE_ICONS[role] || 'account'}
                        size={20}
                        color={isSelected ? roleColor : theme.colors.textSecondary}
                        style={{ marginLeft: theme.spacing.sm }}
                      />
                      <Text
                        style={[
                          theme.typography.styles.body,
                          {
                            flex: 1,
                            marginLeft: theme.spacing.sm,
                            color: isSelected ? roleColor : theme.colors.text,
                            fontWeight: isSelected
                              ? theme.typography.weights.bold
                              : theme.typography.weights.regular,
                          },
                        ]}
                      >
                        {t(`admin.roles.${role}`, role)}
                      </Text>
                      <View style={[s.roleBadgeDot, { backgroundColor: roleColor }]} />
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: theme.spacing.md }} />
                <Button
                  title={t('common.save')}
                  onPress={handleSaveRoles}
                  fullWidth
                  icon={
                    <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" />
                  }
                />
                <View style={{ height: theme.spacing.xs }} />
                <TouchableOpacity
                  style={s.modalCancel}
                  onPress={() => { setRoleModalVisible(false); setSelectedUser(null); setSelectedRoles([]); }}
                >
                  <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Direct Message Modal */}
      <Modal
        visible={messageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setMessageModalVisible(false); setMessageUser(null); }}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => { setMessageModalVisible(false); setMessageUser(null); }}
        >
          <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <MaterialCommunityIcons name="message-text-outline" size={24} color={theme.colors.primary} />
              <Text style={[s.modalTitle, { marginLeft: theme.spacing.sm }]}>{t('admin.sendMessageTitle')}</Text>
            </View>
            {messageUser && (
              <Text style={s.modalSubtitle}>
                {t('admin.messageTo')}: {messageUser.firstName && messageUser.lastName
                  ? `${messageUser.firstName} ${messageUser.lastName}`
                  : messageUser.name || messageUser.email}
              </Text>
            )}
            <View style={{ height: theme.spacing.md }} />
            <Input
              label={t('admin.broadcastTitleLabel')}
              value={dmTitle}
              onChangeText={setDmTitle}
              placeholder={t('admin.messageTitlePlaceholder')}
            />
            <Input
              label={t('admin.broadcastMessageLabel')}
              value={dmMessage}
              onChangeText={setDmMessage}
              placeholder={t('admin.messageBodyPlaceholder')}
              multiline
            />
            <View style={{ height: theme.spacing.sm }} />
            <Button
              title={t('admin.sendMessage')}
              onPress={handleSendDirectMessage}
              loading={dmSending}
              fullWidth
              icon={<MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />}
            />
            <View style={{ height: theme.spacing.xs }} />
            <TouchableOpacity
              style={s.modalCancel}
              onPress={() => { setMessageModalVisible(false); setMessageUser(null); }}
            >
              <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    section: {
      marginTop: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.typography.weights.semiBold,
    },
    dashboardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    dashboardCard: {
      width: '48%',
      alignItems: 'center',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    dashboardValue: {
      ...theme.typography.styles.h3,
      fontWeight: theme.typography.weights.bold,
      marginVertical: theme.spacing.xs,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    userInfo: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    auditHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    auditDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalTitle: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    modalSubtitle: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    roleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.xs,
    },
    roleBadgeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    modalCancel: {
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.spacing.xs,
    },
    collapsibleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    yearSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    overallHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    overallGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    overallItem: {
      alignItems: 'center',
      flex: 1,
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    empStat: {
      alignItems: 'center',
      flex: 1,
    },
    progressBar: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
  });
