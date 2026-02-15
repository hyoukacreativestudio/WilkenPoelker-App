import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import Button from '../ui/Button';

export default function EditPostModal({ visible, onClose, onSubmit, post }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (post && visible) {
      setContent(post.content || '');
    }
  }, [post, visible]);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(post._id || post.id, { content: content.trim() });
    onClose();
  };

  const handleClose = () => {
    setContent('');
    onClose();
  };

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
                {t('feed.editPost')}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Scrollable Content Area */}
            <ScrollView
              style={{ flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
            </ScrollView>

            {/* Fixed Bottom: Submit Button */}
            <View
              style={{
                padding: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
              }}
            >
              <Button
                title={t('common.save', 'Speichern')}
                onPress={handleSubmit}
                disabled={!content.trim()}
                fullWidth
                size="large"
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </RNModal>
  );
}
