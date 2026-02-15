import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const FloatingChatIcon = ({ navigation }) => {
  const [hasOpenTicket, setHasOpenTicket] = useState(false);
  const [ticketId, setTicketId] = useState(null);

  useEffect(() => {
    const checkOpenTicket = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const res = await axios.get('http://192.168.178.24:5000/api/service/openTickets', {
          headers: { Authorization: token }
        });
        if (res.data.hasOpen) {
          setHasOpenTicket(true);
          setTicketId(res.data.ticketId);
        }
      } catch (err) {
        console.log('Chat-Check-Fehler:', err);
      }
    };
    checkOpenTicket();
  }, []);

  if (!hasOpenTicket) return null;

  return (
    <TouchableOpacity 
      style={styles.floatingButton}
      onPress={() => navigation.navigate('Chat', { ticketId })}
    >
      <Image 
        source={require('../assets/chat_icon.png')}
        style={styles.iconImage}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconImage: { width: 40, height: 40, tintColor: 'white' },
});

export default FloatingChatIcon;