const feedService = require('../services/feedService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { User, Post, Comment, Like, Notification, FCMToken, AuditLog } = require('../models');
const { ShareTracking } = require('../models');

// ──────────────────────────────────────────────
// Posts
// ──────────────────────────────────────────────

const listPosts = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;

  const result = await feedService.listPosts(
    { cursor, limit, userId: req.user.id },
    { Post, User, Like }
  );

  res.json({
    success: true,
    data: result,
  });
});

const createPost = asyncHandler(async (req, res) => {
  const { content, type } = req.body;

  const post = await feedService.createPost(
    { content, type, userId: req.user.id, file: req.file },
    { Post }
  );

  res.status(201).json({
    success: true,
    data: { post },
  });
});

const getPost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await feedService.getPost(id, req.user.id, { Post, User, Like });

  res.json({
    success: true,
    data: { post },
  });
});

const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, type } = req.body;

  const post = await feedService.updatePost(
    id,
    req.user.id,
    req.user.role,
    { content, type },
    { Post }
  );

  res.json({
    success: true,
    data: { post },
  });
});

const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await feedService.deletePost(id, req.user.id, req.user.role, { Post, Like, Comment, ShareTracking });

  res.json({
    success: true,
    message: 'Post deleted successfully',
  });
});

// ──────────────────────────────────────────────
// Likes
// ──────────────────────────────────────────────

const toggleLike = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await feedService.toggleLike(id, req.user.id, { Post, Like });

  res.json({
    success: true,
    data: result,
  });
});

// ──────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────

const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, parentId } = req.body;

  const comment = await feedService.addComment(
    id,
    req.user.id,
    { content, parentId },
    { Post, Comment }
  );

  res.status(201).json({
    success: true,
    data: { comment },
  });
});

const listComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit } = req.query;

  const result = await feedService.listComments(id, { page, limit }, { Comment, User });

  res.json({
    success: true,
    data: result,
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await feedService.deleteComment(id, req.user.id, req.user.role, { Post, Comment });

  res.json({
    success: true,
    message: 'Comment deleted successfully',
  });
});

// ──────────────────────────────────────────────
// Report & Share
// ──────────────────────────────────────────────

const reportPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  await feedService.reportPost(id, req.user.id, reason, { Post });

  res.json({
    success: true,
    message: 'Post reported successfully',
  });
});

const sharePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { channel } = req.body;

  await feedService.trackShare(id, req.user.id, channel, { Post, ShareTracking });

  res.json({
    success: true,
    message: 'Share tracked successfully',
  });
});

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
  sharePost,
};
