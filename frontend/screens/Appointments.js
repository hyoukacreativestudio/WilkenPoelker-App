import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, useColorScheme } from 'react-native';

const Appointments = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fake-Daten (später echte API)
    setTimeout(() => {
      setAppointments([
        { id: '1', title: 'Service-Termin Fahrrad', date: '05.02.2026 14:00', status: 'bestätigt' },
        { id: '2', title: 'Abholung Reparatur Motorgerät', date: '07.02.2026 10:30', status: 'bereit' },
        { id: '3', title: 'Inspektion Reinigungsgerät', date: '10.02.2026 09:00', status: 'offen' },
      ]);
      setLoading(false);
    }, 1200);
  }, []);

  const renderItem = ({ item }) => (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>{item.title}</Text>
      <Text style={[styles.date, isDark && styles.textDark]}>{item.date}</Text>
      <Text style={[
        styles.status,
        item.status === 'bereit' ? styles.statusReady : item.status === 'bestätigt' ? styles.statusConfirmed : styles.statusOpen
      ]}>
        {item.status.toUpperCase()}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={[styles.empty, isDark && styles.textDark]}>Keine Termine geplant</Text>}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDark: { backgroundColor: '#1E1E1E' },
  title: { fontSize: 17, fontWeight: '600', color: '#000' },
  date: { fontSize: 15, color: '#555', marginTop: 4 },
  status: { fontSize: 14, fontWeight: '500', marginTop: 8 },
  statusReady: { color: '#34C759' },
  statusConfirmed: { color: '#007AFF' },
  statusOpen: { color: '#FF9500' },
  empty: { textAlign: 'center', color: '#757575', fontSize: 16, marginTop: 60 },
  textDark: { color: '#E0E0E0' },
});

export default Appointments;