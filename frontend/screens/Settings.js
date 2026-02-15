import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Picker, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme } from '../context/ThemeContext';

const Settings = ({ navigation }) => {
  const { isDark, toggleDarkMode } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [textSize, setTextSize] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync('token');
        const res = await axios.get('http://192.168.178.24:5000/api/users/settings', {
          headers: { Authorization: token }
        });
        setNotifications(res.data.notifications);
        setTextSize(res.data.textSize);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      await axios.put('http://192.168.178.24:5000/api/users/settings', {
        darkMode: isDark,
        textSize,
        notifications,
      }, { headers: { Authorization: token } });
      Alert.alert('Erfolg', 'Einstellungen gespeichert');
    } catch (err) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Fehler', 'Logout fehlgeschlagen');
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      {loading && <LoadingOverlay />}

      <View style={styles.content}>
        <View style={styles.settingRow}>
          <Text style={[styles.label, isDark && styles.textDark]}>Darkmode</Text>
          <Switch value={isDark} onValueChange={toggleDarkMode} trackColor={{ true: '#4CAF50' }} />
        </View>

        <View style={styles.settingRow}>
          <Text style={[styles.label, isDark && styles.textDark]}>Push-Benachrichtigungen</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#4CAF50' }} />
        </View>

        <View style={styles.settingRow}>
          <Text style={[styles.label, isDark && styles.textDark]}>Textgröße</Text>
          <Picker
            selectedValue={textSize}
            onValueChange={setTextSize}
            style={[styles.picker, isDark && styles.pickerDark]}
          >
            <Picker.Item label="Klein" value="small" />
            <Picker.Item label="Mittel" value="medium" />
            <Picker.Item label="Groß" value="large" />
          </Picker>
        </View>

        <TouchableOpacity style={styles.greenButton} onPress={saveSettings}>
          <Text style={styles.buttonText}>Einstellungen speichern</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>

        <Text style={[styles.version, isDark && styles.textDark]}>App-Version: {appVersion}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  containerDark: { backgroundColor: '#1B5E20' },
  header: { width: '100%', height: 140, marginBottom: 24 },
  content: { padding: 24 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  label: { fontSize: 17, color: '#000' },
  picker: { width: 150, color: '#000' },
  pickerDark: { color: '#FFFFFF' },
  greenButton: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#FF5252', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  logoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  version: { textAlign: 'center', color: '#757575', marginTop: 48, fontSize: 14 },
  textDark: { color: '#FFFFFF' },
});

export default Settings;