import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { aiApi } from '../../api/ai';

const MAX_VISIBLE_MESSAGES = 3;

export default function AiChatWidget({ category = 'bike', onOpenFullChat, style }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);

  const handlePickImage = async () => {
    if (sending) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - pendingImages.length,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      // On web, pre-fetch the blobs immediately so they survive state changes
      if (Platform.OS === 'web') {
        for (const asset of result.assets) {
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
      setPendingImages((prev) => [...prev, ...result.assets].slice(0, 3));
    }
  };

  const handleRemoveImage = (index) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && pendingImages.length === 0) || sending) return;

    const userMessage = {
      role: 'user',
      content: trimmed,
      images: pendingImages.map((img) => img.uri),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    const imagesToSend = [...pendingImages];
    setPendingImages([]);
    setSending(true);

    try {
      const response = await aiApi.chat(
        { category, message: trimmed || '[Bild]', sessionId },
        imagesToSend,
      );

      const data = response.data?.data || response.data;

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const aiMessage = {
        role: 'assistant',
        content: data.reply,
        needsHuman: data.needsHuman,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      setInputText(trimmed);
      setPendingImages(imagesToSend);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, category, sessionId, pendingImages]);

  const handleOpenFull = useCallback(() => {
    if (onOpenFullChat) {
      onOpenFullChat(category);
    }
  }, [onOpenFullChat, category]);

  const visibleMessages = messages.slice(-MAX_VISIBLE_MESSAGES);
  const hasHiddenMessages = messages.length > MAX_VISIBLE_MESSAGES;
  const canSend = (inputText.trim().length > 0 || pendingImages.length > 0) && !sending;

  const s = styles(theme);

  return (
    <View style={[s.container, style]}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
          <MaterialCommunityIcons name="robot-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={s.headerTextContainer}>
          <Text style={s.headerTitle}>{t('serviceHome.aiChat.title')}</Text>
          <Text style={s.headerSubtitle}>{t('serviceHome.aiChat.subtitle')}</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleOpenFull} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-expand" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages (compact) */}
      {visibleMessages.length > 0 && (
        <View style={s.messagesContainer}>
          {hasHiddenMessages && (
            <TouchableOpacity onPress={handleOpenFull} style={s.showMoreRow}>
              <Text style={s.showMoreText}>{t('serviceHome.aiChat.showMore')}</Text>
            </TouchableOpacity>
          )}
          {visibleMessages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <View key={index} style={[s.messageRow, isUser ? s.userRow : s.aiRow]}>
                {!isUser && (
                  <View style={[s.messageAvatar, { backgroundColor: theme.colors.primary + '15' }]}>
                    <MaterialCommunityIcons name="robot" size={12} color={theme.colors.primary} />
                  </View>
                )}
                <View
                  style={[
                    s.messageBubble,
                    isUser
                      ? [s.userBubble, { backgroundColor: theme.colors.primary }]
                      : s.aiBubble,
                  ]}
                >
                  {/* Image thumbnails in message */}
                  {msg.images && msg.images.length > 0 && (
                    <View style={{ flexDirection: 'row', marginBottom: msg.content ? 4 : 0 }}>
                      {msg.images.map((uri, i) => (
                        <Image
                          key={i}
                          source={{ uri }}
                          style={{ width: 48, height: 48, borderRadius: 4, marginRight: 4 }}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  )}
                  {msg.content ? (
                    <Text
                      style={[s.messageText, isUser ? s.userText : s.aiText]}
                      numberOfLines={3}
                    >
                      {msg.content}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {/* Typing indicator */}
          {sending && (
            <View style={[s.messageRow, s.aiRow]}>
              <View style={[s.messageAvatar, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialCommunityIcons name="robot" size={12} color={theme.colors.primary} />
              </View>
              <View style={[s.messageBubble, s.aiBubble, s.typingBubble]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Pending Image Previews */}
      {pendingImages.length > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xs, gap: theme.spacing.xs }}>
          {pendingImages.map((img, index) => (
            <View key={index} style={{ position: 'relative' }}>
              <Image
                source={{ uri: img.uri }}
                style={{ width: 48, height: 48, borderRadius: theme.borderRadius.sm }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => handleRemoveImage(index)}
                style={{
                  position: 'absolute', top: -5, right: -5,
                  backgroundColor: theme.colors.error, borderRadius: 8,
                  width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="close" size={10} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={s.inputRow}>
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={sending || pendingImages.length >= 3}
          style={{ padding: 4, opacity: sending || pendingImages.length >= 3 ? 0.4 : 1, marginRight: theme.spacing.xs }}
        >
          <MaterialCommunityIcons name="image-plus" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('serviceHome.aiChat.placeholder')}
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={500}
          editable={!sending}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            s.sendButton,
            { backgroundColor: canSend ? theme.colors.primary : theme.colors.border },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Full chat link */}
      <TouchableOpacity onPress={handleOpenFull} style={s.fullChatLink} activeOpacity={0.7}>
        <MaterialCommunityIcons name="chat-outline" size={14} color={theme.colors.primary} />
        <Text style={s.fullChatLinkText}>{t('serviceHome.aiChat.openFull')}</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
    },
    headerSubtitle: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },
    messagesContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    showMoreRow: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    showMoreText: {
      ...theme.typography.styles.caption,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
    },
    messageRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.xs,
      alignItems: 'flex-end',
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    aiRow: {
      justifyContent: 'flex-start',
    },
    messageAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 4,
    },
    messageBubble: {
      maxWidth: '80%',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    userBubble: {
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: theme.colors.background,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      ...theme.typography.styles.caption,
      lineHeight: 18,
    },
    userText: {
      color: '#FFFFFF',
    },
    aiText: {
      color: theme.colors.text,
    },
    typingBubble: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    input: {
      flex: 1,
      ...theme.typography.styles.bodySmall,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: Platform.OS === 'ios' ? theme.spacing.xs + 2 : theme.spacing.xs,
      minHeight: 36,
      maxHeight: 60,
    },
    sendButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.sm,
    },
    fullChatLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
    fullChatLinkText: {
      ...theme.typography.styles.caption,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
      marginHorizontal: theme.spacing.xs,
    },
  });
