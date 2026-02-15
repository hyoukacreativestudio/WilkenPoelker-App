import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, ActivityIndicator, TextInput, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme } from '../context/ThemeContext';

const Motor = () => {
  const { isDark } = useTheme();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [canPostOffer, setCanPostOffer] = useState(false);
  const [offerImage, setOfferImage] = useState(null);
  const [offerText, setOfferText] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync('token');
        const user = JSON.parse(await SecureStore.getItemAsync('user'));

        // Rabatte laden
        const res = await axios.get('http://192.168.178.24:5000/api/products/motor/discounts', {
          headers: { Authorization: token }
        });
        setDiscounts(res.data);

        // Berechtigung prüfen (full_access / full_access_grant / motor)
        const hasPermission = user.permissions?.some(p => ['full_access', 'full_access_grant', 'motor'].includes(p));
        setCanPostOffer(hasPermission);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const askAI = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await axios.post('http://192.168.178.24:5000/api/products/motor/askAI', { question }, {
        headers: { Authorization: token }
      });
      setAiAnswer(res.data.answer);
    } catch (err) {
      Alert.alert('Fehler', 'KI-Antwort fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const pickOfferImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setOfferImage(result.assets[0].uri);
  };

  const postOffer = async () => {
    if (!offerText.trim()) {
      Alert.alert('Fehler', 'Bitte Text eingeben');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const formData = new FormData();
      formData.append('content', offerText);
      formData.append('type', 'offer');
      if (offerImage) {
        formData.append('media', {
          uri: offerImage,
          name: 'offer.jpg',
          type: 'image/jpeg',
        });
      }

      await axios.post('http://192.168.178.24:5000/api/feed', formData, {
        headers: { Authorization: token, 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Erfolg', 'Angebot gepostet');
      setOfferText('');
      setOfferImage(null);
    } catch (err) {
      Alert.alert('Fehler', 'Posten fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

      {loading && <LoadingOverlay />}

      <View style={styles.content}>
        <Text style={[styles.title, isDark && styles.textDark]}>Aktuelle Rabatte – Motorgeräte</Text>

        <FlatList
          data={discounts}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={[styles.discountCard, isDark && styles.cardDark]}>
              <Text style={[styles.discountText, isDark && styles.textDark]}>{item.discount}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.empty, isDark && styles.textDark]}>Keine Rabatte verfügbar</Text>}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 16 }}
        />

        <TouchableOpacity style={styles.greenButton} onPress={() => setShowAI(true)}>
          <Text style={styles.buttonText}>Kundenfragen (KI)</Text>
        </TouchableOpacity>

        {showAI && (
          <View style={[styles.aiBox, isDark && styles.boxDark]}>
            <TextInput
              style={[styles.aiInput, isDark && styles.inputDark]}
              placeholder="Frage zu Motorgeräten..."
              value={question}
              onChangeText={setQuestion}
              multiline
            />
            <TouchableOpacity style={styles.greenButtonSmall} onPress={askAI}>
              <Text style={styles.buttonTextSmall}>Fragen</Text>
            </TouchableOpacity>
            {aiAnswer && <Text style={[styles.aiAnswer, isDark && styles.textDark]}>{aiAnswer}</Text>}
          </View>
        )}

        {canPostOffer && (
          <View style={[styles.offerBox, isDark && styles.boxDark]}>
            <Text style={[styles.offerTitle, isDark && styles.textDark]}>Neues Angebot posten (Motorgeräte)</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Beschreibung des Angebots..."
              value={offerText}
              onChangeText={setOfferText}
              multiline
            />
            <TouchableOpacity style={styles.buttonSmall} onPress={pickOfferImage}>
              <Text style={styles.buttonTextSmall}>Bild auswählen</Text>
            </TouchableOpacity>
            {offerImage && <Image source={{ uri: offerImage }} style={styles.offerPreview} />}
            <TouchableOpacity style={styles.greenButton} onPress={postOffer}>
              <Text style={styles.buttonText}>Angebot posten</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  containerDark: { backgroundColor: '#1B5E20' },
  header: { width: '100%', height: 140, marginBottom: 16 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 16 },
  discountCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginRight: 12, minWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardDark: { backgroundColor: '#1E1E1E' },
  discountText: { fontSize: 16, fontWeight: '600', color: '#000' },
  empty: { color: '#757575', fontSize: 16, textAlign: 'center', marginTop: 20 },
  greenButton: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  greenButtonSmall: { backgroundColor: '#66BB6A', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  buttonTextSmall: { color: 'white', fontSize: 16, fontWeight: '600' },
  aiBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginTop: 24, borderWidth: 1, borderColor: '#4CAF50' },
  boxDark: { backgroundColor: '#1E1E1E', borderColor: '#388E3C' },
  aiInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12, minHeight: 100, marginBottom: 12, fontSize: 16 },
  inputDark: { backgroundColor: '#2E2E2E', color: 'white', borderColor: '#444' },
  aiAnswer: { marginTop: 16, fontSize: 16, color: '#333' },
  offerBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginTop: 32, borderWidth: 1, borderColor: '#4CAF50' },
  offerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 12 },
  offerPreview: { width: '100%', height: 200, borderRadius: 12, marginTop: 12 },
  buttonSmall: { backgroundColor: '#2196F3', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  textDark: { color: '#E0E0E0' },
});

export default Motor;