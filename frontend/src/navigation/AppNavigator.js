import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useOffline } from '../hooks/useOffline';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ConnectionErrorScreen from '../components/shared/ConnectionErrorScreen';
import linking from './linking';
import { navigationRef } from './navigationRef';

const RootStack = createNativeStackNavigator();

function SplashScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const { isOnline } = useOffline();

  if (isLoading) {
    return <SplashScreen />;
  }

  // Show full-screen connection error when offline
  if (!isOnline) {
    return <ConnectionErrorScreen />;
  }

  // React Navigation v7 requires 'fonts' in the theme object
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={{
        dark: isDark,
        fonts: baseTheme.fonts,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.card,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.error,
        },
      }}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
