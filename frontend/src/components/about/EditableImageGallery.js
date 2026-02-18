import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

// Cross-platform confirm dialog
function confirmDelete(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH; // each slide takes full screen width for clean snapping
const IMAGE_MARGIN = 16; // horizontal margin inside each slide
const IMAGE_HEIGHT = (SLIDE_WIDTH - IMAGE_MARGIN * 2) * 0.6;

export default function EditableImageGallery({
  images = [],
  onSave,
  isEditMode,
  onUploadImage,
  imageMap,
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = styles(theme);
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getImageSource = (item) => {
    if (item.url) {
      return { uri: item.url };
    }
    if (item.image && imageMap && imageMap[item.image]) {
      return imageMap[item.image];
    }
    if (typeof item.image === 'number') {
      return item.image;
    }
    if (typeof item.image === 'string') {
      return { uri: item.image };
    }
    return null;
  };

  const handleDeleteImage = () => {
    if (images.length === 0) return;
    const index = activeIndex;
    const label = images[index]?.label || t('aboutUs.edit.image', 'Bild');
    confirmDelete(
      t('aboutUs.edit.removePhoto', 'Bild entfernen'),
      t('aboutUs.edit.removePhotoConfirm', '"{{name}}" wirklich entfernen?', { name: label }),
      () => {
        const newImages = images.filter((_, i) => i !== index);
        onSave(newImages);
        // Adjust activeIndex if we deleted the last item
        if (activeIndex >= newImages.length && newImages.length > 0) {
          setActiveIndex(newImages.length - 1);
        } else if (newImages.length === 0) {
          setActiveIndex(0);
        }
      }
    );
  };

  const handleAddImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        let imageUrl = asset.uri;

        if (onUploadImage) {
          const uploaded = await onUploadImage(asset.uri, asset.file);
          if (uploaded) {
            imageUrl = uploaded;
          }
        }

        const newImage = {
          id: Date.now().toString(),
          url: imageUrl,
          label: '',
        };
        const newImages = [...images, newImage];
        onSave(newImages);
        // Scroll to the new image after a brief delay
        setTimeout(() => {
          const newIndex = newImages.length - 1;
          setActiveIndex(newIndex);
          flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
        }, 100);
      }
    } catch (error) {
      // image picker failed silently
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(({ item, index }) => {
    const source = getImageSource(item);

    return (
      <View style={s.slideContainer}>
        <View style={s.imageCard}>
          {source ? (
            <Image source={source} style={s.image} resizeMode="cover" />
          ) : (
            <View style={[s.image, s.placeholderImage]}>
              <MaterialCommunityIcons
                name="image-off"
                size={40}
                color={theme.colors.textTertiary}
              />
            </View>
          )}

          {item.label ? (
            <View style={s.labelContainer}>
              <Text style={s.label} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }, [images, theme]);

  const keyExtractor = useCallback((item, index) => item.id || `img-${index}`, []);

  // Don't render FlatList if no images and not in edit mode
  if (images.length === 0 && !isEditMode) {
    return null;
  }

  return (
    <View style={s.galleryWrapper}>
      {/* Swipeable Image Gallery */}
      {images.length > 0 ? (
        <View>
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            snapToInterval={SLIDE_WIDTH}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={s.flatListContent}
            getItemLayout={(_, index) => ({
              length: SLIDE_WIDTH,
              offset: SLIDE_WIDTH * index,
              index,
            })}
          />

          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={s.dotsContainer}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    s.dot,
                    {
                      backgroundColor:
                        index === activeIndex
                          ? theme.colors.primary
                          : theme.colors.textTertiary + '50',
                      width: index === activeIndex ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Image counter */}
          <View style={s.counterContainer}>
            <Text style={s.counterText}>
              {activeIndex + 1} / {images.length}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.emptyContainer}>
          <MaterialCommunityIcons
            name="image-multiple-outline"
            size={48}
            color={theme.colors.textTertiary}
          />
          <Text style={s.emptyText}>
            {t('aboutUs.edit.noImages', 'Keine Bilder vorhanden')}
          </Text>
        </View>
      )}

      {/* Edit mode controls */}
      {isEditMode && (
        <View style={s.editControls}>
          <TouchableOpacity
            onPress={handleAddImage}
            style={s.editButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={s.editButtonText}>
              {t('about.addImage', 'Bild hinzufügen')}
            </Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <TouchableOpacity
              onPress={handleDeleteImage}
              style={[s.editButton, s.deleteButton]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={theme.colors.error}
              />
              <Text style={[s.editButtonText, { color: theme.colors.error }]}>
                {t('about.removeImage', 'Entfernen')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    galleryWrapper: {
      marginBottom: theme.spacing.md,
    },
    flatListContent: {
      // No extra padding — images fill the width
    },
    slideContainer: {
      width: SLIDE_WIDTH,
    },
    imageCard: {
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      ...theme.shadows.sm,
    },
    image: {
      width: '100%',
      height: IMAGE_HEIGHT,
    },
    placeholderImage: {
      backgroundColor: theme.colors.skeleton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelContainer: {
      padding: theme.spacing.sm,
    },
    label: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      gap: 6,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    counterContainer: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.md + theme.spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    counterText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    editControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      backgroundColor: theme.colors.primary + '08',
    },
    deleteButton: {
      borderColor: theme.colors.error + '30',
      backgroundColor: theme.colors.error + '08',
    },
    editButtonText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant,
    },
    emptyText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.sm,
    },
  });
