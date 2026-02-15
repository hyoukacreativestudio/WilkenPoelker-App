import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import LoadingOverlay from '../components/LoadingOverlay';

const Register = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://192.168.178.24:5000/api/auth/register', {
        username,
        email,
        password,
        confirmPassword,
        customerNumber,
      });
      Alert.alert('Erfolg', 'Registriert! Bitte anmelden.');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Fehler', err.response?.data?.msg || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/header.png')} style={styles.headerImage} resizeMode="contain" />

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Benutzername" value={username} onChangeText={setUsername} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Passwort" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Passwort bestätigen" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Kundennummer" value={customerNumber} onChangeText={setCustomerNumber} />

        <TouchableOpacity style={styles.greenButton} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>Registrieren</Text>
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
});

export default Register;