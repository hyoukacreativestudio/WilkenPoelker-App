import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View } from 'react-native';

import Login from '../screens/Login';
import Register from '../screens/Register';
import Feed from '../screens/Feed';
import Service from '../screens/Service';
import Bikes from '../screens/Bikes';
import Cleaning from '../screens/Cleaning';
import Motor from '../screens/Motor';
import Repairs from '../screens/Repairs';
import Appointments from '../screens/Appointments';
import Notifications from '../screens/Notifications';
import Profile from '../screens/Profile';
import Settings from '../screens/Settings';
import Imprint from '../screens/Imprint';
import FloatingChatIcon from '../components/FloatingChatIcon';  // ← Der schwebende Chat-Button

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
  <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 80,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#757575',
        tabBarLabelStyle: { fontSize: 12, marginBottom: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconSource;

          if (route.name === 'Feed') iconSource = require('../assets/tab_home.png');
          else if (route.name === 'Service') iconSource = require('../assets/tab_service.png');
          else if (route.name === 'Termine') iconSource = require('../assets/tab_calendar.png');
          else if (route.name === 'Benachrichtigungen') iconSource = require('../assets/tab_bell.png');
          else if (route.name === 'Profil') iconSource = require('../assets/tab_profile.png');

          return (
            <Image
              source={iconSource}
              style={{ width: 28, height: 28, tintColor: focused ? '#4CAF50' : '#757575' }}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="Service" component={Service} />
      <Tab.Screen name="Termine" component={Appointments} />
      <Tab.Screen name="Benachrichtigungen" component={Notifications} />
      <Tab.Screen name="Profil" component={Profile} />
    </Tab.Navigator>

    {/* Schwebender Chat-Button – erscheint nur bei offenem Ticket */}
    <FloatingChatIcon />
  </View>
);

const AppNavigator = () => (
  <Stack.Navigator initialRouteName="Login">
    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
    <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="Chat" component={Chat} options={{ headerShown: true, title: 'Chat' }} />}
    {/* <Stack.Screen name="Chat" component={Chat} /> */}
  </Stack.Navigator>
);

export default AppNavigator;