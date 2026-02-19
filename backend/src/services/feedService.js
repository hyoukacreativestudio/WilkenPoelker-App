const { Op } = require('sequelize');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * List posts with cursor-based pagination.
 * Includes whether the current user has liked each post.
 */
async function listPosts({ cursor, limit = 20, userId }, { Post, User, Like }) {
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 50);
  const where = {};

  if (cursor) {
    where.createdAt = { [Op.lt]: new Date(cursor) };
  }

  const posts = await Post.findAll({
    where,
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profilePicture', 'firstName', 'lastName'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: parsedLimit + 1, // Fetch one extra to determine if there is a next page
  });

  const hasMore = posts.length > parsedLimit;
  const results = hasMore ? posts.slice(0, parsedLimit) : posts;

  // Check which posts the current user has liked
  let likedPostIds = new Set();
  if (userId && results.length > 0) {
    const postIds = results.map((p) => p.id);
    const likes = await Like.findAll({
      where: { userId, postId: postIds },
      attributes: ['postId'],
    });
    likedPostIds = new Set(likes.map((l) => l.postId));
  }

  const postsWithLiked = results.map((post) => {
    const json = post.toJSON();
    json.isLiked = likedPostIds.has(post.id);
    return json;
  });

  const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

  return {
    posts: postsWithLiked,
    nextCursor,
    hasMore,
  };
}

/**
 * Create a new post.
 */
async function createPost({ content, type, userId, file }, { Post, User }) {
  const postData = {
    content,
    type: type || 'text',
    userId,
  };

  if (file) {
    const { uploadFile } = require('./uploadService');
    postData.mediaUrl = await uploadFile(file, 'feed');
    if (['image', 'video'].includes(postData.type)) {
      postData.thumbnailUrl = postData.mediaUrl;
    }
  }

  const post = await Post.create(postData);

  logger.info('Post created', { postId: post.id, userId, type: postData.type });

  // Re-fetch with author so the frontend gets complete data
  if (User) {
    const fullPost = await Post.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'profilePicture', 'firstName', 'lastName'],
        },
      ],
    });
    return fullPost || post;
  }

  return post;
}

/**
 * Get a single post with author and comment count.
 */
async function getPost(postId, userId, { Post, User, Like }) {
  const post = await Post.findByPk(postId, {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profilePicture', 'firstName', 'lastName'],
      },
    ],
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  const json = post.toJSON();

  // Check if current user liked
  if (userId) {
    const like = await Like.findOne({ where: { postId, userId } });
    json.isLiked = !!like;
  } else {
    json.isLiked = false;
  }

  return json;
}

/**
 * Update a post (own post or admin).
 */
async function updatePost(postId, userId, userRole, data, { Post }) {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new NotFoundError('Post');
  }

  const isOwner = post.userId === userId;
  const isAdminRole = userRole === 'admin' || userRole === 'super_admin';

  if (!isOwner && !isAdminRole) {
    throw new AppError('Not authorized to update this post', 403, 'FORBIDDEN');
  }

  const allowedFields = ['content', 'type'];
  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  await post.update(updates);

  logger.info('Post updated', { postId, userId });

  return post;
}

/**
 * Hard delete a post permanently (own post or admin).
 * Also deletes associated likes, comments, and share trackings.
 */
async function deletePost(postId, userId, userRole, { Post, Like, Comment, ShareTracking }) {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new NotFoundError('Post');
  }

  const isOwner = post.userId === userId;
  const isAdminRole = userRole === 'admin' || userRole === 'super_admin';

  if (!isOwner && !isAdminRole) {
    throw new AppError('Not authorized to delete this post', 403, 'FORBIDDEN');
  }

  // Delete associated data first
  if (Like) await Like.destroy({ where: { postId }, force: true });
  if (Comment) await Comment.destroy({ where: { postId }, force: true });
  if (ShareTracking) await ShareTracking.destroy({ where: { entityType: 'post', entityId: postId }, force: true });

  // Hard delete the post (force: true bypasses paranoid soft delete)
  await post.destroy({ force: true });

  logger.info('Post deleted (permanent)', { postId, userId });
}

/**
 * Toggle like on a post. Returns the new like state and updated count.
 */
async function toggleLike(postId, userId, { Post, Like }) {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new NotFoundError('Post');
  }

  const existingLike = await Like.findOne({ where: { postId, userId } });

  let liked;
  if (existingLike) {
    await existingLike.destroy();
    await post.decrement('likesCount');
    await post.reload();
    liked = false;
  } else {
    await Like.create({ postId, userId });
    await post.increment('likesCount');
    await post.reload();
    liked = true;
  }

  logger.debug('Like toggled', { postId, userId, liked });

  return { liked, likesCount: post.likesCount };
}

/**
 * Add a comment to a post.
 */
async function addComment(postId, userId, { content, parentId }, { Post, Comment }) {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new NotFoundError('Post');
  }

  // If replying, verify parent comment exists and belongs to same post
  if (parentId) {
    const parent = await Comment.findOne({ where: { id: parentId, postId } });
    if (!parent) {
      throw new NotFoundError('Parent comment');
    }
  }

  const comment = await Comment.create({
    content,
    postId,
    userId,
    parentId: parentId || null,
  });

  await post.increment('commentsCount');

  logger.info('Comment added', { postId, commentId: comment.id, userId });

  return comment;
}

/**
 * List comments for a post (paginated, with author and replies).
 */
async function listComments(postId, { page = 1, limit = 20 }, { Comment, User }) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const { rows, count } = await Comment.findAndCountAll({
    where: { postId, parentId: null }, // Top-level comments only
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profilePicture', 'firstName', 'lastName'],
      },
      {
        model: Comment,
        as: 'replies',
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'profilePicture', 'firstName', 'lastName'],
          },
        ],
        order: [['createdAt', 'ASC']],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    comments: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
    },
  };
}

/**
 * Delete a comment (own comment or admin). Decrements commentsCount on post.
 */
async function deleteComment(commentId, userId, userRole, { Post, Comment }) {
  const comment = await Comment.findByPk(commentId);
  if (!comment) {
    throw new NotFoundError('Comment');
  }

  const isOwner = comment.userId === userId;
  const isAdminRole = userRole === 'admin' || userRole === 'super_admin';

  if (!isOwner && !isAdminRole) {
    throw new AppError('Not authorized to delete this comment', 403, 'FORBIDDEN');
  }

  const postId = comment.postId;

  await comment.destroy(); // paranoid soft delete

  // Decrement comments count on the post
  const post = await Post.findByPk(postId);
  if (post && post.commentsCount > 0) {
    await post.decrement('commentsCount');
  }

  logger.info('Comment deleted', { commentId, postId, userId });
}

/**
 * Report a post.
 */
async function reportPost(postId, userId, reason, { Post }) {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new NotFoundError('Post');
  }

  await post.update({
    isReported: true,
    reportReason: reason,
    reportedBy: userId,
  });

  logger.info('Post reported', { postId, userId, reason });
}

/**
 * Track a share event.
 */
async function trackShare(postId, userId, channel, { Post, ShareTracking }) {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new NotFoundError('Post');
  }

  await ShareTracking.create({
    entityType: 'post',
    entityId: postId,
    userId,
    channel: channel || null,
  });

  logger.info('Share tracked', { postId, userId, channel });
}

module.exports = {
  listPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  listComments,
  deleteComment,
  reportPost,
  trackShare,
};
