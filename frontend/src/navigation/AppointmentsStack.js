import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from '../components/shared/NotificationBell';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import NewAppointmentScreen from '../screens/appointments/NewAppointmentScreen';
import ProposeTimeScreen from '../screens/appointments/ProposeTimeScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function AppointmentsStack() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const backButton = (navigation) => (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ marginRight: theme.spacing.sm }}
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
    </TouchableOpacity>
  );

  const screenOptions = {
    headerStyle: { backgroundColor: theme.colors.card },
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
        name="AppointmentsList"
        component={AppointmentsScreen}
        options={{ headerShown: false }}
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
          title: t('notifications.title', 'Benachrichtigungen'),
          headerLeft: () => backButton(navigation),
        })}
      />
    </Stack.Navigator>
  );
}
