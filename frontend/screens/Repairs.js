import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const Repairs = () => {
  const [repairs, setRepairs] = useState([]);

  useEffect(() => {
    const fetchRepairs = async () => {
      const token = await SecureStore.getItemAsync('token');
      const res = await axios.get('http://localhost:5000/api/service/repairs', { headers: { Authorization: token } });
      setRepairs(res.data);
    };
    fetchRepairs();
  }, []);

  return (
    <FlatList
      data={repairs}
      renderItem={({ item }) => <Text>{item.description} - Status: {item.status}</Text>}
    />
  );
};

export default Repairs;