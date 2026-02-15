import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { serviceApi } from '../../api/service';
import Badge from '../ui/Badge';
import { truncateText } from '../../utils/formatters';

const BUTTON_SIZE = 52;
const POLL_INTERVAL = 30000;
const BUBBLE_AUTO_HIDE_MS = 6000;

export default function FloatingChatButton({ onPress, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [activeCount, setActiveCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const [showBubble, setShowBubble] = useState(false);
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const prevCountRef = useRef(0);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    const fetchActiveChats = async () => {
      try {
        const result = await serviceApi.getActiveChats();
        const chats = result.data?.data?.chats || result.data?.data || [];
        const chatArray = Array.isArray(chats) ? chats : [];
        if (!mounted) return;

        setActiveCount(chatArray.length);

        // Find latest message across all chats
        if (chatArray.length > 0) {
          const latestChat = chatArray.reduce((latest, chat) => {
            const chatTime = chat.lastMessage?.createdAt || chat.updatedAt;
            const latestTime = latest.lastMessage?.createdAt || latest.updatedAt;
            return new Date(chatTime) > new Date(latestTime) ? chat : latest;
          }, chatArray[0]);

          const msg = latestChat.lastMessage;
          if (msg?.message) {
            const newMsg = truncateText(msg.message, 50);
            // Show bubble if there's a new message
            if (newMsg !== lastMessage && chatArray.length > 0) {
              setLastMessage(newMsg);
              if (prevCountRef.current > 0) {
                // Only animate if not first load
                triggerBubble();
              }
            }
          }
        }

        prevCountRef.current = chatArray.length;
      } catch {
        // Silent fail
      }
    };

    fetchActiveChats();
    const interval = setInterval(fetchActiveChats, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isAuthenticated]);

  const triggerBubble = () => {
    setShowBubble(true);
    Animated.timing(bubbleOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowBubble(false));
    }, BUBBLE_AUTO_HIDE_MS);
  };

  const handleDismissBubble = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    Animated.timing(bubbleOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowBubble(false));
  };

  if (!isAuthenticated || activeCount === 0) {
    return null;
  }

  return (
    <View style={[styles.wrapper, style]}>
      {/* Speech Bubble */}
      {showBubble && lastMessage && (
        <Animated.View style={[styles.bubble, { backgroundColor: theme.colors.card, opacity: bubbleOpacity, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 4 } }) }]}>
          <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.bubbleContent}>
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textSecondary, fontWeight: theme.typography.weights.semiBold, marginBottom: 2 }]}>
              {t('floatingChat.newMessage', 'Neue Nachricht')}
            </Text>
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.text }]} numberOfLines={2}>
              {lastMessage}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismissBubble} style={styles.bubbleDismiss} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <MaterialCommunityIcons name="close" size={14} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          {/* Arrow */}
          <View style={[styles.bubbleArrow, { borderTopColor: theme.colors.card }]} />
        </Animated.View>
      )}

      {/* FAB Button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: BUTTON_SIZE / 2,
            ...Platform.select({
              ios: {
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              },
              android: { elevation: 8 },
            }),
          },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="chat" size={24} color="#FFFFFF" />
        {activeCount > 0 && (
          <Badge
            count={activeCount}
            color={theme.colors.error}
            size="small"
            style={{ position: 'absolute', top: -4, right: -4 }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 88,
    right: 20,
    alignItems: 'flex-end',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: 240,
    minWidth: 160,
  },
  bubbleContent: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 4,
  },
  bubbleDismiss: {
    padding: 8,
    paddingTop: 10,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -6,
    right: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
