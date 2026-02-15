const productService = require('../services/productService');
const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { Ticket, ChatMessage, User, Product, ProductReview, Favorite, Repair, Notification, ShareTracking } = require('../models');

const models = { Product, ProductReview, Favorite, ShareTracking, User };

// ──────────────────────────────────────────────
// PRODUCTS
// ──────────────────────────────────────────────

// GET /
const listProducts = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const result = await productService.listProducts(req.query, userId, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /offers
const getOffers = asyncHandler(async (req, res) => {
  const offers = await productService.getOffers(models);

  res.json({
    success: true,
    data: { offers },
  });
});

// GET /search
const searchProducts = asyncHandler(async (req, res) => {
  const products = await productService.searchProducts(req.query, models);

  res.json({
    success: true,
    data: { products },
  });
});

// GET /categories/:category
const getProductsByCategory = asyncHandler(async (req, res) => {
  const result = await productService.getProductsByCategory(req.params.category, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /:id
const getProductById = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const product = await productService.getProductById(req.params.id, userId, models);

  res.json({
    success: true,
    data: { product },
  });
});

// ──────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────

// POST /:id/review
const createReview = asyncHandler(async (req, res) => {
  const { rating, title, text, qualityRating, valueRating, wouldRecommend, photos } = req.body;

  const review = await productService.createReview(
    req.params.id,
    req.user.id,
    { rating, title, text, qualityRating, valueRating, wouldRecommend, photos },
    models
  );

  res.status(201).json({
    success: true,
    data: { review },
  });
});

// GET /:id/reviews
const getReviews = asyncHandler(async (req, res) => {
  const result = await productService.getReviews(req.params.id, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// PUT /reviews/:id
const updateReview = asyncHandler(async (req, res) => {
  const review = await productService.updateReview(req.params.id, req.user.id, req.body, models);

  res.json({
    success: true,
    data: { review },
  });
});

// DELETE /reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  await productService.deleteReview(req.params.id, req.user.id, req.user.role, models);

  res.json({
    success: true,
    message: 'Review deleted successfully',
  });
});

// ──────────────────────────────────────────────
// FAVORITES
// ──────────────────────────────────────────────

// POST /:id/favorite
const toggleFavorite = asyncHandler(async (req, res) => {
  const result = await productService.toggleFavorite(req.params.id, req.user.id, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /favorites
const getUserFavorites = asyncHandler(async (req, res) => {
  const result = await productService.getUserFavorites(req.user.id, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// ──────────────────────────────────────────────
// SHARE
// ──────────────────────────────────────────────

// POST /:id/share
const trackShare = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const result = await productService.trackShare(req.params.id, userId, req.body, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /:id/share-metadata
const getShareMetadata = asyncHandler(async (req, res) => {
  const metadata = await productService.getShareMetadata(req.params.id, models);

  res.json({
    success: true,
    data: { metadata },
  });
});

module.exports = {
  listProducts,
  getOffers,
  searchProducts,
  getProductsByCategory,
  getProductById,
  createReview,
  getReviews,
  updateReview,
  deleteReview,
  toggleFavorite,
  getUserFavorites,
  trackShare,
  getShareMetadata,
};
