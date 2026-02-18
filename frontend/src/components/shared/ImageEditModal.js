import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { getPreviewUri, revokePreviewUri } from '../../utils/imageHelpers';

/**
 * Simple image editing modal with rotate, flip, and crop-to-square.
 *
 * Props:
 * - visible: boolean
 * - image: picker asset object with { uri, file?, _previewUri? }
 * - onSave: (editedImage) => void — returns updated asset with new uri + _previewUri
 * - onClose: () => void
 */
export default function ImageEditModal({ visible, image, onSave, onClose }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [actions, setActions] = useState([]);
  const [previewUri, setPreviewUri] = useState(null);

  // Build a display URI for the current state
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
      // Revoke old preview
      if (previewUri) revokePreviewUri(previewUri);
      const newPreview = getPreviewUri({ ...result, file: null });
      setPreviewUri(newPreview !== result.uri ? newPreview : result.uri);
      setActions(newActions);
    } catch (err) {
      console.error('Image manipulation error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleRotate = () => {
    const newActions = [...actions, { rotate: 90 }];
    applyActions(newActions);
  };

  const handleFlip = () => {
    const newActions = [...actions, { flip: ImageManipulator.FlipType.Horizontal }];
    applyActions(newActions);
  };

  const handleCropSquare = () => {
    if (!image) return;
    // Get image dimensions — use width/height from asset if available
    const w = image.width || 1000;
    const h = image.height || 1000;
    const size = Math.min(w, h);
    const originX = Math.floor((w - size) / 2);
    const originY = Math.floor((h - size) / 2);
    const newActions = [
      ...actions,
      { crop: { originX, originY, width: size, height: size } },
    ];
    applyActions(newActions);
  };

  const handleReset = () => {
    if (previewUri) revokePreviewUri(previewUri);
    setPreviewUri(null);
    setActions([]);
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

      // Build new image object
      let newFile = null;
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(result.uri);
          const blob = await response.blob();
          newFile = new File([blob], image.fileName || 'edited.jpg', { type: 'image/jpeg' });
        } catch {
          // fallback — no file object
        }
      }

      const editedImage = {
        ...image,
        uri: result.uri,
        width: result.width,
        height: result.height,
        file: newFile || image.file,
        mimeType: 'image/jpeg',
        _previewUri: getPreviewUri({ ...result, file: newFile }),
      };

      // Revoke old previews
      if (previewUri) revokePreviewUri(previewUri);
      if (image._previewUri) revokePreviewUri(image._previewUri);

      onSave(editedImage);
      setActions([]);
      setPreviewUri(null);
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
    onClose();
  };

  if (!image) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
        }}
      >
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
        </View>

        {/* Image Preview */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.md }}>
          {processing && (
            <View style={{ position: 'absolute', zIndex: 10 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
          <Image
            source={{ uri: displayUri }}
            style={{
              width: '100%',
              height: '100%',
              opacity: processing ? 0.5 : 1,
            }}
            resizeMode="contain"
          />
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
            disabled={processing}
            theme={theme}
          />
          <ActionButton
            icon="flip-horizontal"
            label={t('imageEdit.flip', 'Spiegeln')}
            onPress={handleFlip}
            disabled={processing}
            theme={theme}
          />
          <ActionButton
            icon="crop"
            label={t('imageEdit.cropSquare', 'Quadrat')}
            onPress={handleCropSquare}
            disabled={processing}
            theme={theme}
          />
          <ActionButton
            icon="undo"
            label={t('imageEdit.reset', 'Zurücksetzen')}
            onPress={handleReset}
            disabled={processing || actions.length === 0}
            theme={theme}
          />
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({ icon, label, onPress, disabled, theme }) {
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
      <MaterialCommunityIcons name={icon} size={26} color="#fff" />
      <Text
        style={[
          theme.typography.styles.caption,
          { color: '#fff', marginTop: 4 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
