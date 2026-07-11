import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Fullscreen image viewer used across the app — every tappable Image should
// navigate here with { uri }. Renders on top of the current stack so it works
// from Chat, Ticket, Profile, Feed, About, etc.
export default function ImageViewerScreen({ route, navigation }) {
  const { uri } = route.params || {};
  const [loading, setLoading] = useState(true);
  const { width, height } = Dimensions.get('window');

  if (!uri) {
    navigation.goBack();
    return null;
  }

  return (
    <View style={s.container}>
      <StatusBar hidden />
      <TouchableOpacity
        style={s.closeBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialCommunityIcons name="close" size={30} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.imageWrap}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      >
        <Image
          source={{ uri }}
          style={{ width, height, resizeMode: 'contain' }}
          onLoadEnd={() => setLoading(false)}
        />
        {loading && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={s.loader}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 999,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
