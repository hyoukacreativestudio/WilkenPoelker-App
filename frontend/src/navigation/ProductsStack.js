import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from '../components/shared/NotificationBell';
import ProductListScreen from '../screens/products/ProductListScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import ProductSearchScreen from '../screens/products/ProductSearchScreen';
import AIChatScreen from '../screens/products/AIChatScreen';

const TopTab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function BikesTab() {
  return <ProductListScreen category="bike" />;
}
function CleaningTab() {
  return <ProductListScreen category="cleaning" />;
}
function MotorTab() {
  return <ProductListScreen category="motor" />;
}

function ProductTopTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIndicatorStyle: {
          backgroundColor: theme.colors.primary,
          height: 3,
          borderRadius: 1.5,
        },
        tabBarLabelStyle: {
          ...theme.typography.styles.buttonSmall,
          textTransform: 'none',
        },
        tabBarPressColor: theme.colors.primaryLight,
      }}
    >
      <TopTab.Screen
        name="Bikes"
        component={BikesTab}
        options={{ tabBarLabel: t('products.bikes') }}
      />
      <TopTab.Screen
        name="Cleaning"
        component={CleaningTab}
        options={{ tabBarLabel: t('products.cleaning') }}
      />
      <TopTab.Screen
        name="Motor"
        component={MotorTab}
        options={{ tabBarLabel: t('products.motor') }}
      />
    </TopTab.Navigator>
  );
}

export default function ProductsStack() {
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
        name="ProductTabs"
        component={ProductTopTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={({ navigation }) => ({
          title: '',
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="ProductSearch"
        component={ProductSearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={({ navigation }) => ({
          title: 'AI Assistent',
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
    </Stack.Navigator>
  );
}
