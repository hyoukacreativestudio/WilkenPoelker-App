import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { getPreviewUri, revokePreviewUri, createStablePreviewUri } from '../../utils/imageHelpers';

const MIN_CROP_SIZE = 40;
const HANDLE_SIZE = 28;
const HANDLE_HIT = 36;

/* ─────────── Crop Overlay ─────────── */
function CropOverlay({ crop, imageLayout, onCropChange, theme }) {
  const cropRef = useRef(crop);
  const startRef = useRef({ crop: null, type: null });

  cropRef.current = crop;

  const getDragType = (x, y) => {
    const c = cropRef.current;
    const hit = HANDLE_HIT;

    // Corners
    if (Math.abs(x - c.x) < hit && Math.abs(y - c.y) < hit) return 'tl';
    if (Math.abs(x - (c.x + c.w)) < hit && Math.abs(y - c.y) < hit) return 'tr';
    if (Math.abs(x - c.x) < hit && Math.abs(y - (c.y + c.h)) < hit) return 'bl';
    if (Math.abs(x - (c.x + c.w)) < hit && Math.abs(y - (c.y + c.h)) < hit) return 'br';

    // Edges
    if (Math.abs(x - c.x) < hit && y > c.y && y < c.y + c.h) return 'left';
    if (Math.abs(x - (c.x + c.w)) < hit && y > c.y && y < c.y + c.h) return 'right';
    if (Math.abs(y - c.y) < hit && x > c.x && x < c.x + c.w) return 'top';
    if (Math.abs(y - (c.y + c.h)) < hit && x > c.x && x < c.x + c.w) return 'bottom';

    // Move (inside)
    if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) return 'move';

    return null;
  };

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const type = getDragType(locationX, locationY);
        startRef.current = { crop: { ...cropRef.current }, type };
      },
      onPanResponderMove: (evt, gesture) => {
        const { type, crop: sc } = startRef.current;
        if (!type || !sc) return;

        const maxW = imageLayout.width;
        const maxH = imageLayout.height;
        let { x, y, w, h } = sc;
        const dx = gesture.dx;
        const dy = gesture.dy;

        switch (type) {
          case 'move':
            x = clamp(sc.x + dx, 0, maxW - sc.w);
            y = clamp(sc.y + dy, 0, maxH - sc.h);
            w = sc.w;
            h = sc.h;
            break;
          case 'tl':
            x = clamp(sc.x + dx, 0, sc.x + sc.w - MIN_CROP_SIZE);
            y = clamp(sc.y + dy, 0, sc.y + sc.h - MIN_CROP_SIZE);
            w = sc.x + sc.w - x;
            h = sc.y + sc.h - y;
            break;
          case 'tr':
            y = clamp(sc.y + dy, 0, sc.y + sc.h - MIN_CROP_SIZE);
            w = clamp(sc.w + dx, MIN_CROP_SIZE, maxW - sc.x);
            h = sc.y + sc.h - y;
            break;
          case 'bl':
            x = clamp(sc.x + dx, 0, sc.x + sc.w - MIN_CROP_SIZE);
            w = sc.x + sc.w - x;
            h = clamp(sc.h + dy, MIN_CROP_SIZE, maxH - sc.y);
            break;
          case 'br':
            w = clamp(sc.w + dx, MIN_CROP_SIZE, maxW - sc.x);
            h = clamp(sc.h + dy, MIN_CROP_SIZE, maxH - sc.y);
            break;
          case 'left':
            x = clamp(sc.x + dx, 0, sc.x + sc.w - MIN_CROP_SIZE);
            w = sc.x + sc.w - x;
            break;
          case 'right':
            w = clamp(sc.w + dx, MIN_CROP_SIZE, maxW - sc.x);
            break;
          case 'top':
            y = clamp(sc.y + dy, 0, sc.y + sc.h - MIN_CROP_SIZE);
            h = sc.y + sc.h - y;
            break;
          case 'bottom':
            h = clamp(sc.h + dy, MIN_CROP_SIZE, maxH - sc.y);
            break;
        }

        onCropChange({ x, y, w, h });
      },
    })
  ).current;

  const c = crop;
  const primary = theme.colors.primary;

  // Corner handle style
  const cornerBase = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: imageLayout.width,
        height: imageLayout.height,
      }}
      {...panResponder.panHandlers}
    >
      {/* Dark overlay outside crop area */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: imageLayout.width, height: c.y, backgroundColor: 'rgba(0,0,0,0.55)' }} />
      <View style={{ position: 'absolute', top: c.y, left: 0, width: c.x, height: c.h, backgroundColor: 'rgba(0,0,0,0.55)' }} />
      <View style={{ position: 'absolute', top: c.y, left: c.x + c.w, width: imageLayout.width - c.x - c.w, height: c.h, backgroundColor: 'rgba(0,0,0,0.55)' }} />
      <View style={{ position: 'absolute', top: c.y + c.h, left: 0, width: imageLayout.width, height: imageLayout.height - c.y - c.h, backgroundColor: 'rgba(0,0,0,0.55)' }} />

      {/* Crop border */}
      <View
        style={{
          position: 'absolute',
          top: c.y,
          left: c.x,
          width: c.w,
          height: c.h,
          borderWidth: 1.5,
          borderColor: '#fff',
        }}
      >
        {/* Grid lines (rule of thirds) */}
        <View style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
        <View style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
        <View style={{ position: 'absolute', top: '33.3%', left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
        <View style={{ position: 'absolute', top: '66.6%', left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
      </View>

      {/* Corner handles - L-shaped */}
      {/* Top-left */}
      <View style={{ ...cornerBase, top: c.y - 3, left: c.x - 3 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: HANDLE_SIZE, height: 3, backgroundColor: primary }} />
        <View style={{ position: 'absolute', top: 0, left: 0, width: 3, height: HANDLE_SIZE, backgroundColor: primary }} />
      </View>
      {/* Top-right */}
      <View style={{ ...cornerBase, top: c.y - 3, left: c.x + c.w - HANDLE_SIZE + 3 }}>
        <View style={{ position: 'absolute', top: 0, right: 0, width: HANDLE_SIZE, height: 3, backgroundColor: primary }} />
        <View style={{ position: 'absolute', top: 0, right: 0, width: 3, height: HANDLE_SIZE, backgroundColor: primary }} />
      </View>
      {/* Bottom-left */}
      <View style={{ ...cornerBase, top: c.y + c.h - HANDLE_SIZE + 3, left: c.x - 3 }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: HANDLE_SIZE, height: 3, backgroundColor: primary }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: HANDLE_SIZE, backgroundColor: primary }} />
      </View>
      {/* Bottom-right */}
      <View style={{ ...cornerBase, top: c.y + c.h - HANDLE_SIZE + 3, left: c.x + c.w - HANDLE_SIZE + 3 }}>
        <View style={{ position: 'absolute', bottom: 0, right: 0, width: HANDLE_SIZE, height: 3, backgroundColor: primary }} />
        <View style={{ position: 'absolute', bottom: 0, right: 0, width: 3, height: HANDLE_SIZE, backgroundColor: primary }} />
      </View>
    </View>
  );
}

