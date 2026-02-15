import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { aiApi } from '../../api/ai';
import { useToast } from '../../components/ui/Toast';

const CATEGORY_ICONS = {
  bike: 'bicycle',
  cleaning: 'spray-bottle',
  motor: 'engine',
};

const CATEGORY_COLORS = {
  bike: '#3182CE',
  cleaning: '#38A169',
  motor: '#DD6B20',
};

export default function ServiceAiChatScreen({ route, navigation }) {
  const { category } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const scrollViewRef = useRef(null);
  const tutorialOpacity = useRef(new Animated.Value(1)).current;

  const categoryColor = CATEGORY_COLORS[category] || theme.colors.primary;
  const categoryIcon = CATEGORY_ICONS[category] || 'robot';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const hideTutorial = useCallback(() => {
    Animated.timing(tutorialOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTutorial(false));
  }, [tutorialOpacity]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    // Hide tutorial on first message
    if (showTutorial) hideTutorial();

    // Add user message
    const userMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      const response = await aiApi.chat({
        category,
        message: trimmed,
        sessionId,
      });

      const data = response.data?.data || response.data;

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const aiMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        needsHuman: data.needsHuman,
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Check if AI suggests appointment
      if (data.reply && data.reply.includes('[TERMIN_EMPFEHLUNG]')) {
        // Remove the marker from displayed text and show appointment button
        aiMessage.content = data.reply.replace('[TERMIN_EMPFEHLUNG]', '').trim();
        aiMessage.showAppointmentLink = true;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = aiMessage;
          return updated;
        });
      }
    } catch (err) {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
      // Remove last user message on failure
      setMessages((prev) => prev.slice(0, -1));
      setInputText(trimmed);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, category, sessionId, showTutorial, hideTutorial, t, showToast]);

  const handleEscalate = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await aiApi.escalate(sessionId);
      const data = response.data?.data || response.data;
      showToast({ type: 'success', message: t('aiChat.escalated') });
      navigation.navigate('TicketDetail', { ticketId: data.ticketId });
    } catch (err) {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
    }
  }, [sessionId, navigation, t, showToast]);

  const handleOpenFaq = useCallback(() => {
    navigation.navigate('CategoryService', { category, title: t(`aiChat.categories.${category}`) });
  }, [navigation, category, t]);

  const handleCreateTicket = useCallback(() => {
    const typeMap = { bike: 'bike_question', cleaning: 'cleaning_question', motor: 'motor_question' };
    navigation.navigate('CreateTicket', { preselectedType: typeMap[category] });
  }, [navigation, category]);

  const handleAppointment = useCallback(() => {
    navigation.navigate('Appointments', { screen: 'NewAppointment' });
  }, [navigation]);

  const s = styles(theme);

  const renderTutorial = () => (
    <Animated.View style={[s.tutorialCard, { opacity: tutorialOpacity, borderLeftColor: categoryColor }]}>
      <View style={s.tutorialHeader}>
        <MaterialCommunityIcons name="lightbulb-outline" size={22} color={categoryColor} />
        <Text style={s.tutorialTitle}>{t('aiChat.tutorialTitle')}</Text>
        <TouchableOpacity onPress={hideTutorial} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={s.tutorialText}>{t('aiChat.tutorialIntro')}</Text>

      <View style={s.tutorialSteps}>
        <View style={s.tutorialStep}>
          <View style={[s.tutorialStepNumber, { backgroundColor: categoryColor }]}>
            <Text style={s.tutorialStepNumberText}>1</Text>
          </View>
          <Text style={s.tutorialStepText}>{t('aiChat.tutorialStep1')}</Text>
        </View>
        <View style={s.tutorialStep}>
          <View style={[s.tutorialStepNumber, { backgroundColor: categoryColor }]}>
            <Text style={s.tutorialStepNumberText}>2</Text>
          </View>
          <Text style={s.tutorialStepText}>{t('aiChat.tutorialStep2')}</Text>
        </View>
        <View style={s.tutorialStep}>
          <View style={[s.tutorialStepNumber, { backgroundColor: categoryColor }]}>
            <Text style={s.tutorialStepNumberText}>3</Text>
          </View>
          <Text style={s.tutorialStepText}>{t('aiChat.tutorialStep3')}</Text>
        </View>
      </View>

      <View style={[s.tutorialHint, { backgroundColor: categoryColor + '10' }]}>
        <MaterialCommunityIcons name="wrench" size={16} color={categoryColor} />
        <Text style={[s.tutorialHintText, { color: categoryColor }]}>{t('aiChat.tutorialRepairHint')}</Text>
      </View>
    </Animated.View>
  );

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';

    return (
      <View key={index} style={[s.messageBubbleRow, isUser ? s.userRow : s.aiRow]}>
        {!isUser && (
          <View style={[s.avatarContainer, { backgroundColor: categoryColor + '20' }]}>
            <MaterialCommunityIcons name={categoryIcon} size={18} color={categoryColor} />
          </View>
        )}
        <View style={[s.messageBubble, isUser ? [s.userBubble, { backgroundColor: categoryColor }] : s.aiBubble]}>
          <Text style={[s.messageText, isUser ? s.userText : s.aiText]}>{msg.content}</Text>

          {msg.showAppointmentLink && (
            <TouchableOpacity style={[s.appointmentLink, { borderColor: theme.colors.primary }]} onPress={handleAppointment}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.primary} />
              <Text style={[s.appointmentLinkText, { color: theme.colors.primary }]}>
                {t('aiChat.makeAppointment')}
              </Text>
            </TouchableOpacity>
          )}

          {msg.needsHuman && (
            <TouchableOpacity style={[s.escalateLink, { borderColor: theme.colors.warning }]} onPress={handleEscalate}>
              <MaterialCommunityIcons name="account-switch" size={16} color={theme.colors.warning} />
              <Text style={[s.escalateLinkText, { color: theme.colors.warning }]}>
                {t('aiChat.connectEmployee')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={s.emptyState}>
      <View style={[s.emptyIconContainer, { backgroundColor: categoryColor + '15' }]}>
        <MaterialCommunityIcons name={categoryIcon} size={48} color={categoryColor} />
      </View>
      <Text style={s.emptyTitle}>{t(`aiChat.categories.${category}`)}</Text>
      <Text style={s.emptySubtitle}>{t('aiChat.emptySubtitle')}</Text>
    </View>
  );

  const renderBottomLinks = () => (
    <View style={s.bottomLinks}>
      <View style={[s.bottomLinksDivider, { borderTopColor: theme.colors.border }]}>
        <Text style={s.bottomLinksTitle}>{t('aiChat.needMoreHelp')}</Text>
      </View>
      <View style={s.bottomLinksRow}>
        <TouchableOpacity style={[s.bottomLinkButton, { backgroundColor: theme.colors.card }]} onPress={handleOpenFaq}>
          <MaterialCommunityIcons name="frequently-asked-questions" size={22} color={theme.colors.primary} />
          <Text style={s.bottomLinkLabel}>{t('aiChat.openFaq')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bottomLinkButton, { backgroundColor: theme.colors.card }]} onPress={handleCreateTicket}>
          <MaterialCommunityIcons name="ticket-outline" size={22} color={theme.colors.primary} />
          <Text style={s.bottomLinkLabel}>{t('aiChat.createTicket')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={s.chatArea}
        contentContainerStyle={s.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tutorial */}
        {showTutorial && renderTutorial()}

        {/* Empty state or messages */}
        {messages.length === 0 && !showTutorial && renderEmptyState()}

        {/* Messages */}
        {messages.map(renderMessage)}

        {/* Typing indicator */}
        {sending && (
          <View style={[s.messageBubbleRow, s.aiRow]}>
            <View style={[s.avatarContainer, { backgroundColor: categoryColor + '20' }]}>
              <MaterialCommunityIcons name={categoryIcon} size={18} color={categoryColor} />
            </View>
            <View style={[s.messageBubble, s.aiBubble, s.typingBubble]}>
              <ActivityIndicator size="small" color={categoryColor} />
              <Text style={[s.typingText, { color: theme.colors.textSecondary }]}>{t('aiChat.thinking')}</Text>
            </View>
          </View>
        )}

        {/* Bottom links (FAQ + Ticket) */}
        {messages.length > 0 && renderBottomLinks()}
      </ScrollView>

      {/* Input Area */}
      <View style={s.inputArea}>
        <View style={s.inputRow}>
          <TextInput
            style={[s.textInput, { borderColor: sending ? theme.colors.border : categoryColor + '60' }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('aiChat.placeholder')}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={2000}
            editable={!sending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendButton, { backgroundColor: inputText.trim() && !sending ? categoryColor : theme.colors.border }]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
    chatArea: {
      flex: 1,
    },
    chatContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },

    // Tutorial
    tutorialCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderLeftWidth: 4,
    },
    tutorialHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    tutorialTitle: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginLeft: theme.spacing.sm,
      flex: 1,
    },
    tutorialText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    tutorialSteps: {
      marginBottom: theme.spacing.sm,
    },
    tutorialStep: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    tutorialStepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    tutorialStepNumberText: {
      ...theme.typography.styles.caption,
      color: '#FFFFFF',
      fontWeight: theme.typography.weights.bold,
    },
    tutorialStepText: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.text,
      flex: 1,
    },
    tutorialHint: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.xs,
    },
    tutorialHintText: {
      ...theme.typography.styles.caption,
      marginLeft: theme.spacing.xs,
      flex: 1,
      fontWeight: theme.typography.weights.medium,
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },

    // Messages
    messageBubbleRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
      alignItems: 'flex-end',
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    aiRow: {
      justifyContent: 'flex-start',
    },
    avatarContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.xs,
    },
    messageBubble: {
      maxWidth: '78%',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    userBubble: {
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: theme.colors.card,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      ...theme.typography.styles.body,
      lineHeight: 22,
    },
    userText: {
      color: '#FFFFFF',
    },
    aiText: {
      color: theme.colors.text,
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    typingText: {
      ...theme.typography.styles.bodySmall,
      marginLeft: theme.spacing.sm,
    },

    // Appointment link inside AI message
    appointmentLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    appointmentLinkText: {
      ...theme.typography.styles.bodySmall,
      fontWeight: theme.typography.weights.semiBold,
      marginLeft: theme.spacing.xs,
    },

    // Escalate link inside AI message
    escalateLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    escalateLinkText: {
      ...theme.typography.styles.bodySmall,
      fontWeight: theme.typography.weights.semiBold,
      marginLeft: theme.spacing.xs,
    },

    // Bottom links
    bottomLinks: {
      marginTop: theme.spacing.lg,
    },
    bottomLinksDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    bottomLinksTitle: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    bottomLinksRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    bottomLinkButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.sm,
    },
    bottomLinkLabel: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },

    // Input area
    inputArea: {
      backgroundColor: theme.colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      padding: theme.spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    textInput: {
      flex: 1,
      ...theme.typography.styles.body,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.xs,
      maxHeight: 100,
      minHeight: 40,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.sm,
    },
  });
