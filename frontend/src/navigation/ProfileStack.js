import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from '../components/shared/NotificationBell';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
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
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
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
    </Stack.Navigator>
  );
}
