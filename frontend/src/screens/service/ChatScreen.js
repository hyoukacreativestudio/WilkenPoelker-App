import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { serviceApi } from '../../api/service';
import { getServerUrl } from '../../api/client';
import ChatBubble from '../../components/service/ChatBubble';
import ChatInput from '../../components/service/ChatInput';
import RatingModal from '../../components/service/RatingModal';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';

export default function ChatScreen({ route, navigation }) {
  const { ticketId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [ticket, setTicket] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [profileModal, setProfileModal] = useState(null);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { onMessage, onTyping, onStopTyping, emitTyping, emitStopTyping, socket } = useSocket(ticketId);

  const userId = user?._id || user?.id;
  const isStaff = user && user.role !== 'customer';
  const isTicketOwner = ticket && (ticket.userId === userId || ticket.user === userId);

  // Determine the chat partner from ticket data
  const chatPartner = ticket
    ? isStaff
      ? ticket.creator || { username: t('chat.customer') }
      : ticket.assignee || null
    : null;

  const chatPartnerName = chatPartner
    ? chatPartner.firstName || chatPartner.username || t('chat.staff')
    : isStaff ? t('chat.customer') : t('chat.waitingForStaff');

  // Set up header with partner info and 3-dot menu for staff
  useEffect(() => {
    const partnerAvatar = chatPartner?.profilePicture;
    const avatarUri = partnerAvatar
      ? partnerAvatar.startsWith('/uploads') ? `${getServerUrl()}${partnerAvatar}` : partnerAvatar
      : null;

    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => chatPartner && setProfileModal(chatPartner)}
          activeOpacity={chatPartner ? 0.7 : 1}
          disabled={!chatPartner}
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }}
            />
          ) : (
            <View style={{
              width: 32, height: 32, borderRadius: 16, marginRight: 8,
              backgroundColor: theme.colors.primary + '20',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <MaterialCommunityIcons
                name={!isStaff ? 'shield-account' : 'account'}
                size={18}
                color={theme.colors.primary}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.styles.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
              {chatPartnerName}
            </Text>
            {ticket && (
              <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                {ticket.ticketNumber}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ),
      headerRight: () => (
        isStaff && ticket && ticket.status !== 'closed' ? (
          <TouchableOpacity
            onPress={() => setShowMenu((prev) => !prev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 4 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [isStaff, ticket, chatPartner, chatPartnerName, navigation, theme, t]);

  // Load ticket data and messages on mount
  useEffect(() => {
    loadTicketAndMessages();
  }, [ticketId]);

  // Socket: listen for new messages
  useEffect(() => {
    const cleanup = onMessage((newMessage) => {
      const senderId = newMessage.sender?.id || newMessage.user?._id || newMessage.user?.id || newMessage.userId;
      if (senderId !== userId) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }
    });
    return cleanup;
  }, [onMessage, userId]);

  // Socket: listen for ticket closed
  useEffect(() => {
    if (!socket) return;
    const handleTicketClosed = (data) => {
      if (data.ticketId === ticketId) {
        setIsClosed(true);
        if (isTicketOwner) {
          setShowRating(true);
        } else {
          showToast({ type: 'info', message: t('chat.ticketClosed') });
        }
      }
    };
    socket.on('ticketClosed', handleTicketClosed);
    return () => socket.off('ticketClosed', handleTicketClosed);
  }, [socket, ticketId, isTicketOwner, t]);

  // Socket: listen for ticket forwarded
  useEffect(() => {
    if (!socket) return;
    const handleTicketForwarded = (data) => {
      if (data.ticketId === ticketId) {
        showToast({ type: 'info', message: t('chat.ticketForwarded') });
      }
    };
    socket.on('ticketForwarded', handleTicketForwarded);
    return () => socket.off('ticketForwarded', handleTicketForwarded);
  }, [socket, ticketId, t]);

  // Socket: listen for typing
  useEffect(() => {
    const cleanup = onTyping((data) => {
      if (data.userId !== userId) {
        setIsOtherTyping(true);
        setTypingUser(data.username || t('chat.someone'));
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
          setTypingUser('');
        }, 3000);
      }
    });
    return cleanup;
  }, [onTyping, userId, t]);

  // Socket: listen for stop typing
  useEffect(() => {
    const cleanup = onStopTyping(() => {
      setIsOtherTyping(false);
      setTypingUser('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    });
    return cleanup;
  }, [onStopTyping]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitStopTyping();
    };
  }, [emitStopTyping]);

  const loadTicketAndMessages = async () => {
    setLoading(true);
    try {
      const [ticketResult, messagesResult] = await Promise.all([
        serviceApi.getTicket(ticketId),
        serviceApi.getChatMessages(ticketId),
      ]);
      const ticketData = ticketResult.data?.data?.ticket || ticketResult.data?.data;
      const messageData = messagesResult.data?.data?.messages || messagesResult.data?.data?.items || messagesResult.data?.data || [];
      setTicket(ticketData);
      setMessages(messageData);
      if (ticketData?.status === 'closed') {
        setIsClosed(true);
      }
    } catch (err) {
      showToast({ type: 'error', message: t('chat.loadMessagesError') });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [messages.length]);

  const handleSend = async (text, images = []) => {
    if ((!text.trim() && images.length === 0) || sending || isClosed) return;
    emitStopTyping();

    const tempAttachments = images.map((img) => ({ url: img.uri }));
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      message: text.trim(),
      attachments: tempAttachments,
      user: user,
      userId: userId,
      createdAt: new Date().toISOString(),
      isTemp: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    setSending(true);
    try {
      const formData = new FormData();
      if (text.trim()) formData.append('message', text.trim());

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const name = img.fileName || `image_${i}.jpg`;
        if (Platform.OS === 'web') {
          // Use pre-fetched blob if available, otherwise fetch from URI
          let blob = img._webBlob;
          if (!blob) {
            const response = await fetch(img.uri);
            blob = await response.blob();
          }
          const file = new File([blob], name, {
            type: blob.type || img.mimeType || 'image/jpeg',
          });
          formData.append('attachments', file);
        } else {
          formData.append('attachments', {
            uri: img.uri,
            type: img.mimeType || 'image/jpeg',
            name,
          });
        }
      }

      const result = await serviceApi.sendChatMessage(ticketId, formData);
      const savedMessage = result.data?.data?.message || result.data?.data || result.data;

      if (savedMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempMessage._id ? { ...savedMessage, user: user } : msg
          )
        );
      }
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      showToast({ type: 'error', message: t('chat.sendMessageError') });
    } finally {
      setSending(false);
    }
  };

  const handleTyping = useCallback(() => {
    const username = user?.username || user?.name;
    emitTyping(userId, username);
  }, [user, userId, emitTyping]);

  const handleCloseTicket = () => {
    setShowMenu(false);
    Alert.alert(
      t('chat.closeTicketTitle'),
      t('chat.closeTicketConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.closeTicket'),
          style: 'destructive',
          onPress: async () => {
            try {
              await serviceApi.closeTicket(ticketId);
              setIsClosed(true);
              showToast({ type: 'success', message: t('chat.ticketClosedSuccess') });
            } catch (err) {
              const msg = err.response?.data?.message || t('chat.closeTicketError');
              showToast({ type: 'error', message: msg });
            }
          },
        },
      ]
    );
  };

  const handleForward = () => {
    setShowMenu(false);
    navigation.navigate('ForwardTicket', {
      ticketId,
      category: ticket?.category || 'service',
    });
  };

  const handleRatingSubmit = async (ratingValue, commentText) => {
    setRatingLoading(true);
    try {
      await serviceApi.rateTicket(ticketId, ratingValue, commentText);
      showToast({ type: 'success', message: t('rating.thankYou') });
      setShowRating(false);
      navigation.goBack();
    } catch (err) {
      showToast({ type: 'error', message: t('rating.submitError') });
    } finally {
      setRatingLoading(false);
    }
  };

  const handleRatingSkip = () => {
    setShowRating(false);
    navigation.goBack();
  };

  const handlePressUser = useCallback((senderData) => {
    setProfileModal(senderData);
  }, []);

  const renderMessage = useCallback(
    ({ item }) => {
      const senderId = item.sender?.id || item.user?._id || item.user?.id || item.userId;
      const isOwn = senderId === userId;

      return <ChatBubble message={item} isOwn={isOwn} onPressUser={handlePressUser} />;
    },
    [userId, handlePressUser]
  );

  const renderTypingIndicator = () => {
    if (!isOtherTyping) return null;
    return (
      <View style={s.typingContainer}>
        <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
          {typingUser
            ? t('chat.userIsTyping', { name: typingUser })
            : t('chat.someoneIsTyping')}
        </Text>
      </View>
    );
  };

  const renderEmptyMessages = () => {
    if (loading) return null;
    return (
      <View style={s.emptyContainer}>
        <EmptyState
          icon="chat-outline"
          title={t('chat.noMessages')}
          message={t('chat.startConversation')}
        />
      </View>
    );
  };

  const renderProfileModal = () => {
    if (!profileModal) return null;
    const p = profileModal;
    const isStaffProfile = p.role && p.role !== 'customer';
    const avatar = p.profilePicture
      ? (p.profilePicture.startsWith('/uploads') ? `${getServerUrl()}${p.profilePicture}` : p.profilePicture)
      : null;
    const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.username || '';

    const roleLabels = {
      admin: 'Administrator',
      super_admin: 'Super Admin',
      bike_manager: 'Fahrrad-Manager',
      cleaning_manager: 'Reinigung-Manager',
      motor_manager: 'Motor-Manager',
      service_manager: 'Service-Manager',
      customer: 'Kunde',
    };

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setProfileModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setProfileModal(null)}>
          <View style={s.modalContent}>
            {/* Avatar */}
            {avatar ? (
              <Image source={{ uri: avatar }} style={s.modalAvatar} />
            ) : (
              <View style={[s.modalAvatar, { backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialCommunityIcons
                  name={isStaffProfile ? 'shield-account' : 'account'}
                  size={40}
                  color={theme.colors.primary}
                />
              </View>
            )}

            {/* Name */}
            <Text style={[theme.typography.styles.h3, { color: theme.colors.text, marginTop: theme.spacing.md, textAlign: 'center' }]}>
              {fullName}
            </Text>

            {/* Role badge */}
            {p.role && (
              <View style={[s.roleBadge, { backgroundColor: isStaffProfile ? theme.colors.primary + '15' : theme.colors.surface }]}>
                <MaterialCommunityIcons
                  name={isStaffProfile ? 'shield-check' : 'account'}
                  size={14}
                  color={isStaffProfile ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[theme.typography.styles.caption, {
                  color: isStaffProfile ? theme.colors.primary : theme.colors.textSecondary,
                  marginLeft: 4,
                }]}>
                  {roleLabels[p.role] || p.role}
                </Text>
              </View>
            )}

            {/* Username */}
            {p.username && (
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }]}>
                @{p.username}
              </Text>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={[s.modalCloseBtn, { backgroundColor: theme.colors.surface }]}
              onPress={() => setProfileModal(null)}
            >
              <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const s = styles(theme);

  if (loading) {
    return (
      <View style={s.container}>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: theme.spacing.md }}>
          <View style={{ alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
            <SkeletonLoader width={200} height={40} borderRadius={theme.borderRadius.lg} />
          </View>
          <View style={{ alignItems: 'flex-end', marginBottom: theme.spacing.md }}>
            <SkeletonLoader width={180} height={40} borderRadius={theme.borderRadius.lg} />
          </View>
          <View style={{ alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
            <SkeletonLoader width={240} height={56} borderRadius={theme.borderRadius.lg} />
          </View>
          <View style={{ alignItems: 'flex-end', marginBottom: theme.spacing.md }}>
            <SkeletonLoader width={160} height={40} borderRadius={theme.borderRadius.lg} />
          </View>
        </View>
        <ChatInput onSend={() => {}} disabled />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => String(item._id || item.id)}
        contentContainerStyle={
          messages.length === 0
            ? { flex: 1 }
            : { paddingVertical: theme.spacing.sm }
        }
        ListEmptyComponent={renderEmptyMessages}
        ListFooterComponent={renderTypingIndicator}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onLayout={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {/* Closed Banner */}
      {isClosed && (
        <View style={s.closedBanner}>
          <MaterialCommunityIcons name="lock" size={16} color={theme.colors.textSecondary} />
          <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.xs }]}>
            {t('chat.chatClosed')}
          </Text>
        </View>
      )}

      {/* Chat Input (disabled when closed) */}
      {!isClosed && (
        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={sending}
        />
      )}

      {/* Staff Menu Dropdown */}
      {showMenu && (
        <TouchableOpacity
          style={s.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={s.menuDropdown}>
            <TouchableOpacity style={s.menuItem} onPress={handleForward} activeOpacity={0.7}>
              <MaterialCommunityIcons name="share" size={20} color={theme.colors.text} />
              <Text style={s.menuItemText}>{t('chat.forward')}</Text>
            </TouchableOpacity>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider }} />
            <TouchableOpacity style={s.menuItem} onPress={handleCloseTicket} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color={theme.colors.error} />
              <Text style={[s.menuItemText, { color: theme.colors.error }]}>{t('chat.closeTicket')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Profile Modal */}
      {renderProfileModal()}

      {/* Rating Modal */}
      <RatingModal
        visible={showRating}
        onSubmit={handleRatingSubmit}
        onSkip={handleRatingSkip}
        loading={ratingLoading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    typingContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    menuOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
    },
    menuDropdown: {
      position: 'absolute',
      top: 8,
      right: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      minWidth: 180,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
        web: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
      }),
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    menuItemText: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      alignItems: 'center',
      width: '100%',
      maxWidth: 320,
    },
    modalAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: theme.spacing.sm,
    },
    modalCloseBtn: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.md,
    },
  });
