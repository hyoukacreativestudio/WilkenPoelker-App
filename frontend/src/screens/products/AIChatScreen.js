import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { aiApi } from '../../api/ai';
import Button from '../../components/ui/Button';

const AI_ICON_SIZE = 28;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export default function AIChatScreen({ route, navigation }) {
  const category = route.params?.category || null;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messageCount, setMessageCount] = useState(0);

  const flatListRef = useRef(null);
  const typingDots = useRef(new Animated.Value(0)).current;
  const typingAnimation = useRef(null);

  // Welcome message on mount
  useEffect(() => {
    const welcomeKey = category
      ? `ai.welcomeCategory.${category}`
      : 'ai.welcome';
    const fallback = category
      ? t('ai.welcomeCategoryFallback', { category: t(`products.${category}`, category) })
      : t('ai.welcomeFallback');

    const welcomeMessage = {
      id: generateId(),
      role: 'ai',
      text: t(welcomeKey, fallback),
      createdAt: new Date().toISOString(),
    };

    const disclosureMessage = {
      id: generateId(),
      role: 'system',
      text: t('aiChat.dataDisclosure'),
      createdAt: new Date().toISOString(),
    };

    setMessages([welcomeMessage, disclosureMessage]);
  }, [category, t]);

  // Typing indicator animation
  useEffect(() => {
    if (sending) {
      typingAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(typingDots, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingDots, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      typingAnimation.current.start();
    } else {
      if (typingAnimation.current) {
        typingAnimation.current.stop();
      }
      typingDots.setValue(0);
    }

    return () => {
      if (typingAnimation.current) {
        typingAnimation.current.stop();
      }
    };
  }, [sending]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    const userMessage = {
      id: generateId(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [userMessage, ...prev]);
    setInputText('');
    setSending(true);
    setMessageCount((prev) => prev + 1);

    try {
      const response = await aiApi.chat({
        message: text,
        category: category || undefined,
        sessionId: sessionId || undefined,
      });

      const data = response.data?.data || response.data;
      const aiText = data.reply || data.message || data.response || t('ai.errorResponse');

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const aiMessage = {
        id: generateId(),
        role: 'ai',
        text: aiText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [aiMessage, ...prev]);
    } catch (err) {
      const errorMessage = {
        id: generateId(),
        role: 'ai',
        text: t('ai.errorMessage'),
        createdAt: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [errorMessage, ...prev]);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, sessionId, category, t]);

  const handleEscalate = useCallback(() => {
    navigation.navigate('ServiceStack', {
      screen: 'CreateTicket',
      params: { fromAI: true, sessionId },
    });
  }, [navigation, sessionId]);

  const s = styles(theme);

  const renderMessage = useCallback(
    ({ item }) => {
      const isUser = item.role === 'user';
      const isSystem = item.role === 'system';

      // System disclosure banner
      if (isSystem) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.info + '10', borderRadius: theme.borderRadius.md }}>
            <MaterialCommunityIcons name="shield-lock-outline" size={14} color={theme.colors.info} style={{ marginRight: theme.spacing.xs }} />
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, flex: 1 }]}>{item.text}</Text>
          </View>
        );
      }

      return (
        <View
          style={[
            s.messageBubbleWrapper,
            isUser ? s.userMessageWrapper : s.aiMessageWrapper,
          ]}
        >
          {/* AI Icon */}
          {!isUser && (
            <View style={[s.aiIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
              <MaterialCommunityIcons
                name="robot"
                size={16}
                color={theme.colors.primary}
              />
            </View>
          )}

          <View
            style={[
              s.messageBubble,
              isUser
                ? [s.userBubble, { backgroundColor: theme.colors.primary }]
                : [
                    s.aiBubble,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: item.isError ? theme.colors.error : 'transparent',
                      borderWidth: item.isError ? 1 : 0,
                    },
                  ],
            ]}
          >
            <Text
              style={[
                theme.typography.styles.body,
                {
                  color: isUser ? '#FFFFFF' : theme.colors.text,
                },
              ]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    },
    [s, theme]
  );

  const renderTypingIndicator = () => {
    if (!sending) return null;

    const opacity = typingDots.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <View style={[s.messageBubbleWrapper, s.aiMessageWrapper]}>
        <View style={[s.aiIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <MaterialCommunityIcons
            name="robot"
            size={16}
            color={theme.colors.primary}
          />
        </View>
        <View style={[s.messageBubble, s.aiBubble, { backgroundColor: theme.colors.surface }]}>
          <Animated.Text
            style={[
              theme.typography.styles.body,
              { color: theme.colors.textSecondary, opacity },
            ]}
          >
            {t('ai.typing')}
          </Animated.Text>
        </View>
      </View>
    );
  };

  const ListHeader = useCallback(() => {
    return (
      <View>
        {renderTypingIndicator()}
        {/* Escalate button after 3+ user messages */}
        {messageCount >= 3 && (
          <View style={s.escalateContainer}>
            <Button
              title={t('ai.escalateToHuman')}
              onPress={handleEscalate}
              variant="outline"
              size="small"
            />
          </View>
        )}
      </View>
    );
  }, [sending, messageCount, handleEscalate, t]);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages List (inverted) */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={s.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={ListHeader}
      />

      {/* Input Bar */}
      <View style={[s.inputBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('ai.inputPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          style={[
            theme.typography.styles.body,
            s.textInput,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.round,
            },
          ]}
          multiline
          maxLength={1000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={[
            s.sendButton,
            {
              backgroundColor:
                inputText.trim() && !sending
                  ? theme.colors.primary
                  : theme.colors.surface,
              borderRadius: theme.borderRadius.round,
            },
          ]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="send"
            size={20}
            color={inputText.trim() && !sending ? '#FFFFFF' : theme.colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    messagesList: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    messageBubbleWrapper: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
      maxWidth: '85%',
    },
    userMessageWrapper: {
      alignSelf: 'flex-end',
    },
    aiMessageWrapper: {
      alignSelf: 'flex-start',
    },
    aiIconContainer: {
      width: AI_ICON_SIZE,
      height: AI_ICON_SIZE,
      borderRadius: AI_ICON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    messageBubble: {
      padding: theme.spacing.sm + 2,
      maxWidth: '100%',
      flexShrink: 1,
    },
    userBubble: {
      borderRadius: theme.borderRadius.lg,
      borderBottomRightRadius: theme.borderRadius.sm,
    },
    aiBubble: {
      borderRadius: theme.borderRadius.lg,
      borderBottomLeftRadius: theme.borderRadius.sm,
    },
    escalateContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
    },
    textInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginRight: theme.spacing.sm,
    },
    sendButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
