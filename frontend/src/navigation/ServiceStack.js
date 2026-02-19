import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from '../components/shared/NotificationBell';
import ServiceHomeScreen from '../screens/service/ServiceHomeScreen';
import CreateTicketScreen from '../screens/service/CreateTicketScreen';
import TicketDetailScreen from '../screens/service/TicketDetailScreen';
import ChatScreen from '../screens/service/ChatScreen';
import CategoryServiceScreen from '../screens/service/CategoryServiceScreen';
import ServiceAiChatScreen from '../screens/service/ServiceAiChatScreen';
import ServiceAdminScreen from '../screens/service/ServiceAdminScreen';
import ForwardTicketScreen from '../screens/service/ForwardTicketScreen';
import ActiveChatsScreen from '../screens/service/ActiveChatsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import CustomerNumberRequestScreen from '../screens/service/CustomerNumberRequestScreen';

const Stack = createNativeStackNavigator();

export default function ServiceStack() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const backButton = (navigation) => (
    <TouchableOpacity
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('ServiceHome');
        }
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ marginRight: theme.spacing.sm }}
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
    </TouchableOpacity>
  );

  return (
    <Stack.Navigator
      screenOptions={{
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
      }}
    >
      <Stack.Screen
        name="ServiceHome"
        component={ServiceHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTicket"
        component={CreateTicketScreen}
        options={({ navigation }) => ({
          title: t('service.createTicket'),
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={({ navigation }) => ({
          title: '',
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ navigation }) => ({
          title: t('service.chat'),
          headerLeft: () => backButton(navigation),
        })}
      />
      <Stack.Screen
        name="ServiceAdmin"
        component={ServiceAdminScreen}
        options={({ navigation }) => ({
          title: t('serviceAdmin.title'),
          headerLeft: () => backButton(navigation),
        })}
      />
      <Stack.Screen
        name="ForwardTicket"
        component={ForwardTicketScreen}
        options={({ navigation }) => ({
          title: t('serviceAdmin.forwardTitle'),
          headerLeft: () => backButton(navigation),
        })}
      />
      <Stack.Screen
        name="ActiveChats"
        component={ActiveChatsScreen}
        options={({ navigation }) => ({
          title: t('activeChats.title'),
          headerLeft: () => backButton(navigation),
        })}
      />
      <Stack.Screen
        name="CategoryService"
        component={CategoryServiceScreen}
        options={({ route, navigation }) => ({
          title: route.params?.title || '',
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="ServiceAiChat"
        component={ServiceAiChatScreen}
        options={({ route, navigation }) => ({
          title: t('aiChat.headerTitle'),
          headerLeft: () => backButton(navigation),
        })}
      />
      <Stack.Screen
        name="CustomerNumberRequest"
        component={CustomerNumberRequestScreen}
        options={({ navigation }) => ({
          title: t('customerNumber.title'),
          headerLeft: () => backButton(navigation),
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
