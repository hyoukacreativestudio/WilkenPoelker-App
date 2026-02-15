import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

const IMAGE_SIZE = 80;

export default function ImagePicker({
  images = [],
  onImagesChange,
  maxImages = 5,
  style,
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleAddImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        t('common.notice', 'Notice'),
        t('imagePicker.maxReached', 'Maximum number of images reached')
      );
      return;
    }

    const permissionResult = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        t('common.permission', 'Permission Required'),
        t('imagePicker.permissionMessage', 'Please grant access to your photo library')
      );
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((asset) => asset.uri);
      const combined = [...images, ...newUris].slice(0, maxImages);
      if (onImagesChange) {
        onImagesChange(combined);
      }
    }
  };

  const handleRemoveImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    if (onImagesChange) {
      onImagesChange(updated);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.grid}>
        {images.map((uri, index) => (
          <View
            key={`${uri}-${index}`}
            style={[
              styles.imageWrapper,
              {
                borderRadius: theme.borderRadius.md,
                marginRight: theme.spacing.sm,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            <Image
              source={{ uri }}
              style={[
                styles.image,
                { borderRadius: theme.borderRadius.md },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.removeButton,
                { backgroundColor: theme.colors.error },
              ]}
              onPress={() => handleRemoveImage(index)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.inputBackground,
                marginRight: theme.spacing.sm,
                marginBottom: theme.spacing.sm,
              },
            ]}
            onPress={handleAddImage}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="camera-plus"
              size={28}
              color={theme.colors.placeholder}
            />
          </TouchableOpacity>
        )}
      </View>

      <Text
        style={[
          styles.counter,
          {
            color: theme.colors.textTertiary,
            ...theme.typography.styles.caption,
          },
        ]}
      >
        {images.length}/{maxImages}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    position: 'relative',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    marginTop: 4,
  },
});
