import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { isAdmin, isManager } from '../../utils/helpers';
import { getInitials } from '../../utils/helpers';
import { getServerUrl } from '../../api/client';
import Badge from '../../components/ui/Badge';
import Divider from '../../components/ui/Divider';

function MenuRow({ icon, label, onPress, color, badge, theme }) {
  const textColor = color || theme.colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        menuRowStyles.row,
        { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md },
      ]}
    >
      <View style={menuRowStyles.left}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={textColor}
          style={{ marginRight: theme.spacing.md }}
        />
        <Text
          style={[
            theme.typography.styles.body,
            { color: textColor },
          ]}
        >
          {label}
        </Text>
        {badge > 0 ? (
          <Badge
            count={badge}
            color={theme.colors.error}
            style={{ marginLeft: theme.spacing.sm }}
          />
        ) : null}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

const menuRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
});

export default function MoreMenuScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';
  const initials = getInitials(user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || '');

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      >
        {/* Header with user greeting */}
        <View style={s.header}>
          <View style={s.headerContent}>
            <View>
              <Text style={s.greeting}>
                {t('more.greeting', { name: firstName })}
              </Text>
              <Text style={s.subGreeting}>
                {t('more.subGreeting')}
              </Text>
            </View>
            {user?.profilePicture ? (
              <Image
                source={{ uri: `${getServerUrl()}${user.profilePicture}` }}
                style={s.avatarImage}
              />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 1: Appointments & Notifications */}
        <View style={s.section}>
          <View style={s.card}>
            <MenuRow
              icon="calendar-month-outline"
              label={t('more.appointments')}
              onPress={() => navigation.navigate('Appointments')}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuRow
              icon="bell-outline"
              label={t('more.notifications')}
              onPress={() => navigation.navigate('Notifications')}
              badge={unreadCount}
              theme={theme}
            />
          </View>
        </View>

        {/* Section 2: Profile & Settings */}
        <View style={s.section}>
          <View style={s.card}>
            <MenuRow
              icon="account-outline"
              label={t('more.profile')}
              onPress={() => navigation.navigate('Profile')}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuRow
              icon="cog-outline"
              label={t('more.settings')}
              onPress={() => navigation.navigate('Settings')}
              theme={theme}
            />
          </View>
        </View>

        {/* Section 3: Staff Management (managers + admins) */}
        {isManager(user) ? (
          <View style={s.section}>
            <View style={s.card}>
              <MenuRow
                icon="account-multiple-check-outline"
                label={t('adminRequests.title', 'Kundennummer-Anfragen')}
                onPress={() => navigation.navigate('AdminRequests')}
                theme={theme}
              />
              <Divider style={{ marginVertical: 0 }} />
              <MenuRow
                icon="ticket-outline"
                label={t('adminTickets.title', 'Offene Tickets')}
                onPress={() => navigation.navigate('AdminOpenTickets')}
                theme={theme}
              />
              {isAdmin(user) ? (
                <>
                  <Divider style={{ marginVertical: 0 }} />
                  <MenuRow
                    icon="shield-account-outline"
                    label={t('more.adminPanel')}
                    onPress={() => navigation.navigate('Admin')}
                    theme={theme}
                  />
                  <Divider style={{ marginVertical: 0 }} />
                  <MenuRow
                    icon="calendar-remove-outline"
                    label={t('closedDays.title', 'Geschlossene Tage')}
                    onPress={() => navigation.navigate('ClosedDays')}
                    theme={theme}
                  />
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Section 4: About Us & Legal */}
        <View style={s.section}>
          <View style={s.card}>
            <MenuRow
              icon="information-outline"
              label={t('more.aboutUs', 'Über uns')}
              onPress={() => navigation.navigate('AboutUs')}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuRow
              icon="office-building-outline"
              label={t('more.impressum')}
              onPress={() => navigation.navigate('Impressum')}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuRow
              icon="shield-lock-outline"
              label={t('more.datenschutz')}
              onPress={() => navigation.navigate('Datenschutz')}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuRow
              icon="file-document-outline"
              label={t('more.agb')}
              onPress={() => navigation.navigate('AGB')}
              theme={theme}
            />
            <Divider style={{ marginVertical: 0 }} />
            <MenuRow
              icon="undo-variant"
              label={t('more.widerrufsrecht', 'Widerrufsbelehrung')}
              onPress={() => navigation.navigate('Widerrufsrecht')}
              theme={theme}
            />
          </View>
        </View>

        {/* Section 5: Logout */}
        <View style={s.section}>
          <View style={s.card}>
            <MenuRow
              icon="logout"
              label={t('more.logout')}
              onPress={logout}
              color={theme.colors.error}
              theme={theme}
            />
          </View>
        </View>
      </ScrollView>
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
      backgroundColor: theme.colors.card,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    greeting: {
      ...theme.typography.styles.h4,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    subGreeting: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.round,
    },
    avatarText: {
      ...theme.typography.styles.h5,
      color: '#FFFFFF',
      fontWeight: theme.typography.weights.bold,
    },
    section: {
      marginTop: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
  });
