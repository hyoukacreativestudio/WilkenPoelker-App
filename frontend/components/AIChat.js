import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const AIChat = ({ category }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const askAI = async () => {
    const token = await SecureStore.getItemAsync('token');
    try {
      const res = await axios.post(`http://localhost:5000/api/products/${category}/askAI`, { question }, { headers: { Authorization: token } });
      setAnswer(res.data.answer);
    } catch (err) {
      Alert.alert('Fehler', 'KI konnte nicht antworten');
    }
  };

  const createTicket = async () => {
    const token = await SecureStore.getItemAsync('token');
    await axios.post(`http://localhost:5000/api/products/${category}/createQuestionTicket`, { question }, { headers: { Authorization: token } });
    Alert.alert('Ticket erstellt');
  };

  return (
    <View>
      <TextInput placeholder={`Frage zu ${category}...`} value={question} onChangeText={setQuestion} />
      <Button title="Fragen" onPress={askAI} />
      <Text>{answer}</Text>
      <Button title="Nicht geholfen? Ticket erstellen" onPress={createTicket} />
    </View>
  );
};

export default AIChat;