import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Pressable, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { getServerUrl } from '../../api/client';
import { formatRelativeTime, truncateText } from '../../utils/formatters';
import { getInitials } from '../../utils/helpers';

export default function PostCard({ post, onLike, onComment, onShare, onPress, onUserPress, onDelete, onEdit, isAdmin, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [showFullContent, setShowFullContent] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageAspect, setImageAspect] = useState(4 / 3);
  const { width: screenWidth } = useWindowDimensions();

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.nativeEvent.source || {};
    if (width && height) {
      setImageAspect(width / height);
    }
  }, []);

  const author = post.author || post.user;
  const { content, type, mediaUrl, likesCount, commentsCount, isLiked, createdAt } = post;

  const displayContent = showFullContent ? content : truncateText(content, 200);
  const isContentTruncated = content && content.length > 200;

  const hasMenuItems = isAdmin && (onDelete || onEdit);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
          ...theme.shadows.md,
        },
        style,
      ]}
    >
      {/* Header */}
      <View style={[s.header, { padding: theme.spacing.md, paddingBottom: theme.spacing.sm }]}>
        <TouchableOpacity
          onPress={() => onUserPress && onUserPress(author)}
          style={s.userRow}
          activeOpacity={0.7}
        >
          {author?.avatar || author?.profilePicture ? (
            <Image
              source={{ uri: (() => { const u = author.avatar || author.profilePicture; return u.startsWith('http') ? u : `${getServerUrl()}${u}`; })() }}
              style={[s.avatar, { borderRadius: 20 }]}
            />
          ) : (
            <View
              style={[
                s.avatar,
                {
                  borderRadius: 20,
                  backgroundColor: theme.colors.primary + '35',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 15 }}>
                {getInitials(author?.username)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            <Text
              style={[
                theme.typography.styles.body,
                { fontWeight: theme.typography.weights.bold, color: theme.colors.text, fontSize: 14 },
              ]}
            >
              {author?.firstName && author?.lastName
                ? `${author.firstName} ${author.lastName}`
                : author?.username}
            </Text>
            <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary, fontSize: 12 }]}>
              {formatRelativeTime(createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        {hasMenuItems && (
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setShowMenu(true)}
            style={[s.menuButton, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {content ? (
        <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
          <Text style={[theme.typography.styles.body, { color: theme.colors.text, lineHeight: 22 }]}>
            {displayContent}
          </Text>
          {isContentTruncated && !showFullContent && (
            <TouchableOpacity onPress={() => setShowFullContent(true)} activeOpacity={0.7}>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: theme.typography.weights.semiBold,
                  marginTop: 4,
                  fontSize: 13,
                }}
              >
                {t('feed.readMore', 'more')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Media */}
      {type === 'image' && mediaUrl ? (
        <View style={{ backgroundColor: '#F5F5F5', alignItems: 'center' }}>
          <Image
            source={{ uri: mediaUrl.startsWith('http') ? mediaUrl : `${getServerUrl()}${mediaUrl}` }}
            style={{ width: '100%', aspectRatio: imageAspect }}
            resizeMode="contain"
            onLoad={onImageLoad}
          />
        </View>
      ) : null}

      {/* Actions Row */}
      <View
        style={[
          s.actionsRow,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 10,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.divider,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => onLike && onLike(post)}
          style={s.actionButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#E53935' : theme.colors.textTertiary}
          />
          {likesCount > 0 && (
            <Text style={[s.actionCount, { color: theme.colors.textSecondary }]}>
              {likesCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onComment && onComment(post)}
          style={[s.actionButton, { marginLeft: theme.spacing.xl }]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="comment-outline" size={20} color={theme.colors.textTertiary} />
          {commentsCount > 0 && (
            <Text style={[s.actionCount, { color: theme.colors.textSecondary }]}>
              {commentsCount}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={() => onShare && onShare(post)}
          style={s.actionButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="share-outline" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Context Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setShowMenu(false)}>
          <View
            style={[
              s.menuContainer,
              {
                backgroundColor: theme.colors.card,
                borderRadius: theme.borderRadius.lg,
                ...theme.shadows.lg,
              },
            ]}
          >
            {isAdmin && onEdit && (
              <TouchableOpacity
                style={[s.menuItem, { padding: theme.spacing.md, paddingHorizontal: theme.spacing.lg }]}
                activeOpacity={0.7}
                onPress={() => {
                  setShowMenu(false);
                  onEdit(post);
                }}
              >
                <View style={[s.menuIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={[theme.typography.styles.body, { color: theme.colors.text, marginLeft: theme.spacing.md, fontWeight: '500' }]}>
                  {t('feed.editPost')}
                </Text>
              </TouchableOpacity>
            )}
            {isAdmin && onEdit && isAdmin && onDelete && (
              <View style={[s.menuDivider, { backgroundColor: theme.colors.divider }]} />
            )}
            {isAdmin && onDelete && (
              <TouchableOpacity
                style={[s.menuItem, { padding: theme.spacing.md, paddingHorizontal: theme.spacing.lg }]}
                activeOpacity={0.7}
                onPress={() => {
                  setShowMenu(false);
                  onDelete(post);
                }}
              >
                <View style={[s.menuIcon, { backgroundColor: theme.colors.error + '15' }]}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color={theme.colors.error} />
                </View>
                <Text style={[theme.typography.styles.body, { color: theme.colors.error, marginLeft: theme.spacing.md, fontWeight: '500' }]}>
                  {t('feed.deletePost')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    fontSize: 13,
    marginLeft: 5,
    fontWeight: '500',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    minWidth: 240,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
});
