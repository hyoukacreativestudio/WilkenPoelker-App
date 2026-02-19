import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { serviceApi } from '../../api/service';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import Badge from '../../components/ui/Badge';
import { formatRelativeTime, truncateText } from '../../utils/formatters';

export default function ActiveChatsScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh chats when screen comes into focus (e.g., after closing a ticket)
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const loadChats = async () => {
    setLoading(true);
    try {
      const result = await serviceApi.getActiveChats();
      const chatData = result.data?.data?.chats || result.data?.data || [];
      setChats(Array.isArray(chatData) ? chatData : []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await serviceApi.getActiveChats();
      const chatData = result.data?.data?.chats || result.data?.data || [];
      setChats(Array.isArray(chatData) ? chatData : []);
    } catch {
      // Silent fail
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleChatPress = useCallback(
    (ticket) => {
      navigation.navigate('Chat', { ticketId: ticket._id || ticket.id });
    },
    [navigation]
  );

  const renderChatItem = ({ item }) => {
    const userId = user?._id || user?.id;
    const isStaff = userId === (item.assignedTo?._id || item.assignedTo?.id || item.assignedTo);

    // Determine the other party's name
    let otherName = '';
    if (isStaff) {
      const owner = item.creator || item.user || item.owner;
      otherName = owner?.firstName
        ? `${owner.firstName} ${owner.lastName || ''}`
        : owner?.username || t('chat.customer');
    } else {
      const assigned = item.assignee || item.assignedToUser || item.staff;
      otherName = assigned?.firstName
        ? `${assigned.firstName} ${assigned.lastName || ''}`
        : assigned?.username || t('chat.support');
    }

    const lastMsg = item.lastMessage;
    const lastMessageText = lastMsg?.message
      ? truncateText(lastMsg.message, 60)
      : t('chat.noMessages');
    const lastMessageTime = lastMsg?.createdAt || item.updatedAt;
    const unreadCount = item.unreadCount || 0;

    return (
      <TouchableOpacity
        style={s.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={[s.avatar, { backgroundColor: theme.colors.primaryLight }]}>
          <MaterialCommunityIcons
            name={isStaff ? 'account' : 'face-agent'}
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={s.chatContent}>
          <View style={s.chatTopRow}>
            <Text style={s.chatName} numberOfLines={1}>
              {otherName.trim()}
            </Text>
            <Text style={s.chatTime}>{formatRelativeTime(lastMessageTime)}</Text>
          </View>
          <Text style={s.ticketInfo} numberOfLines={1}>
            #{item.ticketNumber} - {item.title || item.description}
          </Text>
          <View style={s.chatBottomRow}>
            <Text style={[s.lastMessage, unreadCount > 0 && s.lastMessageUnread]} numberOfLines={1}>
              {lastMessageText}
            </Text>
            {unreadCount > 0 && (
              <Badge count={unreadCount} color={theme.colors.primary} size="small" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeletons = () => (
    <View style={{ padding: theme.spacing.md }}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
            <SkeletonLoader width="60%" height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width="80%" height={12} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
            <SkeletonLoader width="40%" height={12} borderRadius={theme.borderRadius.sm} />
          </View>
        </View>
      ))}
    </View>
  );

  const s = styles(theme);

  if (loading && chats.length === 0) {
    return (
      <View style={s.container}>
        {renderSkeletons()}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => String(item._id || item.id)}
        contentContainerStyle={
          chats.length === 0
            ? { flex: 1, justifyContent: 'center' }
            : { paddingBottom: theme.spacing.xxl }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chat-outline"
            title={t('activeChats.empty')}
            message={t('activeChats.emptyMessage')}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginLeft: 72 }} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    chatTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chatName: {
      ...theme.typography.styles.body,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    chatTime: {
      ...theme.typography.styles.small,
      color: theme.colors.textTertiary,
    },
    ticketInfo: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    chatBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    lastMessage: {
      ...theme.typography.styles.bodySmall,
      color: theme.colors.textTertiary,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    lastMessageUnread: {
      color: theme.colors.text,
      fontWeight: theme.typography.weights.semiBold,
    },
  });
