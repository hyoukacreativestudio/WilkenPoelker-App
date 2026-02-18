import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from '../components/shared/NotificationBell';
import MoreMenuScreen from '../screens/more/MoreMenuScreen';
import AboutUsScreen from '../screens/about/AboutUsScreen';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import NewAppointmentScreen from '../screens/appointments/NewAppointmentScreen';
import ProposeTimeScreen from '../screens/appointments/ProposeTimeScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import AdminRequestsScreen from '../screens/admin/AdminRequestsScreen';
import AdminOpenTicketsScreen from '../screens/admin/AdminOpenTicketsScreen';
import ClosedDaysScreen from '../screens/admin/ClosedDaysScreen';
import ImpressumScreen from '../screens/legal/ImpressumScreen';
import DatenschutzScreen from '../screens/legal/DatenschutzScreen';
import AGBScreen from '../screens/legal/AGBScreen';
import WiderrufsrechtScreen from '../screens/legal/WiderrufsrechtScreen';

const Stack = createNativeStackNavigator();

export default function MoreStack() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const backButton = (navigation) => (
    <TouchableOpacity
      onPress={() => {
        // Check if there is a previous screen in THIS stack (not the tab navigator)
        const state = navigation.getState();
        const hasStackHistory = state?.index > 0;
        if (hasStackHistory) {
          navigation.goBack();
        } else {
          // Deep-linked / direct URL → no MoreMenu below us, navigate there
          navigation.navigate('MoreMenu');
        }
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ marginRight: theme.spacing.sm }}
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
    </TouchableOpacity>
  );

  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.colors.card,
    },
    headerShadowVisible: false,
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      fontFamily: theme.typography.styles.h5?.fontFamily,
      fontSize: theme.typography.styles.h5?.fontSize,
      fontWeight: theme.typography.styles.h5?.fontWeight,
      color: theme.colors.text,
    },
    animation: 'slide_from_right',
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AboutUs"
        component={AboutUsScreen}
        options={({ navigation }) => ({
          title: t('aboutUs.title', 'Über uns'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={({ navigation }) => ({
          title: t('appointments.title'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
        options={({ navigation }) => ({
          title: '',
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="NewAppointment"
        component={NewAppointmentScreen}
        options={({ navigation }) => ({
          title: t('appointments.newAppointment'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="ProposeTime"
        component={ProposeTimeScreen}
        options={({ navigation }) => ({
          title: t('appointments.proposeTime'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={({ navigation }) => ({
          title: t('notifications.title'),
          headerLeft: () => backButton(navigation),
        })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          title: t('profile.title'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          title: t('settings.title'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={({ navigation }) => ({
          title: t('admin.title'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="AdminRequests"
        component={AdminRequestsScreen}
        options={({ navigation }) => ({
          title: t('adminRequests.title', 'Kundennummer-Anfragen'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="AdminOpenTickets"
        component={AdminOpenTicketsScreen}
        options={({ navigation }) => ({
          title: t('adminTickets.title', 'Offene Tickets'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="ClosedDays"
        component={ClosedDaysScreen}
        options={({ navigation }) => ({
          title: t('closedDays.title', 'Geschlossene Tage'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Impressum"
        component={ImpressumScreen}
        options={({ navigation }) => ({
          title: t('legal.impressumTitle'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Datenschutz"
        component={DatenschutzScreen}
        options={({ navigation }) => ({
          title: t('legal.datenschutzTitle'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="AGB"
        component={AGBScreen}
        options={({ navigation }) => ({
          title: t('legal.agbTitle'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Widerrufsrecht"
        component={WiderrufsrechtScreen}
        options={({ navigation }) => ({
          title: t('legal.widerrufsrechtTitle'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
    </Stack.Navigator>
  );
}
