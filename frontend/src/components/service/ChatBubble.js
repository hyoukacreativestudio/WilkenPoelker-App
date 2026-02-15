import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatTime } from '../../utils/formatters';
import { getServerUrl } from '../../api/client';

export default function ChatBubble({ message, isOwn, onPressUser, style }) {
  const { theme } = useTheme();

  const { message: text, attachments, createdAt, isSystemMessage } = message;

  // Sender data: API returns "sender", socket/optimistic uses "user"
  const sender = message.sender || message.user;
  const senderName = sender?.firstName || sender?.username || '';
  const senderRole = sender?.role;
  const senderAvatar = sender?.profilePicture;
  const isStaffSender = senderRole && senderRole !== 'customer';

  // System Messages
  if (isSystemMessage) {
    return (
      <View style={[styles.systemContainer, { paddingVertical: theme.spacing.sm }, style]}>
        <View style={[styles.systemBubble, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md }]}>
          <MaterialCommunityIcons name="information-outline" size={14} color={theme.colors.textTertiary} style={{ marginRight: 6 }} />
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textTertiary, fontStyle: 'italic', flex: 1 },
            ]}
          >
            {text}
          </Text>
        </View>
      </View>
    );
  }

  const bubbleRadius = theme.borderRadius.lg;
  const avatarSize = 30;

  const resolveAvatarUri = (url) => {
    if (!url) return null;
    return url.startsWith('/uploads') ? `${getServerUrl()}${url}` : url;
  };

  const avatarUri = resolveAvatarUri(senderAvatar);

  const handlePressUser = () => {
    if (onPressUser && sender) {
      onPressUser(sender);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '85%' }}>
        {/* Avatar for other users */}
        {!isOwn && (
          <TouchableOpacity onPress={handlePressUser} activeOpacity={0.7} style={{ marginRight: 8, marginBottom: 2 }}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                }}
              />
            ) : (
              <View
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  backgroundColor: isStaffSender ? theme.colors.primary + '20' : theme.colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name={isStaffSender ? 'shield-account' : 'account'}
                  size={16}
                  color={isStaffSender ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={{ flex: 1, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
          {/* Sender name for other users */}
          {!isOwn && senderName ? (
            <TouchableOpacity onPress={handlePressUser} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text
                  style={[
                    theme.typography.styles.caption,
                    {
                      color: isStaffSender ? theme.colors.primary : theme.colors.textSecondary,
                      fontWeight: theme.typography.weights.semiBold,
                    },
                  ]}
                >
                  {senderName}
                </Text>
                {isStaffSender && (
                  <View style={{
                    backgroundColor: theme.colors.primary + '15',
                    borderRadius: 4,
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    marginLeft: 4,
                  }}>
                    <Text style={[theme.typography.styles.small, { color: theme.colors.primary, fontSize: 9 }]}>
                      Mitarbeiter
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Bubble */}
          <View
            style={{
              maxWidth: '100%',
              backgroundColor: isOwn ? theme.colors.primary : theme.colors.surface,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderTopLeftRadius: bubbleRadius,
              borderTopRightRadius: bubbleRadius,
              borderBottomLeftRadius: isOwn ? bubbleRadius : theme.borderRadius.sm,
              borderBottomRightRadius: isOwn ? theme.borderRadius.sm : bubbleRadius,
            }}
          >
            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: text ? theme.spacing.xs : 0 }}>
                {attachments.map((attachment, index) => {
                  const rawUrl = attachment.url || attachment;
                  const imageUri = typeof rawUrl === 'string' && rawUrl.startsWith('/uploads')
                    ? `${getServerUrl()}${rawUrl}`
                    : rawUrl;
                  return (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      style={{
                        width: 180,
                        height: 135,
                        borderRadius: theme.borderRadius.sm,
                        marginRight: theme.spacing.xs,
                        marginBottom: theme.spacing.xs,
                      }}
                      resizeMode="cover"
                    />
                  );
                })}
              </View>
            )}

            {/* Message Text */}
            {text ? (
              <Text
                style={[
                  theme.typography.styles.body,
                  { color: isOwn ? '#FFFFFF' : theme.colors.text },
                ]}
              >
                {text}
              </Text>
            ) : null}
          </View>

          {/* Time */}
          <Text
            style={[
              theme.typography.styles.caption,
              {
                color: theme.colors.textTertiary,
                marginTop: 2,
              },
            ]}
          >
            {formatTime(createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  systemContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '90%',
  },
});
