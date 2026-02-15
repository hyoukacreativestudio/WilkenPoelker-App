import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme } from '../context/ThemeContext';

const Admin = () => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await axios.get('http://192.168.178.24:5000/api/users/admin/search', {
        headers: { Authorization: token },
        params: { query: searchQuery }
      });
      setUsers(res.data);
    } catch (err) {
      Alert.alert('Fehler', 'Suche fehlgeschlagen – Admin-Rechte?');
    } finally {
      setLoading(false);
    }
  };

  const updatePermissions = async (userId, newPermissions) => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      await axios.put('http://192.168.178.24:5000/api/users/admin/updatePermissions', {
        userId,
        permissions: newPermissions,
      }, { headers: { Authorization: token } });
      Alert.alert('Erfolg', 'Berechtigungen aktualisiert');
      searchUsers();  // Liste neu laden
    } catch (err) {
      Alert.alert('Fehler', 'Update fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }) => (
    <View style={[styles.userCard, isDark && styles.cardDark]}>
      <Text style={[styles.userName, isDark && styles.textDark]}>{item.username} ({item.email})</Text>
      <Text style={[styles.permissions, isDark && styles.textDark]}>Aktuelle Rechte: {item.permissions.join(', ') || 'Keine'}</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.permissionButton} onPress={() => updatePermissions(item._id, ['bike'])}>
          <Text style={styles.buttonTextSmall}>Bike</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionButton} onPress={() => updatePermissions(item._id, ['cleaning'])}>
          <Text style={styles.buttonTextSmall}>Cleaning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionButton} onPress={() => updatePermissions(item._id, ['motor'])}>
          <Text style={styles.buttonTextSmall}>Motor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionButton} onPress={() => updatePermissions(item._id, ['service'])}>
          <Text style={styles.buttonTextSmall}>Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionButton} onPress={() => updatePermissions(item._id, ['posts'])}>
          <Text style={styles.buttonTextSmall}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminButton} onPress={() => updatePermissions(item._id, ['admin'])}>
          <Text style={styles.buttonTextSmall}>Admin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Suche nach Name oder E-Mail..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.greenButton} onPress={searchUsers}>
          <Text style={styles.buttonText}>Suchen</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item._id}
        ListEmptyComponent={<Text style={[styles.empty, isDark && styles.textDark]}>Keine User gefunden</Text>}
        contentContainerStyle={{ padding: 16 }}
      />

      {loading && <LoadingOverlay />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  containerDark: { backgroundColor: '#1B5E20' },
  header: { width: '100%', height: 140, marginBottom: 16 },
  searchContainer: { padding: 16 },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#ccc' },
  inputDark: { backgroundColor: '#2E2E2E', color: 'white', borderColor: '#444' },
  greenButton: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  userCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ccc' },
  cardDark: { backgroundColor: '#1E1E1E', borderColor: '#444' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  permissions: { fontSize: 14, color: '#555', marginTop: 8 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  permissionButton: { backgroundColor: '#66BB6A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  adminButton: { backgroundColor: '#FF5252', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  buttonTextSmall: { color: 'white', fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#757575', fontSize: 16, marginTop: 40 },
  textDark: { color: '#E0E0E0' },
});

export default Admin;