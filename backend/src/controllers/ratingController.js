const ratingService = require('../services/ratingService');
const { asyncHandler } = require('../middlewares/errorHandler');

const createServiceRating = asyncHandler(async (req, res) => {
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
  } = req.body;

  const rating = await ratingService.createServiceRating(req.user.id, {
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
  });

  res.status(201).json({
    success: true,
    message: 'Bewertung erfolgreich erstellt',
    data: rating,
  });
});

const createProductReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const review = await ratingService.createProductReview(
    req.user.id,
    productId,
    req.body
  );

  res.status(201).json({
    success: true,
    message: 'Produktbewertung erfolgreich erstellt',
    data: review,
  });
});

const createStaffRating = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  const rating = await ratingService.createStaffRating(
    req.user.id,
    staffId,
    req.body
  );

  res.status(201).json({
    success: true,
    message: 'Mitarbeiterbewertung erfolgreich erstellt',
    data: rating,
  });
});

const getServiceRatingStats = asyncHandler(async (req, res) => {
  const stats = await ratingService.getServiceRatingStats();

  res.json({
    success: true,
    data: stats,
  });
});

const getProductRatingStats = asyncHandler(async (req, res) => {
  const stats = await ratingService.getProductRatingStats(req.params.productId);

  res.json({
    success: true,
    data: stats,
  });
});

const voteReviewHelpful = asyncHandler(async (req, res) => {
  const result = await ratingService.voteReviewHelpful(req.params.id);

  res.json({
    success: true,
    message: 'Danke fuer Ihr Feedback',
    data: result,
  });
});

module.exports = {
  createServiceRating,
  createProductReview,
  createStaffRating,
  getServiceRatingStats,
  getProductRatingStats,
  voteReviewHelpful,
};
