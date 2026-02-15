import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme } from '../context/ThemeContext';

const socket = io('http://192.168.178.24:5000');

const Chat = ({ route, navigation }) => {
  const { isDark } = useTheme();
  const { ticketId } = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync('token');
        const res = await axios.get(`http://192.168.178.24:5000/api/service/chat/${ticketId}`, {
          headers: { Authorization: token }
        });
        setMessages(res.data);
      } catch (err) {
        Alert.alert('Fehler', 'Nachrichten konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Real-Time-Nachrichten empfangen
    socket.on('message', (msg) => {
      if (msg.ticketId === ticketId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      socket.off('message');
    };
  }, [ticketId]);

  // Automatisch nach unten scrollen bei neuer Nachricht
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const user = JSON.parse(await SecureStore.getItemAsync('user'));

      const messageData = {
        ticketId,
        message: newMessage,
        userId: user._id,
        username: user.username,
      };

      // Sofort lokal anzeigen (optimistic UI)
      setMessages(prev => [...prev, { ...messageData, createdAt: new Date(), _id: Date.now().toString() }]);

      // An Server senden
      socket.emit('message', messageData);

      setNewMessage('');
    } catch (err) {
      Alert.alert('Fehler', 'Nachricht konnte nicht gesendet werden');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.userId === JSON.parse(SecureStore.getItemAsync('user')?._id);
    return (
      <View style={[
        styles.messageBubble,
        isOwn ? styles.ownMessage : styles.otherMessage,
        isDark && styles.messageDark,
      ]}>
        {!isOwn && <Text style={styles.sender}>{item.username || 'Support'}</Text>}
        <Text style={[styles.messageText, isDark && styles.textDark]}>{item.message}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Image source={require('../assets/header.png')} style={styles.header} resizeMode="contain" />

        {loading && <LoadingOverlay />}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.chatList}
          inverted={false}
          ListEmptyComponent={<Text style={[styles.empty, isDark && styles.textDark]}>Noch keine Nachrichten</Text>}
        />

        <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Nachricht schreiben..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.sendText}>Senden</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  containerDark: { backgroundColor: '#1B5E20' },
  header: { width: '100%', height: 140, marginBottom: 16 },
  chatList: { padding: 16, paddingBottom: 100 },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 6,
    padding: 12,
    borderRadius: 20,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
  },
  messageDark: { backgroundColor: '#388E3C' },
  sender: { fontSize: 13, color: '#555', marginBottom: 4 },
  messageText: { fontSize: 16, color: 'white' },
  time: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'right' },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputContainerDark: { backgroundColor: '#1E1E1E', borderTopColor: '#444' },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 120,
  },
  inputDark: { backgroundColor: '#2E2E2E', color: 'white' },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: { color: 'white', fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#757575', fontSize: 16, marginTop: 40 },
  textDark: { color: '#E0E0E0' },
});

export default Chat;