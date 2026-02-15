import React from 'react';
import { View, Text } from 'react-native';

const NotificationItem = ({ notif }) => (
  <View>
    <Text style={{ fontWeight: notif.read ? 'normal' : 'bold' }}>{notif.title}: {notif.message}</Text>
  </View>
);

export default NotificationItem;