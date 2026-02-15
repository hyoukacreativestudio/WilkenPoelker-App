const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

// ──────────────────────────────────────────────
// PRODUCTS
// ──────────────────────────────────────────────

async function listProducts(query, userId, models) {
  const { Product, Favorite } = models;
  const {
    category,
    subcategory,
    brand,
    minPrice,
    maxPrice,
    sort,
    search,
    page = 1,
    limit = 20,
  } = query;

  const where = { isAvailable: true };

  if (category) where.category = category;
  if (subcategory) where.subcategory = subcategory;
  if (brand) where.brand = brand;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { brand: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Sorting
  let order;
  switch (sort) {
    case 'price_asc':
      order = [['price', 'ASC']];
      break;
    case 'price_desc':
      order = [['price', 'DESC']];
      break;
    case 'rating':
      order = [['averageRating', 'DESC']];
      break;
    case 'newest':
      order = [['createdAt', 'DESC']];
      break;
    case 'popularity':
      order = [['reviewCount', 'DESC']];
      break;
    default:
      order = [['createdAt', 'DESC']];
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: products, count: total } = await Product.findAndCountAll({
    where,
    order,
    limit: parseInt(limit),
    offset,
  });

  // If user is authenticated, check favorites
  let productsData = products.map((p) => p.toJSON());
  if (userId) {
    const productIds = products.map((p) => p.id);
    const favorites = await Favorite.findAll({
      where: { userId, productId: { [Op.in]: productIds } },
      attributes: ['productId'],
    });
    const favoritedIds = new Set(favorites.map((f) => f.productId));
    productsData = productsData.map((p) => ({
      ...p,
      isFavorited: favoritedIds.has(p.id),
    }));
  }

  return {
    products: productsData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getOffers(models) {
  const { Product } = models;

  const products = await Product.findAll({
    where: {
      isAvailable: true,
      salePrice: { [Op.not]: null },
      [Op.or]: [
        { saleEndsAt: { [Op.gt]: new Date() } },
        { saleEndsAt: null },
      ],
    },
    order: [['category', 'ASC'], ['discountPercentage', 'DESC']],
  });

  // Group by category
  const grouped = {};
  for (const product of products) {
    const cat = product.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(product);
  }

  return grouped;
}

async function searchProducts(query, models) {
  const { Product } = models;
  const { q } = query;

  if (!q || q.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400, 'SEARCH_TOO_SHORT');
  }

  const products = await Product.findAll({
    where: {
      isAvailable: true,
      [Op.or]: [
        { name: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { brand: { [Op.iLike]: `%${q}%` } },
      ],
    },
    order: [['averageRating', 'DESC']],
    limit: 20,
  });

  return products;
}

async function getProductsByCategory(category, query, models) {
  const { Product } = models;
  const { page = 1, limit = 20 } = query;

  const validCategories = ['bike', 'cleaning', 'motor'];
  if (!validCategories.includes(category)) {
    throw new AppError('Invalid category', 400, 'INVALID_CATEGORY');
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: products, count: total } = await Product.findAndCountAll({
    where: { category, isAvailable: true },
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  // Get distinct subcategories for this category
  const subcategories = await Product.findAll({
    where: { category, isAvailable: true },
    attributes: [[fn('DISTINCT', col('subcategory')), 'subcategory']],
    raw: true,
  });

  return {
    products,
    subcategories: subcategories.map((s) => s.subcategory).filter(Boolean),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getProductById(productId, userId, models) {
  const { Product, ProductReview, Favorite } = models;

  const product = await Product.findByPk(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  // Reviews summary: average rating, count, distribution
  const reviewStats = await ProductReview.findAll({
    where: { productId },
    attributes: [
      [fn('COUNT', col('id')), 'count'],
      [fn('AVG', col('rating')), 'avgRating'],
    ],
    raw: true,
  });

  // Rating distribution (count per star)
  const distribution = await ProductReview.findAll({
    where: { productId },
    attributes: [
      'rating',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['rating'],
    raw: true,
  });

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution) {
    ratingDistribution[d.rating] = parseInt(d.count);
  }

  const productData = product.toJSON();
  productData.reviewsSummary = {
    averageRating: reviewStats[0]?.avgRating ? parseFloat(parseFloat(reviewStats[0].avgRating).toFixed(2)) : 0,
    count: parseInt(reviewStats[0]?.count || 0),
    distribution: ratingDistribution,
  };

  // Check if user favorited this product
  if (userId) {
    const favorite = await Favorite.findOne({
      where: { userId, productId },
    });
    productData.isFavorited = !!favorite;
  }

  return productData;
}

// ──────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────

async function createReview(productId, userId, data, models) {
  const { Product, ProductReview } = models;

  const product = await Product.findByPk(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const { rating, title, text, qualityRating, valueRating, wouldRecommend, photos } = data;

  if (rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
  }

  // Check unique constraint (one review per user per product)
  const existing = await ProductReview.findOne({
    where: { productId, userId },
  });
  if (existing) {
    throw new AppError('You have already reviewed this product', 409, 'DUPLICATE_REVIEW');
  }

  const review = await ProductReview.create({
    productId,
    userId,
    rating,
    title: title || null,
    text: text || null,
    qualityRating: qualityRating || null,
    valueRating: valueRating || null,
    wouldRecommend: wouldRecommend !== undefined ? wouldRecommend : null,
    photos: photos || [],
  });

  // Recalculate product averageRating and reviewCount
  await recalculateProductRating(productId, models);

  logger.info('Review created', { productId, userId, rating });

  return review;
}

async function getReviews(productId, query, models) {
  const { Product, ProductReview, User } = models;

  const product = await Product.findByPk(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const { sort = 'newest', page = 1, limit = 20 } = query;

  let order;
  switch (sort) {
    case 'newest':
      order = [['createdAt', 'DESC']];
      break;
    case 'helpful':
      order = [['helpfulCount', 'DESC']];
      break;
    case 'rating_high':
      order = [['rating', 'DESC']];
      break;
    case 'rating_low':
      order = [['rating', 'ASC']];
      break;
    default:
      order = [['createdAt', 'DESC']];
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: reviews, count: total } = await ProductReview.findAndCountAll({
    where: { productId },
    include: [
      { model: User, as: 'reviewer', attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture'] },
    ],
    order,
    limit: parseInt(limit),
    offset,
  });

  return {
    reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function updateReview(reviewId, userId, data, models) {
  const { ProductReview } = models;

  const review = await ProductReview.findByPk(reviewId);
  if (!review) {
    throw new NotFoundError('Review');
  }

  if (review.userId !== userId) {
    throw new AppError('You can only edit your own reviews', 403, 'FORBIDDEN');
  }

  // Check 7-day edit window
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (review.createdAt < sevenDaysAgo) {
    throw new AppError('Reviews can only be edited within 7 days of creation', 400, 'EDIT_WINDOW_EXPIRED');
  }

  const { rating, title, text, qualityRating, valueRating, wouldRecommend } = data;

  if (rating !== undefined) {
    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
    }
    review.rating = rating;
  }
  if (title !== undefined) review.title = title;
  if (text !== undefined) review.text = text;
  if (qualityRating !== undefined) review.qualityRating = qualityRating;
  if (valueRating !== undefined) review.valueRating = valueRating;
  if (wouldRecommend !== undefined) review.wouldRecommend = wouldRecommend;

  await review.save();

  // Recalculate product rating
  await recalculateProductRating(review.productId, models);

  return review;
}

async function deleteReview(reviewId, userId, userRole, models) {
  const { ProductReview } = models;

  const review = await ProductReview.findByPk(reviewId);
  if (!review) {
    throw new NotFoundError('Review');
  }

  // Allow deletion by owner or admin
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  if (review.userId !== userId && !isAdmin) {
    throw new AppError('You can only delete your own reviews', 403, 'FORBIDDEN');
  }

  const productId = review.productId;
  await review.destroy();

  // Recalculate product rating
  await recalculateProductRating(productId, models);

  logger.info('Review deleted', { reviewId, productId, deletedBy: userId });

  return { deleted: true };
}

// ──────────────────────────────────────────────
// FAVORITES
// ──────────────────────────────────────────────

async function toggleFavorite(productId, userId, models) {
  const { Product, Favorite } = models;

  const product = await Product.findByPk(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const existing = await Favorite.findOne({
    where: { userId, productId },
  });

  if (existing) {
    await existing.destroy();
    return { favorited: false };
  }

  await Favorite.create({ userId, productId });
  return { favorited: true };
}

async function getUserFavorites(userId, query, models) {
  const { Product, Favorite } = models;
  const { page = 1, limit = 20 } = query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: favorites, count: total } = await Favorite.findAndCountAll({
    where: { userId },
    include: [
      { model: Product, attributes: ['id', 'name', 'category', 'price', 'salePrice', 'thumbnailUrl', 'averageRating', 'reviewCount', 'isAvailable'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  return {
    favorites: favorites.map((f) => ({
      ...f.Product.toJSON(),
      favoritedAt: f.createdAt,
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

// ──────────────────────────────────────────────
// SHARE TRACKING
// ──────────────────────────────────────────────

async function trackShare(productId, userId, data, models) {
  const { Product, ShareTracking } = models;

  const product = await Product.findByPk(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const { channel } = data;

  await ShareTracking.create({
    userId: userId || null,
    entityType: 'product',
    entityId: productId,
    channel: channel || 'unknown',
  });

  // Increment share count on product
  await product.increment('shareCount');

  return { shared: true };
}

async function getShareMetadata(productId, models) {
  const { Product } = models;

  const product = await Product.findByPk(productId, {
    attributes: ['id', 'name', 'description', 'thumbnailUrl', 'price', 'salePrice', 'category', 'brand'],
  });

  if (!product) {
    throw new NotFoundError('Product');
  }

  return {
    title: product.name,
    description: product.description ? product.description.substring(0, 200) : '',
    image: product.thumbnailUrl || null,
    url: `/products/${product.id}`,
    price: product.salePrice || product.price,
    originalPrice: product.salePrice ? product.price : null,
    brand: product.brand,
    category: product.category,
  };
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

async function recalculateProductRating(productId, models) {
  const { Product, ProductReview } = models;

  const stats = await ProductReview.findAll({
    where: { productId },
    attributes: [
      [fn('COUNT', col('id')), 'count'],
      [fn('AVG', col('rating')), 'avgRating'],
    ],
    raw: true,
  });

  const count = parseInt(stats[0]?.count || 0);
  const avgRating = stats[0]?.avgRating ? parseFloat(parseFloat(stats[0].avgRating).toFixed(2)) : 0;

  await Product.update(
    { averageRating: avgRating, reviewCount: count },
    { where: { id: productId } }
  );
}

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