/* ─────────── Main Modal ─────────── */
export default function ImageEditModal({ visible, image, onSave, onClose }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [actions, setActions] = useState([]);
  const [previewUri, setPreviewUri] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState(null);
  const [imageLayout, setImageLayout] = useState(null);

  const displayUri = previewUri || image?._previewUri || image?.uri;

  const applyActions = async (newActions) => {
    if (!image) return;
    setProcessing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        newActions,
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (previewUri) revokePreviewUri(previewUri);
      // Create a stable preview URI (on web, blob URIs from manipulator may be revoked)
      const newPreview = await createStablePreviewUri(result);
      setPreviewUri(newPreview);
      setActions(newActions);
    } catch (err) {
      console.error('Image manipulation error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleRotate = () => {
    if (cropping) return;
    applyActions([...actions, { rotate: 90 }]);
  };

  const handleFlip = () => {
    if (cropping) return;
    applyActions([...actions, { flip: ImageManipulator.FlipType.Horizontal }]);
  };

  const handleStartCrop = () => {
    if (!imageLayout) return;
    if (cropping) {
      // Cancel crop
      setCropping(false);
      setCrop(null);
      return;
    }
    // Start crop with 80% inset
    const insetX = imageLayout.width * 0.1;
    const insetY = imageLayout.height * 0.1;
    setCrop({
      x: insetX,
      y: insetY,
      w: imageLayout.width - insetX * 2,
      h: imageLayout.height - insetY * 2,
    });
    setCropping(true);
  };

  const handleApplyCrop = async () => {
    if (!crop || !imageLayout || !image) return;
    // Map display coords to actual image pixel coords
    const imgW = image.width || 1000;
    const imgH = image.height || 1000;
    const scaleX = imgW / imageLayout.width;
    const scaleY = imgH / imageLayout.height;

    const cropAction = {
      crop: {
        originX: Math.round(crop.x * scaleX),
        originY: Math.round(crop.y * scaleY),
        width: Math.round(crop.w * scaleX),
        height: Math.round(crop.h * scaleY),
      },
    };

    setCropping(false);
    setCrop(null);
    await applyActions([...actions, cropAction]);
  };

  const handleReset = () => {
    if (previewUri) revokePreviewUri(previewUri);
    setPreviewUri(null);
    setActions([]);
    setCropping(false);
    setCrop(null);
  };

  const handleSave = async () => {
    if (actions.length === 0) {
      onClose();
      return;
    }
    setProcessing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        actions,
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      let newFile = null;
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(result.uri);
          const blob = await response.blob();
          newFile = new File([blob], image.fileName || 'edited.jpg', { type: 'image/jpeg' });
        } catch {
          // fallback
        }
      }

      const stablePreview = await createStablePreviewUri({ ...result, file: newFile });
      const editedImage = {
        ...image,
        uri: result.uri,
        width: result.width,
        height: result.height,
        file: newFile || image.file,
        mimeType: 'image/jpeg',
        _previewUri: stablePreview,
      };

      if (previewUri) revokePreviewUri(previewUri);
      if (image._previewUri) revokePreviewUri(image._previewUri);

      onSave(editedImage);
      setActions([]);
      setPreviewUri(null);
      setCropping(false);
      setCrop(null);
    } catch (err) {
      console.error('Image save error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (previewUri) revokePreviewUri(previewUri);
    setPreviewUri(null);
    setActions([]);
    setCropping(false);
    setCrop(null);
    onClose();
  };

  const handleImageLayout = useCallback(
    (e) => {
      if (!image) return;
      const { width: containerW, height: containerH } = e.nativeEvent.layout;
      const imgW = image.width || 1000;
      const imgH = image.height || 1000;
      const imgAspect = imgW / imgH;
      const containerAspect = containerW / containerH;

      let displayW, displayH;
      if (imgAspect > containerAspect) {
        displayW = containerW;
        displayH = containerW / imgAspect;
      } else {
        displayH = containerH;
        displayW = containerH * imgAspect;
      }

      setImageLayout({
        width: displayW,
        height: displayH,
        offsetX: (containerW - displayW) / 2,
        offsetY: (containerH - displayH) / 2,
      });
    },
    [image]
  );

  if (!image) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.md,
            paddingTop: Platform.OS === 'ios' ? 50 : theme.spacing.md,
            paddingBottom: theme.spacing.sm,
          }}
        >
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={{ padding: 8 }}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[theme.typography.styles.h5, { color: '#fff' }]}>
            {t('imageEdit.title', 'Bild bearbeiten')}
          </Text>
          {cropping ? (
            <TouchableOpacity
              onPress={handleApplyCrop}
              activeOpacity={0.7}
              disabled={processing}
              style={{ padding: 8 }}
            >
              <Text style={[theme.typography.styles.body, { color: theme.colors.primary, fontWeight: '600' }]}>
                {t('imageEdit.applyCrop', 'Zuschnitt anwenden')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={processing}
              style={{ padding: 8 }}
            >
              <Text style={[theme.typography.styles.body, { color: theme.colors.primary, fontWeight: '600' }]}>
                {t('imageEdit.save', 'Fertig')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Image + Crop Area */}
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.md }}
          onLayout={handleImageLayout}
        >
          {processing && (
            <View style={{ position: 'absolute', zIndex: 10 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}

          {imageLayout && (
            <View
              style={{
                width: imageLayout.width,
                height: imageLayout.height,
                position: 'relative',
              }}
            >
              <Image
                source={{ uri: displayUri }}
                style={{
                  width: imageLayout.width,
                  height: imageLayout.height,
                  opacity: processing ? 0.5 : 1,
                }}
                resizeMode="contain"
              />

              {/* Crop overlay */}
              {cropping && crop && (
                <CropOverlay
                  crop={crop}
                  imageLayout={imageLayout}
                  onCropChange={setCrop}
                  theme={theme}
                />
              )}
            </View>
          )}

          {/* Fallback before layout measured */}
          {!imageLayout && (
            <Image
              source={{ uri: displayUri }}
              style={{ width: '100%', height: '100%', opacity: processing ? 0.5 : 1 }}
              resizeMode="contain"
            />
          )}

          {/* Crop hint text */}
          {cropping && (
            <Text
              style={[
                theme.typography.styles.caption,
                {
                  color: 'rgba(255,255,255,0.7)',
                  position: 'absolute',
                  bottom: 4,
                  textAlign: 'center',
                },
              ]}
            >
              {t('imageEdit.cropHint', 'Rahmen ziehen zum Zuschneiden')}
            </Text>
          )}
        </View>

        {/* Action Bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            paddingVertical: theme.spacing.lg,
            paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.lg,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <ActionButton
            icon="rotate-right"
            label={t('imageEdit.rotate', 'Drehen')}
            onPress={handleRotate}
            disabled={processing || cropping}
            theme={theme}
          />
          <ActionButton
            icon="flip-horizontal"
            label={t('imageEdit.flip', 'Spiegeln')}
            onPress={handleFlip}
            disabled={processing || cropping}
            theme={theme}
          />
          <ActionButton
            icon="crop"
            label={t('imageEdit.crop', 'Zuschneiden')}
            onPress={handleStartCrop}
            disabled={processing}
            active={cropping}
            theme={theme}
          />
          <ActionButton
            icon="undo"
            label={t('imageEdit.reset', 'Zurücksetzen')}
            onPress={handleReset}
            disabled={processing || (actions.length === 0 && !cropping)}
            theme={theme}
          />
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({ icon, label, onPress, disabled, active, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{
        alignItems: 'center',
        opacity: disabled ? 0.4 : 1,
        paddingHorizontal: theme.spacing.sm,
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={26}
        color={active ? theme.colors.primary : '#fff'}
      />
      <Text
        style={[
          theme.typography.styles.caption,
          { color: active ? theme.colors.primary : '#fff', marginTop: 4 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
