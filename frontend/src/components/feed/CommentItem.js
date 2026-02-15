import React from 'react';
import { View, Text, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { getServerUrl } from '../../api/client';
import { formatRelativeTime } from '../../utils/formatters';
import { getInitials } from '../../utils/helpers';

export default function CommentItem({ comment, style }) {
  const { theme } = useTheme();

  const user = comment.author || comment.user;
  const { content, createdAt } = comment;
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingVertical: theme.spacing.sm,
        },
        style,
      ]}
    >
      {/* Avatar */}
      {user?.avatar || user?.profilePicture ? (
        <Image
          source={{ uri: (() => { const u = user.avatar || user.profilePicture; return u.startsWith('http') ? u : `${getServerUrl()}${u}`; })() }}
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.borderRadius.round,
          }}
        />
      ) : (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.borderRadius.round,
            backgroundColor: theme.isDark ? theme.colors.primary + '55' : theme.colors.primary + '25',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[theme.typography.styles.small, { color: theme.colors.primary, fontWeight: '700' }]}>
            {getInitials(displayName)}
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
        <Text style={[theme.typography.styles.body, { color: theme.colors.text }]}>
          <Text style={{ fontWeight: theme.typography.weights.bold }}>
            {displayName}{' '}
          </Text>
          {content}
        </Text>
        <Text
          style={[
            theme.typography.styles.caption,
            { color: theme.colors.textTertiary, marginTop: theme.spacing.xs },
          ]}
        >
          {formatRelativeTime(createdAt)}
        </Text>
      </View>
    </View>
  );
}
