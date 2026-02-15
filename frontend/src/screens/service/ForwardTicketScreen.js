import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { serviceApi } from '../../api/service';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';

const ROLE_ICONS = {
  admin: 'shield-crown',
  super_admin: 'shield-crown',
  service_manager: 'face-agent',
  bike_manager: 'bicycle',
  cleaning_manager: 'spray-bottle',
  motor_manager: 'engine',
};

export default function ForwardTicketScreen({ route, navigation }) {
  const { ticketId, category } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const result = await serviceApi.getAvailableStaff(category);
      const staffData = result.data?.data || [];
      setStaff(staffData);
    } catch (err) {
      showToast({ type: 'error', message: t('serviceAdmin.loadStaffError') });
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleForward = (staffMember) => {
    const staffId = staffMember._id || staffMember.id;
    const staffName = staffMember.firstName
      ? `${staffMember.firstName} ${staffMember.lastName || ''}`
      : staffMember.username;

    Alert.alert(
      t('serviceAdmin.forwardTitle'),
      t('serviceAdmin.forwardConfirm', { name: staffName.trim() }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('serviceAdmin.forward'),
          onPress: async () => {
            setForwarding(true);
            try {
              await serviceApi.forwardTicket(ticketId, staffId);
              showToast({ type: 'success', message: t('serviceAdmin.forwardSuccess') });
              navigation.goBack();
            } catch (err) {
              const msg = err.response?.data?.message || t('serviceAdmin.forwardError');
              showToast({ type: 'error', message: msg });
            } finally {
              setForwarding(false);
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return t('roles.admin');
      case 'service_manager':
        return t('roles.serviceManager');
      case 'bike_manager':
        return t('roles.bikeManager');
      case 'cleaning_manager':
        return t('roles.cleaningManager');
      case 'motor_manager':
        return t('roles.motorManager');
      default:
        return role;
    }
  };

  const renderStaffItem = ({ item }) => {
    const name = item.firstName
      ? `${item.firstName} ${item.lastName || ''}`
      : item.username;
    const roleIcon = ROLE_ICONS[item.role] || 'account';

    return (
      <TouchableOpacity
        style={s.staffItem}
        onPress={() => handleForward(item)}
        activeOpacity={0.7}
        disabled={forwarding}
      >
        <View style={[s.staffAvatar, { backgroundColor: theme.colors.primaryLight }]}>
          <MaterialCommunityIcons name={roleIcon} size={24} color={theme.colors.primary} />
        </View>
        <View style={s.staffInfo}>
          <Text style={s.staffName}>{name.trim()}</Text>
          <Text style={s.staffRole}>{getRoleLabel(item.role)}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const s = styles(theme);

  if (loadingStaff) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.header}>{t('serviceAdmin.selectStaff')}</Text>
      <FlatList
        data={staff}
        renderItem={renderStaffItem}
        keyExtractor={(item) => String(item._id || item.id)}
        contentContainerStyle={
          staff.length === 0
            ? { flex: 1, justifyContent: 'center' }
            : { paddingBottom: theme.spacing.xxl }
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-off-outline"
            title={t('serviceAdmin.noStaffAvailable')}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginLeft: 72 }} />
        )}
      />
      {forwarding && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      ...theme.typography.styles.body,
      color: theme.colors.textSecondary,
      padding: theme.spacing.md,
    },
    staffItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    staffAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    staffInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    staffName: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
    },
    staffRole: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
