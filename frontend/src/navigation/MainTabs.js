import React from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import FeedStack from './FeedStack';
import AppointmentsStack from './AppointmentsStack';
import RepairsStack from './RepairsStack';
import ProfileStack from './ProfileStack';
import MoreStack from './MoreStack';
import ServiceStack from './ServiceStack';

// Wrap each stack in a screen-level ErrorBoundary so one tab crash doesn't kill the whole app
const SafeFeedStack = (props) => (<ErrorBoundary level="screen" name="FeedStack"><FeedStack {...props} /></ErrorBoundary>);
const SafeAppointmentsStack = (props) => (<ErrorBoundary level="screen" name="AppointmentsStack"><AppointmentsStack {...props} /></ErrorBoundary>);
const SafeRepairsStack = (props) => (<ErrorBoundary level="screen" name="RepairsStack"><RepairsStack {...props} /></ErrorBoundary>);
const SafeProfileStack = (props) => (<ErrorBoundary level="screen" name="ProfileStack"><ProfileStack {...props} /></ErrorBoundary>);
const SafeMoreStack = (props) => (<ErrorBoundary level="screen" name="MoreStack"><MoreStack {...props} /></ErrorBoundary>);
// React Navigation 7 dropped unmountOnBlur: the hidden Service tab is only rendered
// while focused, so it starts fresh each time (its state is cleared on unmount) and
// "back" from e.g. Feed -> Fahrraeder returns to the feed again.
const SafeServiceStack = (props) => {
  const isFocused = useIsFocused();
  if (!isFocused) return null;
  return (<ErrorBoundary level="screen" name="ServiceStack"><ServiceStack {...props} /></ErrorBoundary>);
};

const Tab = createBottomTabNavigator();

const TAB_IMAGES = {
  Feed: require('../../assets/tab_home.png'),
  Appointments: require('../../assets/tab_calendar.png'),
  Repairs: require('../../assets/tab_repairs.png'),
  Profile: require('../../assets/tab_profile.png'),
};

export default function MainTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      // "Back" returns to the tab the user came from - e.g. from a chat opened via
      // More > Offene Tickets back to that list instead of always to the feed.
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => {
          const img = TAB_IMAGES[route.name];
          if (img) {
            return (
              <Image
                source={img}
                style={[s.tabIcon, { tintColor: focused ? theme.colors.primary : theme.colors.textTertiary }]}
                resizeMode="contain"
              />
            );
          }
          return (
            <MaterialCommunityIcons name="dots-horizontal" size={26} color={color} />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth || 0.5,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          height: 52 + insets.bottom + 4,
        },
        tabBarItemStyle: {
          flex: 1,
        },
      })}
    >
      <Tab.Screen
        name="Feed"
        component={SafeFeedStack}
        options={{ tabBarLabel: t('navigation.feed') }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Feed', { screen: 'FeedHome', pop: true });
          },
        })}
      />
      <Tab.Screen
        name="Appointments"
        component={SafeAppointmentsStack}
        options={{ tabBarLabel: t('appointments.title') }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Appointments', { screen: 'AppointmentsList', pop: true });
          },
        })}
      />
      <Tab.Screen
        name="Repairs"
        component={SafeRepairsStack}
        options={{ tabBarLabel: t('navigation.repairs') }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Repairs', { screen: 'RepairsList', pop: true });
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={SafeProfileStack}
        options={{ tabBarLabel: t('profile.title') }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Profile', { screen: 'ProfileMain', pop: true });
          },
        })}
      />
      <Tab.Screen
        name="More"
        component={SafeMoreStack}
        options={{ tabBarLabel: t('navigation.more') }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('More', { screen: 'MoreMenu', pop: true });
          },
        })}
      />
      <Tab.Screen
        name="Service"
        component={SafeServiceStack}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  tabIcon: {
    width: 28,
    height: 28,
  },
});
