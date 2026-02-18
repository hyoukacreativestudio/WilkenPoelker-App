import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { usePagination } from '../../hooks/usePagination';
import { useApi } from '../../hooks/useApi';
import { feedApi } from '../../api/feed';
import PostCard from '../../components/feed/PostCard';
import CreatePostModal from '../../components/feed/CreatePostModal';
import EditPostModal from '../../components/feed/EditPostModal';
import OpeningHoursBanner from '../../components/feed/OpeningHoursBanner';
import EmptyState from '../../components/ui/EmptyState';
import OfflineBanner from '../../components/ui/OfflineBanner';
import FloatingActionButton from '../../components/shared/FloatingActionButton';
import FloatingChatButton from '../../components/shared/FloatingChatButton';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import CategoryBar from '../../components/feed/CategoryBar';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';

// Cross-platform confirm dialog
function confirmAction(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function FeedScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme, isDark, setThemeMode, mode } = useTheme();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { showToast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const canPostRoles = ['super_admin', 'admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager'];
  const userCanPost = user && canPostRoles.includes(user.role);
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  const {
    items: posts,
    loading,
    refreshing,
    hasMore,
    fetchItems,
    loadMore,
    refresh,
    setItems,
  } = usePagination(feedApi.getPosts);

  const createPostApi = useApi(feedApi.createPost);
  const likePostApi = useApi(feedApi.likePost);
  const deletePostApi = useApi(feedApi.deletePost);
  const updatePostApi = useApi(feedApi.updatePost);

  useEffect(() => {
    loadInitialPosts();
  }, []);

  const loadInitialPosts = async () => {
    await fetchItems();
    setInitialLoad(false);
  };

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const handleCreatePost = async (postData) => {
    try {
      const formData = new FormData();
      formData.append('content', postData.content || '');
      if (postData.image) {
        if (Platform.OS === 'web') {
          // On web, use pre-fetched blob if available, otherwise fetch from URI
          let blob = postData.image._webBlob;
          if (!blob) {
            const response = await fetch(postData.image.uri);
            blob = await response.blob();
          }
          const fileName = postData.image.name || 'photo.jpg';
          const file = new File([blob], fileName, {
            type: blob.type || postData.image.type || 'image/jpeg',
          });
          formData.append('media', file);
        } else {
          formData.append('media', {
            uri: postData.image.uri,
            type: postData.image.type || postData.image.mimeType || 'image/jpeg',
            name: postData.image.name || postData.image.fileName || 'photo.jpg',
          });
        }
        formData.append('type', 'image');
      }
      const result = await createPostApi.execute(formData);
      const newPost = result?.data?.post || result?.data || result;
      if (newPost) {
        setItems((prev) => [newPost, ...prev]);
      }
      setShowCreateModal(false);
      showToast({ type: 'success', message: t('feed.postCreatedSuccess') });
    } catch (err) {
      console.error('Feed upload error:', err);
      showToast({ type: 'error', message: t('feed.createPostError') });
    }
  };

  const handleLike = useCallback(
    async (post) => {
      try {
        await likePostApi.execute(post._id || post.id);
        setItems((prev) =>
          prev.map((p) => {
            if ((p._id || p.id) === (post._id || post.id)) {
              return {
                ...p,
                isLiked: !p.isLiked,
                likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
              };
            }
            return p;
          })
        );
      } catch (err) {
        // Silently fail for likes
      }
    },
    [likePostApi, setItems]
  );

  const handleComment = useCallback(
    (post) => {
      navigation.navigate('PostDetail', { postId: post._id || post.id });
    },
    [navigation]
  );

  const handleShare = useCallback(
    async (post) => {
      try {
        await Share.share({
          message: post.content || t('feed.checkOutPost'),
        });
      } catch (err) {
        // Share cancelled or failed
      }
    },
    [t]
  );

  const handleDelete = useCallback(
    (post) => {
      const postId = post._id || post.id;
      confirmAction(
        t('feed.deletePost'),
        t('feed.deletePostConfirm'),
        async () => {
          try {
            await deletePostApi.execute(postId);
            setItems((prev) => prev.filter((p) => (p._id || p.id) !== postId));
            showToast({ type: 'success', message: t('feed.postDeletedSuccess') });
          } catch (err) {
            showToast({ type: 'error', message: t('feed.deletePostError', 'Could not delete post') });
          }
        }
      );
    },
    [deletePostApi, setItems, t]
  );

  const handleEdit = useCallback(
    (post) => {
      setEditingPost(post);
      setShowEditModal(true);
    },
    []
  );

  const handleEditSubmit = async (postId, data) => {
    try {
      await updatePostApi.execute(postId, data);
      setItems((prev) =>
        prev.map((p) => {
          if ((p._id || p.id) === postId) {
            return { ...p, ...data };
          }
          return p;
        })
      );
      setShowEditModal(false);
      setEditingPost(null);
      showToast({ type: 'success', message: t('feed.postEditedSuccess') });
    } catch (err) {
      showToast({ type: 'error', message: t('feed.editPostError', 'Could not edit post') });
    }
  };

  const handlePostPress = useCallback(
    (post) => {
      navigation.navigate('PostDetail', { postId: post._id || post.id });
    },
    [navigation]
  );

  const handleUserPress = useCallback(
    (postUser) => {
      // Could navigate to user profile
    },
    []
  );

  const toggleDarkMode = useCallback(() => {
    if (isDark) {
      setThemeMode('light');
    } else {
      setThemeMode('dark');
    }
  }, [isDark, setThemeMode]);

  const renderSkeletons = () => (
    <View style={{ padding: theme.spacing.xs }}>
      {[1, 2, 3].map((key) => (
        <View
          key={key}
          style={{
            marginBottom: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <SkeletonLoader width={40} height={40} borderRadius={theme.borderRadius.round} />
            <View style={{ marginLeft: theme.spacing.sm }}>
              <SkeletonLoader
                width={120}
                height={14}
                borderRadius={theme.borderRadius.sm}
                style={{ marginBottom: theme.spacing.xs }}
              />
              <SkeletonLoader width={80} height={10} borderRadius={theme.borderRadius.sm} />
            </View>
          </View>
          <SkeletonLoader
            width="100%"
            height={60}
            borderRadius={theme.borderRadius.sm}
            style={{ marginBottom: theme.spacing.sm }}
          />
          <SkeletonLoader width="100%" height={200} borderRadius={theme.borderRadius.md} />
        </View>
      ))}
    </View>
  );

  const renderPost = useCallback(
    ({ item }) => (
      <PostCard
        post={item}
        onLike={() => handleLike(item)}
        onComment={() => handleComment(item)}
        onShare={() => handleShare(item)}
        onPress={() => handlePostPress(item)}
        onUserPress={handleUserPress}
        onDelete={isAdmin ? () => handleDelete(item) : undefined}
        onEdit={isAdmin ? () => handleEdit(item) : undefined}
        isAdmin={isAdmin}
        style={{ marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md, maxWidth: 600, alignSelf: 'center', width: '100%' }}
      />
    ),
    [handleLike, handleComment, handleShare, handlePostPress, handleUserPress, handleDelete, handleEdit, isAdmin, theme]
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={{ paddingVertical: theme.spacing.lg, alignItems: 'center' }}>
        <SkeletonLoader width={200} height={16} borderRadius={theme.borderRadius.sm} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading || initialLoad) return null;
    return (
      <EmptyState
        icon="newspaper-variant-outline"
        title={t('feed.emptyTitle')}
        message={t('feed.emptyMessage')}
        actionLabel={userCanPost ? t('feed.createFirstPost') : undefined}
        onAction={userCanPost ? () => setShowCreateModal(true) : undefined}
      />
    );
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            navigation.navigate('FeedHome');
          }}
          style={s.logoContainer}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={s.headerLogo}
            resizeMode="contain"
          />
          <Image
            source={require('../../../assets/logo2.png')}
            style={s.headerSlogan}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={toggleDarkMode}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.headerButton}
          >
            <MaterialCommunityIcons
              name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[s.headerButton, { marginLeft: 8 }]}
          >
            <Image
              source={require('../../../assets/tab_bell.png')}
              style={{ width: 20, height: 20, tintColor: theme.colors.textSecondary }}
              resizeMode="contain"
            />
            {unreadCount > 0 && (
              <Badge
                count={unreadCount}
                color={theme.colors.error}
                size="small"
                style={{ position: 'absolute', top: -4, right: -4 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Bar */}
      <CategoryBar />

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Content */}
      {initialLoad ? (
        renderSkeletons()
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => String(item._id || item.id)}
          ListHeaderComponent={<OpeningHoursBanner />}
          contentContainerStyle={
            posts.length === 0 ? { flex: 1, alignItems: 'center' } : { paddingTop: theme.spacing.sm }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Chat Button - shows when user has active chats */}
      <FloatingChatButton
        onPress={() => navigation.navigate('Service', { screen: 'ActiveChats' })}
      />

      {/* FAB - only for authorized roles */}
      {userCanPost && (
        <FloatingActionButton
          icon="plus"
          onPress={() => setShowCreateModal(true)}
        />
      )}

      {/* Create Post Modal */}
      {userCanPost && (
        <CreatePostModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePost}
        />
      )}

      {/* Edit Post Modal */}
      {isAdmin && (
        <EditPostModal
          visible={showEditModal}
          post={editingPost}
          onClose={() => {
            setShowEditModal(false);
            setEditingPost(null);
          }}
          onSubmit={handleEditSubmit}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      backgroundColor: theme.colors.headerBackground,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerLogo: {
      height: 32,
      width: 140,
    },
    headerSlogan: {
      height: 22,
      width: 100,
      marginLeft: theme.spacing.sm,
      opacity: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
