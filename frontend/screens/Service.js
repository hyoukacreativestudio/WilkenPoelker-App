import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const Service = () => {
  const [type, setType] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      await axios.post('http://192.168.178.24:5000/api/service/createTicket', {
        type,
        description: details,
      }, { headers: { Authorization: token } });
      Alert.alert('Erfolg', 'Anfrage gesendet!');
      setType('');
      setDetails('');
    } catch (err) {
      Alert.alert('Fehler', 'Anfrage fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      <View style={styles.form}>
        <Text style={styles.label}>Was für eine Art Termin brauchen Sie?</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Abholung, Lieferung, Inspektion..."
          value={type}
          onChangeText={setType}
        />

        <Text style={styles.label}>Wünsche oder sonstige Informationen</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Uhrzeiten, Gerät, etc."
          value={details}
          onChangeText={setDetails}
          multiline
        />

        <TouchableOpacity style={styles.greenButton} onPress={sendRequest} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Absenden</Text>}
        </TouchableOpacity>

        <Text style={styles.hint}>Sie bekommen eine Benachrichtigung, sobald wir Ihre Anfrage bearbeitet haben.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  header: { width: '100%', height: 140, marginBottom: 24 },
  form: { padding: 24 },
  label: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  greenButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  hint: { marginTop: 16, color: '#555', fontSize: 14, textAlign: 'center' },
});

export default Service;