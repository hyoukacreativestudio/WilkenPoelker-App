import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from '../components/shared/NotificationBell';
import RepairsListScreen from '../screens/repairs/RepairsListScreen';
import RepairDetailScreen from '../screens/repairs/RepairDetailScreen';

const Stack = createNativeStackNavigator();

export default function RepairsStack() {
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
        name="RepairsList"
        component={RepairsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RepairDetail"
        component={RepairDetailScreen}
        options={({ navigation }) => ({
          title: '',
          headerLeft: () => backButton(navigation),
          headerRight: () => <NotificationBell />,
        })}
      />
    </Stack.Navigator>
  );
}
