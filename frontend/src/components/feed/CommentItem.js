import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getServerUrl } from '../../api/client';
import { formatRelativeTime } from '../../utils/formatters';
import { getInitials } from '../../utils/helpers';

export default function CommentItem({ comment, style, onMenu }) {
  const { theme } = useTheme();

  const user = comment.author || comment.user;
  const { content, createdAt } = comment;
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!onMenu}
      onLongPress={onMenu ? () => onMenu(comment) : undefined}
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

      {/* Menu: report / hide user / delete (App Store guideline 1.2) */}
      {onMenu ? (
        <TouchableOpacity
          onPress={() => onMenu(comment)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Kommentar-Optionen"
          style={{ paddingLeft: theme.spacing.sm, paddingTop: 2 }}
        >
          <MaterialCommunityIcons name="dots-vertical" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}
