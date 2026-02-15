import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { feedApi } from '../../api/feed';
import CommentItem from '../../components/feed/CommentItem';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import { formatRelativeTime } from '../../utils/formatters';
import { getInitials } from '../../utils/helpers';
import { getServerUrl } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [imageAspect, setImageAspect] = useState(4 / 3);

  const commentInputRef = useRef(null);

  const likePostApi = useApi(feedApi.likePost);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [postId]);

  const loadPost = async () => {
    setLoadingPost(true);
    try {
      const result = await feedApi.getPost(postId);
      const postData = result.data?.data?.post || result.data?.data || result.data;
      setPost(postData);
    } catch (err) {
      showToast({ type: 'error', message: t('feed.loadPostError') });
    } finally {
      setLoadingPost(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const result = await feedApi.getComments(postId);
      const commentData = result.data?.data?.comments || result.data?.data?.items || result.data?.data || [];
      setComments(Array.isArray(commentData) ? commentData : []);
    } catch (err) {
      // Comments may not load
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      await likePostApi.execute(postId);
      setPost((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
      }));
    } catch (err) {
      // Silently fail
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: post.content || t('feed.checkOutPost'),
      });
    } catch (err) {
      // Share cancelled
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const result = await feedApi.addComment(postId, commentText.trim());
      const newComment = result.data?.data?.comment || result.data?.data || result.data;
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
      }
      setPost((prev) =>
        prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : prev
      );
      setCommentText('');
      showToast({ type: 'success', message: t('feed.commentAddedSuccess') });
    } catch (err) {
      showToast({ type: 'error', message: t('feed.addCommentError') });
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderPostHeader = () => {
    if (loadingPost || !post) {
      return (
        <View style={{ padding: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <SkeletonLoader width={48} height={48} borderRadius={theme.borderRadius.round} />
            <View style={{ marginLeft: theme.spacing.sm }}>
              <SkeletonLoader width={140} height={16} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
              <SkeletonLoader width={90} height={12} borderRadius={theme.borderRadius.sm} />
            </View>
          </View>
          <SkeletonLoader width="100%" height={80} borderRadius={theme.borderRadius.sm} />
        </View>
      );
    }

    const postUser = post.author || post.user;

    return (
      <View>
        {/* Post Author */}
        <View style={s.postHeader}>
          <View style={s.authorRow}>
            {postUser?.avatar || postUser?.profilePicture ? (
              <Image
                source={{ uri: (() => { const u = postUser.avatar || postUser.profilePicture; return u.startsWith('http') ? u : `${getServerUrl()}${u}`; })() }}
                style={[s.avatar, { borderRadius: theme.borderRadius.round }]}
              />
            ) : (
              <View
                style={[
                  s.avatar,
                  {
                    borderRadius: theme.borderRadius.round,
                    backgroundColor: theme.colors.primary + '35',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Text style={[theme.typography.styles.body, { color: theme.colors.primary, fontWeight: '700' }]}>
                  {getInitials(postUser?.firstName && postUser?.lastName ? `${postUser.firstName} ${postUser.lastName}` : postUser?.username)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
              <Text
                style={[
                  theme.typography.styles.body,
                  { fontWeight: theme.typography.weights.bold, color: theme.colors.text },
                ]}
              >
                {postUser?.firstName && postUser?.lastName
                  ? `${postUser.firstName} ${postUser.lastName}`
                  : postUser?.username}
              </Text>
              <Text style={[theme.typography.styles.caption, { color: theme.colors.textTertiary }]}>
                {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Full Post Content */}
        {post.content ? (
          <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
            <Text style={[theme.typography.styles.body, { color: theme.colors.text, lineHeight: 22 }]}>
              {post.content}
            </Text>
          </View>
        ) : null}

        {/* Media */}
        {post.type === 'image' && post.mediaUrl ? (
          <View style={{ backgroundColor: '#F5F5F5' }}>
            <Image
              source={{ uri: post.mediaUrl.startsWith('http') ? post.mediaUrl : `${getServerUrl()}${post.mediaUrl}` }}
              style={{ width: '100%', aspectRatio: imageAspect }}
              resizeMode="contain"
              onLoad={(e) => {
                const { width, height } = e.nativeEvent.source || {};
                if (width && height) setImageAspect(width / height);
              }}
            />
          </View>
        ) : null}

        {/* Action Bar */}
        <View style={s.actionBar}>
          <TouchableOpacity onPress={handleLike} style={s.actionButton} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={post.isLiked ? theme.colors.error : theme.colors.textSecondary}
            />
            {post.likesCount > 0 && (
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.xs }]}>
                {post.likesCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => commentInputRef.current?.focus()}
            style={[s.actionButton, { marginLeft: theme.spacing.lg }]}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="comment-outline" size={24} color={theme.colors.textSecondary} />
            {post.commentsCount > 0 && (
              <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textSecondary, marginLeft: theme.spacing.xs }]}>
                {post.commentsCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={[s.actionButton, { marginLeft: theme.spacing.lg }]}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="share-outline" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Comments Header */}
        <View style={s.commentsHeader}>
          <Text style={[theme.typography.styles.h6, { color: theme.colors.text }]}>
            {t('feed.comments')}
            {comments.length > 0 ? ` (${comments.length})` : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderComment = useCallback(
    ({ item }) => (
      <CommentItem
        comment={item}
        style={{
          paddingHorizontal: theme.spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.divider,
        }}
      />
    ),
    [theme]
  );

  const renderEmptyComments = () => {
    if (loadingComments) {
      return (
        <View style={{ padding: theme.spacing.md }}>
          {[1, 2].map((key) => (
            <View key={key} style={{ flexDirection: 'row', marginBottom: theme.spacing.md }}>
              <SkeletonLoader width={32} height={32} borderRadius={theme.borderRadius.round} />
              <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                <SkeletonLoader width="80%" height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.xs }} />
                <SkeletonLoader width="50%" height={10} borderRadius={theme.borderRadius.sm} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
        <Text style={[theme.typography.styles.body, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
          {t('feed.noCommentsYet')}
        </Text>
        <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.textTertiary, textAlign: 'center', marginTop: theme.spacing.xs }]}>
          {t('feed.beFirstToComment')}
        </Text>
      </View>
    );
  };

  const s = styles(theme);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Custom Header with Back Button */}
      <View style={s.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={s.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[theme.typography.styles.h5, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
          {t('feed.post', 'Beitrag')}
        </Text>
      </View>

      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => String(item._id || item.id)}
        ListHeaderComponent={renderPostHeader}
        ListEmptyComponent={renderEmptyComments}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.md }}
      />

      {/* Comment Input Bar */}
      <View style={s.inputBar}>
        <TextInput
          ref={commentInputRef}
          value={commentText}
          onChangeText={setCommentText}
          placeholder={t('feed.addComment')}
          placeholderTextColor={theme.colors.placeholder}
          multiline
          style={[
            theme.typography.styles.body,
            s.commentInput,
          ]}
        />
        <TouchableOpacity
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submittingComment}
          style={{
            padding: theme.spacing.sm,
            opacity: commentText.trim() && !submittingComment ? 1 : 0.4,
          }}
          activeOpacity={0.7}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <MaterialCommunityIcons
              name="send"
              size={24}
              color={commentText.trim() ? theme.colors.primary : theme.colors.textSecondary}
            />
          )}
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
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    postHeader: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 48,
      height: 48,
    },
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    commentsHeader: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: theme.colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    commentInput: {
      flex: 1,
      color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      maxHeight: 80,
      marginRight: theme.spacing.sm,
    },
  });
