import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from '../components/shared/NotificationBell';
import ShopListScreen from '../screens/shop/ShopListScreen';
import ShopDetailScreen from '../screens/shop/ShopDetailScreen';

const Stack = createNativeStackNavigator();

// Products from the shop's Taifun stock (tab "Produkte").
export default function ShopStack() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const backButton = (navigation) => (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ marginRight: theme.spacing.sm }}
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
    </TouchableOpacity>
  );

  return (
    <Stack.Navigator
      screenOptions={{
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
      }}
    >
      <Stack.Screen
        name="ShopList"
        component={ShopListScreen}
        options={{ title: t('shop.title'), headerRight: () => <NotificationBell /> }}
      />
      <Stack.Screen
        name="ShopDetail"
        component={ShopDetailScreen}
        options={({ navigation }) => ({
          title: '',
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
    </Stack.Navigator>
  );
}
