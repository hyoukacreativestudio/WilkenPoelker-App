import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import LoadingOverlay from '../components/LoadingOverlay';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://192.168.178.24:5000/api/auth/login', {
        email,
        password,
        customerNumber,
      });
      await SecureStore.setItemAsync('token', res.data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
      navigation.navigate('Main');
    } catch (err) {
      Alert.alert('Fehler', err.response?.data?.msg || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/header.png')} style={styles.headerImage} resizeMode="contain" />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nachname / E-Mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Kundennummer"
          value={customerNumber}
          onChangeText={setCustomerNumber}
        />

        <TouchableOpacity style={styles.greenButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>Anmelden</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>Noch kein Konto? Registrieren</Text>
        </TouchableOpacity>
      </View>

      {loading && <LoadingOverlay />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  headerImage: { width: '100%', height: 140, marginBottom: 24 },
  form: { paddingHorizontal: 24 },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  greenButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  linkText: { color: '#4CAF50', textAlign: 'center', marginTop: 16, fontSize: 16 },
});

export default Login;