const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { validate, validators, body, query } = require('../middlewares/validate');

// ──────────────────────────────────────────────
// PRODUCTS
// ──────────────────────────────────────────────

// GET /api/products - List products (optional auth for isFavorited)
router.get(
  '/',
  optionalAuth,
  productController.listProducts
);

// GET /api/products/offers - Current offers (sale items)
router.get(
  '/offers',
  productController.getOffers
);

// GET /api/products/search - Full-text search
router.get(
  '/search',
  validate([
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2 })
      .withMessage('Search query must be at least 2 characters'),
  ]),
  productController.searchProducts
);

// GET /api/products/favorites - User's favorites (authenticated)
router.get(
  '/favorites',
  authenticate,
  productController.getUserFavorites
);

// GET /api/products/categories/:category - Products by category
router.get(
  '/categories/:category',
  productController.getProductsByCategory
);

// GET /api/products/:id - Product detail (optional auth for isFavorited)
router.get(
  '/:id',
  optionalAuth,
  validate([validators.uuid('id')]),
  productController.getProductById
);

// ──────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────

// POST /api/products/:id/review - Create review (authenticated)
router.post(
  '/:id/review',
  authenticate,
  validate([
    validators.uuid('id'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('title')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('text')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Review text cannot exceed 5000 characters'),
    body('qualityRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Quality rating must be between 1 and 5'),
    body('valueRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Value rating must be between 1 and 5'),
    body('wouldRecommend')
      .optional()
      .isBoolean()
      .withMessage('wouldRecommend must be a boolean'),
  ]),
  productController.createReview
);

// GET /api/products/:id/reviews - Get reviews for a product (paginated)
router.get(
  '/:id/reviews',
  validate([validators.uuid('id')]),
  productController.getReviews
);

// PUT /api/products/reviews/:id - Update own review (within 7 days)
router.put(
  '/reviews/:id',
  authenticate,
  validate([
    validators.uuid('id'),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('title')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('text')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Review text cannot exceed 5000 characters'),
  ]),
  productController.updateReview
);

// DELETE /api/products/reviews/:id - Delete own review or admin
router.delete(
  '/reviews/:id',
  authenticate,
  validate([validators.uuid('id')]),
  productController.deleteReview
);

// ──────────────────────────────────────────────
// FAVORITES
// ──────────────────────────────────────────────

// POST /api/products/:id/favorite - Toggle favorite (authenticated)
router.post(
  '/:id/favorite',
  authenticate,
  validate([validators.uuid('id')]),
  productController.toggleFavorite
);

// ──────────────────────────────────────────────
// SHARE
// ──────────────────────────────────────────────

// POST /api/products/:id/share - Track share event (optional auth)
router.post(
  '/:id/share',
  optionalAuth,
  validate([
    validators.uuid('id'),
    body('channel')
      .optional()
      .isString()
      .withMessage('Channel must be a string'),
  ]),
  productController.trackShare
);

// GET /api/products/:id/share-metadata - Open Graph metadata for share preview
router.get(
  '/:id/share-metadata',
  validate([validators.uuid('id')]),
  productController.getShareMetadata
);

module.exports = router;
