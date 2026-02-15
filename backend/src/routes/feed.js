const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { authenticate } = require('../middlewares/auth');
const { authorize, isAdmin, isSuperAdmin, canPost, ROLES } = require('../middlewares/roles');
const { validate, validators, body, query, param } = require('../middlewares/validate');
const { uploadSingle } = require('../middlewares/upload');
const { uploadLimiter } = require('../middlewares/rateLimit');

// ──────────────────────────────────────────────
// Posts
// ──────────────────────────────────────────────

// GET /api/feed
router.get(
  '/',
  authenticate,
  validate([
    query('cursor').optional().isISO8601().withMessage('Cursor must be a valid ISO date'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ]),
  feedController.listPosts
);

// POST /api/feed
router.post(
  '/',
  authenticate,
  canPost,
  uploadLimiter,
  uploadSingle('media'),
  validate([
    body('content').optional().isLength({ max: 5000 }).withMessage('Content must be at most 5000 characters'),
    body('type').optional().isIn(['text', 'image', 'video', 'offer']).withMessage('Invalid post type'),
  ]),
  feedController.createPost
);

// GET /api/feed/:id
router.get(
  '/:id',
  authenticate,
  validate([validators.uuid('id')]),
  feedController.getPost
);

// PUT /api/feed/:id
router.put(
  '/:id',
  authenticate,
  validate([
    validators.uuid('id'),
    body('content').optional().isLength({ max: 5000 }).withMessage('Content must be at most 5000 characters'),
    body('type').optional().isIn(['text', 'image', 'video', 'offer']).withMessage('Invalid post type'),
  ]),
  feedController.updatePost
);

// DELETE /api/feed/:id
router.delete(
  '/:id',
  authenticate,
  validate([validators.uuid('id')]),
  feedController.deletePost
);

// ──────────────────────────────────────────────
// Likes
// ──────────────────────────────────────────────

// POST /api/feed/:id/like
router.post(
  '/:id/like',
  authenticate,
  validate([validators.uuid('id')]),
  feedController.toggleLike
);

// ──────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────

// POST /api/feed/:id/comment
router.post(
  '/:id/comment',
  authenticate,
  validate([
    validators.uuid('id'),
    body('content').notEmpty().withMessage('Comment content is required').isLength({ max: 2000 }).withMessage('Comment must be at most 2000 characters'),
    body('parentId').optional().isUUID().withMessage('Invalid parent comment ID'),
  ]),
  feedController.addComment
);

// GET /api/feed/:id/comments
router.get(
  '/:id/comments',
  authenticate,
  validate([
    validators.uuid('id'),
    ...validators.pagination,
  ]),
  feedController.listComments
);

// DELETE /api/feed/comments/:id
router.delete(
  '/comments/:id',
  authenticate,
  validate([validators.uuid('id')]),
  feedController.deleteComment
);

// ──────────────────────────────────────────────
// Report & Share
// ──────────────────────────────────────────────

// POST /api/feed/:id/report
router.post(
  '/:id/report',
  authenticate,
  validate([
    validators.uuid('id'),
    body('reason').notEmpty().withMessage('Report reason is required').isLength({ max: 500 }).withMessage('Reason must be at most 500 characters'),
  ]),
  feedController.reportPost
);

// POST /api/feed/:id/share
router.post(
  '/:id/share',
  authenticate,
  validate([
    validators.uuid('id'),
    body('channel').optional().isString().withMessage('Channel must be a string'),
  ]),
  feedController.sharePost
);

module.exports = router;
