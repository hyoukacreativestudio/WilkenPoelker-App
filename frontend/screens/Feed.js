import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import LoadingOverlay from '../components/LoadingOverlay';

const socket = io('http://192.168.178.24:5000');

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const res = await axios.get('http://192.168.178.24:5000/api/feed', { headers: { Authorization: token } });
        setPosts(res.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();

    socket.on('newPost', (post) => setPosts([post, ...posts]));
  }, [posts]);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All });
    if (!result.canceled) setMedia(result.assets[0].uri);
  };

  const handlePost = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const formData = new FormData();
      formData.append('content', content);
      formData.append('type', media ? 'image' : 'text');
      if (media) formData.append('media', { uri: media, name: 'media.jpg', type: 'image/jpeg' });

      await axios.post('http://192.168.178.24:5000/api/feed', formData, {
        headers: { Authorization: token, 'Content-Type': 'multipart/form-data' }
      });
      setContent('');
      setMedia(null);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <Text style={styles.username}>{item.userId?.username || 'User'}</Text>
      <Text style={styles.content}>{item.content}</Text>
      {item.mediaUrl && (
        <Image source={{ uri: `http://192.168.178.24:5000${item.mediaUrl}` }} style={styles.postImage} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Image source={require('../assets/header.png')} style={styles.headerImage} resizeMode="contain" />

      <View style={styles.postInput}>
        <TextInput
          style={styles.input}
          placeholder="Was möchtest du teilen?"
          value={content}
          onChangeText={setContent}
          multiline
        />
        <TouchableOpacity style={styles.buttonSmall} onPress={pickMedia}>
          <Text style={styles.buttonTextSmall}>Bild/Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.greenButton} onPress={handlePost} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Posten</Text>}
        </TouchableOpacity>
      </View>

      {loading && <LoadingOverlay />}
      {!loading && (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item._id}
          ListEmptyComponent={<Text style={styles.empty}>Noch keine Beiträge</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  headerImage: { width: '100%', height: 140, marginBottom: 16 },
  postInput: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12, minHeight: 80, marginBottom: 12 },
  buttonSmall: { backgroundColor: '#2196F3', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  buttonTextSmall: { color: 'white', fontWeight: 'bold' },
  greenButton: { backgroundColor: '#4CAF50', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  postCard: { backgroundColor: 'white', margin: 12, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  username: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  content: { fontSize: 15, marginTop: 8, color: '#333' },
  postImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 12 },
  empty: { textAlign: 'center', color: '#757575', fontSize: 16, marginTop: 40 },
});

export default Feed;