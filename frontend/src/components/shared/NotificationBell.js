import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import Badge from '../ui/Badge';

export default function NotificationBell({ color, size = 24 }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  const handlePress = () => {
    navigation.navigate('Notifications');
  };

  const iconColor = color || theme.colors.text;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.container}
    >
      <MaterialCommunityIcons name="bell-outline" size={size} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles.badgeContainer}>
          <Badge
            count={unreadCount}
            color={theme.colors.error}
            size="small"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
