import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

export default function ChatInput({ onSend, onTyping, disabled, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);

  const handleSend = () => {
    if ((!text.trim() && images.length === 0) || disabled) return;
    onSend(text.trim(), images);
    setText('');
    setImages([]);
  };

  const handlePickImage = async () => {
    if (disabled) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newImages = result.assets.slice(0, 5 - images.length);
      // On web, pre-fetch the blobs immediately so they survive state changes
      if (Platform.OS === 'web') {
        for (const asset of newImages) {
          if (asset.uri) {
            try {
              const resp = await fetch(asset.uri);
              asset._webBlob = await resp.blob();
            } catch (e) {
              console.warn('Failed to pre-fetch image blob:', e);
            }
          }
        }
      }
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTextChange = (val) => {
    setText(val);
    if (onTyping && val.length > 0) onTyping();
  };

  const canSend = (text.trim().length > 0 || images.length > 0) && !disabled;

  return (
    <View style={[{ backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }, style]}>
      {/* Image Preview Row */}
      {images.length > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, gap: theme.spacing.xs }}>
          {images.map((img, index) => (
            <View key={index} style={{ position: 'relative' }}>
              <Image
                source={{ uri: img.uri }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: theme.borderRadius.sm,
                }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => handleRemoveImage(index)}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: theme.colors.error,
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="close" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input Row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm }}>
        {/* Attachment Button */}
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={disabled || images.length >= 5}
          style={{
            padding: theme.spacing.sm,
            opacity: disabled || images.length >= 5 ? 0.5 : 1,
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="image-plus" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          value={text}
          onChangeText={handleTextChange}
          placeholder={t('chat.typeMessage', 'Type a message...')}
          placeholderTextColor={theme.colors.placeholder}
          multiline
          editable={!disabled}
          style={[
            theme.typography.styles.body,
            {
              flex: 1,
              color: theme.colors.text,
              backgroundColor: theme.colors.inputBackground,
              borderRadius: theme.borderRadius.xl,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              maxHeight: 100,
              marginHorizontal: theme.spacing.sm,
            },
          ]}
        />

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={{
            padding: theme.spacing.sm,
            opacity: canSend ? 1 : 0.4,
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="send"
            size={24}
            color={canSend ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
