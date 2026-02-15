import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, useColorScheme } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const Notifications = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const res = await axios.get('http://192.168.178.24:5000/api/notifications', {
          headers: { Authorization: token }
        });
        setNotifs(res.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, []);

  const markRead = async (id) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      await axios.post('http://192.168.178.24:5000/api/notifications/markRead', { id }, {
        headers: { Authorization: token }
      });
      setNotifs(notifs.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.log(err);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, item.read && styles.cardRead, isDark && styles.cardDark]}
      onPress={() => !item.read && markRead(item._id)}
    >
      <Text style={[styles.title, isDark && styles.textDark]}>{item.title}</Text>
      <Text style={[styles.message, isDark && styles.textDark]}>{item.message}</Text>
      <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={notifs}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          ListEmptyComponent={<Text style={[styles.empty, isDark && styles.textDark]}>Keine Benachrichtigungen</Text>}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  containerDark: { backgroundColor: '#1B5E20' },
  header: { width: '100%', height: 140, marginBottom: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  cardRead: { borderColor: '#ccc', opacity: 0.7 },
  cardDark: { backgroundColor: '#1E1E1E', borderColor: '#388E3C' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  message: { fontSize: 15, marginTop: 4, color: '#333' },
  time: { fontSize: 13, color: '#757575', marginTop: 8, textAlign: 'right' },
  empty: { textAlign: 'center', color: '#757575', fontSize: 16, marginTop: 60 },
  textDark: { color: '#E0E0E0' },
});

export default Notifications;