import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme } from '../context/ThemeContext';

const Profile = () => {
  const { isDark } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const user = JSON.parse(await SecureStore.getItemAsync('user'));
        setUsername(user.username || '');
        setEmail(user.email || '');
        setProfilePic(user.profilePicture || null);
      } catch (err) {
        Alert.alert('Fehler', 'Profil laden fehlgeschlagen');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setProfilePic(result.assets[0].uri);
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const formData = new FormData();
      formData.append('username', username);
      if (profilePic) {
        formData.append('profilePicture', {
          uri: profilePic,
          name: 'profile.jpg',
          type: 'image/jpeg',
        });
      }

      await axios.put('http://192.168.178.24:5000/api/users/profile', formData, {
        headers: { Authorization: token, 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Erfolg', 'Profil aktualisiert');
    } catch (err) {
      Alert.alert('Fehler', 'Update fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      <View style={styles.content}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={profilePic ? { uri: profilePic } : require('../assets/placeholder_profile.png')}
            style={styles.profileImage}
          />
          <Text style={[styles.changePhoto, isDark && styles.textDark]}>Profilbild ändern</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Benutzername"
          value={username}
          onChangeText={setUsername}
        />

        <Text style={[styles.email, isDark && styles.textDark]}>E-Mail: {email}</Text>

        <TouchableOpacity style={styles.greenButton} onPress={updateProfile} disabled={loading}>
          <Text style={styles.buttonText}>Speichern</Text>
        </TouchableOpacity>
      </View>

      {loading && <LoadingOverlay />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  containerDark: { backgroundColor: '#1B5E20' },
  header: { width: '100%', height: 140, marginBottom: 24 },
  content: { padding: 24, alignItems: 'center' },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#4CAF50' },
  changePhoto: { color: '#4CAF50', marginTop: 8, fontSize: 16 },
  input: { width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 16, marginVertical: 16, fontSize: 16, borderWidth: 1, borderColor: '#ccc' },
  inputDark: { backgroundColor: '#2E2E2E', color: 'white', borderColor: '#444' },
  email: { fontSize: 16, color: '#333', marginBottom: 24 },
  greenButton: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  textDark: { color: '#E0E0E0' },
});

export default Profile;