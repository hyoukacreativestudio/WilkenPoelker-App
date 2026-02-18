import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';

export default function EditableImage({
  imageSource,
  onReplace,
  isEditMode,
  width = 200,
  height = 200,
  style,
}) {
  const { theme } = useTheme();
  const s = styles(theme);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        onReplace(asset.uri, asset.file);
      }
    } catch (error) {
      // image picker failed silently
    }
  };

  const imageStyle = [
    {
      width,
      height,
      borderRadius: theme.borderRadius.lg,
    },
    style,
  ];

  if (!isEditMode) {
    return (
      <Image
        source={imageSource}
        style={imageStyle}
        resizeMode="cover"
      />
    );
  }

  return (
    <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
      <View style={{ position: 'relative' }}>
        <Image
          source={imageSource}
          style={imageStyle}
          resizeMode="cover"
        />
        <View style={[s.overlay, { width, height, borderRadius: theme.borderRadius.lg }, style]}>
          <View style={s.iconCircle}>
            <MaterialCommunityIcons
              name="camera"
              size={24}
              color="#FFFFFF"
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.primary + 'CC',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
