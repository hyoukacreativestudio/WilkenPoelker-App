import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal as RNModal,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import Button from '../ui/Button';
import { getPreviewUri, revokePreviewUri, getDisplayUri } from '../../utils/imageHelpers';
import ImageEditModal from '../shared/ImageEditModal';

export default function CreatePostModal({ visible, onClose, onSubmit }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const pickImage = async (useCamera = false) => {
    const options = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    };

    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      asset._previewUri = getPreviewUri(asset);
      // Revoke old preview if replacing
      if (image?._previewUri) revokePreviewUri(image._previewUri);
      setImage(asset);
    }
  };

  const removeImage = () => {
    if (image?._previewUri) revokePreviewUri(image._previewUri);
    setImage(null);
  };

  const handleSubmit = () => {
    if (!content.trim() && !image) return;
    const postData = { content: content.trim() };
    if (image) {
      const uri = image.uri;
      const fileName = image.fileName || 'photo.jpg';
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
      postData.image = {
        uri,
        name: fileName,
        type: mimeMap[ext] || image.mimeType || 'image/jpeg',
        file: image.file || null, // expo-image-picker provides native File on web
      };
    }
    onSubmit(postData);
    setContent('');
    setImage(null);
  };

  const handleClose = () => {
    if (image?._previewUri) revokePreviewUri(image._previewUri);
    setContent('');
    setImage(null);
    onClose();
  };

  const canSubmit = content.trim() || image;

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: theme.colors.overlay,
          justifyContent: 'center',
          padding: theme.spacing.lg,
        }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.xl,
              maxHeight: '85%',
              overflow: 'hidden',
              ...theme.shadows.lg,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.divider,
              }}
            >
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[theme.typography.styles.h5, { color: theme.colors.text }]}>
                {t('feed.newPost', 'New Post')}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Scrollable Content Area */}
            <ScrollView
              style={{ flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Content Input */}
              <View style={{ padding: theme.spacing.md }}>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder={t('feed.whatsOnYourMind', "What's on your mind?")}
                  placeholderTextColor={theme.colors.placeholder}
                  multiline
                  style={[
                    theme.typography.styles.body,
                    {
                      color: theme.colors.text,
                      minHeight: 100,
                      textAlignVertical: 'top',
                    },
                  ]}
                />
              </View>

              {/* Image Preview */}
              {image && (
                <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: getDisplayUri(image) }}
                      style={{
                        width: '100%',
                        height: 200,
                        borderRadius: theme.borderRadius.md,
                      }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={removeImage}
                      activeOpacity={0.7}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                    {/* Edit button */}
                    <TouchableOpacity
                      onPress={() => setShowEdit(true)}
                      activeOpacity={0.7}
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4 }}>
                        {t('imageEdit.edit', 'Bearbeiten')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Fixed Bottom: Attachment Bar + Submit Button */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
              }}
            >
              {/* Attachment Bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}
              >
                <TouchableOpacity
                  style={{ marginRight: theme.spacing.md }}
                  activeOpacity={0.7}
                  onPress={() => pickImage(true)}
                >
                  <MaterialCommunityIcons name="camera" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} onPress={() => pickImage(false)}>
                  <MaterialCommunityIcons name="image" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
                <Button
                  title={t('feed.post', 'Post')}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  fullWidth
                />
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

      {/* Image Edit Modal */}
      {showEdit && image && (
        <ImageEditModal
          visible={showEdit}
          image={image}
          onSave={(editedImage) => {
            setImage(editedImage);
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </RNModal>
  );
}
