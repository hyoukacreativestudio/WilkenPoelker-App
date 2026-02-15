const { Op, fn, col, literal } = require('sequelize');
const {
  ServiceRating,
  StaffRating,
  ProductReview,
  Product,
  User,
  Ticket,
  Repair,
} = require('../models');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Create a service rating.
 */
async function createServiceRating(userId, data) {
  const {
    ticketId,
    repairId,
    type,
    overallRating,
    qualityRating,
    friendlinessRating,
    waitTimeRating,
    valueRating,
    text,
    photos,
    isAnonymous,
  } = data;

  // Validate that either ticketId or repairId is provided
  if (!ticketId && !repairId) {
    throw new AppError(
      'Entweder ticketId oder repairId muss angegeben werden',
      400,
      'MISSING_REFERENCE'
    );
  }

  // Validate ticket/repair ownership
  if (ticketId) {
    const ticket = await Ticket.findOne({ where: { id: ticketId, userId } });
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }
  }

  if (repairId) {
    const repair = await Repair.findOne({ where: { repairNumber: repairId, userId } });
    if (!repair) {
      throw new NotFoundError('Repair');
    }
  }

  // Check for existing rating
  const existingWhere = { userId };
  if (ticketId) existingWhere.ticketId = ticketId;
  if (repairId) existingWhere.repairId = repairId;

  const existing = await ServiceRating.findOne({ where: existingWhere });
  if (existing) {
    throw new AppError('Sie haben diesen Service bereits bewertet', 409, 'ALREADY_RATED');
  }

  const rating = await ServiceRating.create({
    userId,
    ticketId: ticketId || null,
    repairId: repairId || null,
    type,
    overallRating,
    qualityRating: qualityRating || null,
    friendlinessRating: friendlinessRating || null,
    waitTimeRating: waitTimeRating || null,
    valueRating: valueRating || null,
    text: text || null,
    photos: photos || [],
    isAnonymous: isAnonymous || false,
  });

  logger.info('Service rating created', { ratingId: rating.id, userId });

  return rating;
}

/**
 * Create a product review (same logic as POST /api/products/:id/review).
 */
async function createProductReview(userId, productId, data) {
  const product = await Product.findByPk(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  // Check for existing review
  const existing = await ProductReview.findOne({
    where: { productId, userId },
  });
  if (existing) {
    throw new AppError('Sie haben dieses Produkt bereits bewertet', 409, 'ALREADY_REVIEWED');
  }

  const review = await ProductReview.create({
    productId,
    userId,
    rating: data.rating,
    qualityRating: data.qualityRating || null,
    valueRating: data.valueRating || null,
    wouldRecommend: data.wouldRecommend,
    title: data.title || null,
    text: data.text || null,
    photos: data.photos || [],
  });

  // Update product average rating
  const stats = await ProductReview.findAll({
    where: { productId },
    attributes: [
      [fn('AVG', col('rating')), 'avgRating'],
      [fn('COUNT', col('id')), 'count'],
    ],
    raw: true,
  });

  if (stats[0]) {
    await Product.update(
      {
        averageRating: parseFloat(stats[0].avgRating) || 0,
        reviewCount: parseInt(stats[0].count, 10) || 0,
      },
      { where: { id: productId } }
    );
  }

  logger.info('Product review created', { reviewId: review.id, productId, userId });

  return review;
}

/**
 * Rate a staff member (internal visibility only).
 */
async function createStaffRating(userId, staffId, data) {
  const staff = await User.findByPk(staffId);
  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  // Only staff/managers can receive ratings
  const staffRoles = ['admin', 'super_admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager'];
  if (!staffRoles.includes(staff.role)) {
    throw new AppError('Dieses Mitglied kann nicht bewertet werden', 400, 'NOT_STAFF');
  }

  // Cannot rate yourself
  if (userId === staffId) {
    throw new AppError('Sie koennen sich nicht selbst bewerten', 400, 'SELF_RATING');
  }

  const rating = await StaffRating.create({
    staffId,
    userId,
    rating: data.rating,
    text: data.text || null,
    isVisible: false, // only visible internally
  });

  logger.info('Staff rating created', { ratingId: rating.id, staffId, userId });

  return rating;
}

/**
 * Get aggregated service rating statistics (admin).
 */
async function getServiceRatingStats() {
  const overall = await ServiceRating.findAll({
    attributes: [
      [fn('AVG', col('overall_rating')), 'avgOverall'],
      [fn('AVG', col('quality_rating')), 'avgQuality'],
      [fn('AVG', col('friendliness_rating')), 'avgFriendliness'],
      [fn('AVG', col('wait_time_rating')), 'avgWaitTime'],
      [fn('AVG', col('value_rating')), 'avgValue'],
      [fn('COUNT', col('id')), 'totalCount'],
    ],
    raw: true,
  });

  // Distribution by overall rating
  const distribution = await ServiceRating.findAll({
    attributes: [
      'overallRating',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['overallRating'],
    order: [['overallRating', 'ASC']],
    raw: true,
  });

  // Build distribution map
  const distMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => {
    distMap[d.overallRating] = parseInt(d.count, 10);
  });

  return {
    averages: {
      overall: parseFloat(overall[0]?.avgOverall) || 0,
      quality: parseFloat(overall[0]?.avgQuality) || 0,
      friendliness: parseFloat(overall[0]?.avgFriendliness) || 0,
      waitTime: parseFloat(overall[0]?.avgWaitTime) || 0,
      value: parseFloat(overall[0]?.avgValue) || 0,
    },
    totalCount: parseInt(overall[0]?.totalCount, 10) || 0,
    distribution: distMap,
  };
}

/**
 * Get product rating statistics.
 */
async function getProductRatingStats(productId) {
  const product = await Product.findByPk(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const overall = await ProductReview.findAll({
    where: { productId },
    attributes: [
      [fn('AVG', col('rating')), 'avgRating'],
      [fn('AVG', col('quality_rating')), 'avgQuality'],
      [fn('AVG', col('value_rating')), 'avgValue'],
      [fn('COUNT', col('id')), 'totalCount'],
    ],
    raw: true,
  });

  const distribution = await ProductReview.findAll({
    where: { productId },
    attributes: [
      'rating',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['rating'],
    order: [['rating', 'ASC']],
    raw: true,
  });

  const distMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => {
    distMap[d.rating] = parseInt(d.count, 10);
  });

  return {
    productId,
    averages: {
      overall: parseFloat(overall[0]?.avgRating) || 0,
      quality: parseFloat(overall[0]?.avgQuality) || 0,
      value: parseFloat(overall[0]?.avgValue) || 0,
    },
    totalCount: parseInt(overall[0]?.totalCount, 10) || 0,
    distribution: distMap,
  };
}

/**
 * Vote a review as helpful (increment helpfulCount).
 */
async function voteReviewHelpful(reviewId) {
  const review = await ProductReview.findByPk(reviewId);
  if (!review) {
    throw new NotFoundError('Review');
  }

  review.helpfulCount = (review.helpfulCount || 0) + 1;
  await review.save();

  return { helpfulCount: review.helpfulCount };
}

module.exports = {
  createServiceRating,
  createProductReview,
  createStaffRating,
  getServiceRatingStats,
  getProductRatingStats,
  voteReviewHelpful,
};
