import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, FlatList, Text } from 'react-native';
import io from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const socket = io('http://localhost:5000');

const Chat = ({ ticketId }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    socket.emit('joinChat', ticketId);
    socket.on('message', (msg) => setMessages([...messages, msg]));

    // Alte Nachrichten laden (Platzhalter - füge API später)
    // const token = await SecureStore.getItemAsync('token');
    // axios.get(`http://localhost:5000/api/service/chat/${ticketId}`, { headers: { Authorization: token } })...

    return () => socket.off('message');
  }, [messages]);

  const sendMessage = async () => {
    const user = JSON.parse(await SecureStore.getItemAsync('user'));
    socket.emit('message', { ticketId, message, userId: user._id });
    setMessage('');
  };

  return (
    <View>
      <FlatList data={messages} renderItem={({ item }) => <Text>{item.message}</Text>} />
      <TextInput placeholder="Nachricht..." value={message} onChangeText={setMessage} />
      <Button title="Senden" onPress={sendMessage} />
    </View>
  );
};

export default Chat;