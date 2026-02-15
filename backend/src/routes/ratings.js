const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { authenticate } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roles');
const { validate, validators, body, param } = require('../middlewares/validate');

// POST /api/ratings/service - create service rating
router.post(
  '/service',
  authenticate,
  validate([
    body('ticketId').optional().isUUID().withMessage('Ungueltige Ticket-ID'),
    body('repairId').optional().isString().withMessage('Ungueltige Reparatur-ID'),
    body('type')
      .isIn(['repair', 'service', 'consultation'])
      .withMessage('Typ muss repair, service oder consultation sein'),
    body('overallRating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Gesamtbewertung muss zwischen 1 und 5 liegen'),
    body('qualityRating').optional().isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('friendlinessRating').optional().isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('waitTimeRating').optional().isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('valueRating').optional().isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('text').optional().isLength({ max: 2000 }).withMessage('Text darf maximal 2000 Zeichen lang sein').trim(),
    body('photos').optional().isArray().withMessage('Fotos muss ein Array sein'),
    body('isAnonymous').optional().isBoolean().withMessage('isAnonymous muss ein Boolean sein'),
  ]),
  ratingController.createServiceRating
);

// POST /api/ratings/product/:productId - create product review
router.post(
  '/product/:productId',
  authenticate,
  validate([
    param('productId').isUUID().withMessage('Ungueltige Produkt-ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('qualityRating').optional().isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('valueRating').optional().isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('wouldRecommend').optional().isBoolean(),
    body('title').optional().isLength({ max: 200 }).trim(),
    body('text').optional().isLength({ max: 2000 }).trim(),
    body('photos').optional().isArray(),
  ]),
  ratingController.createProductReview
);

// POST /api/ratings/staff/:staffId - rate staff member
router.post(
  '/staff/:staffId',
  authenticate,
  validate([
    param('staffId').isUUID().withMessage('Ungueltige Mitarbeiter-ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 liegen'),
    body('text').optional().isLength({ max: 2000 }).trim(),
  ]),
  ratingController.createStaffRating
);

// GET /api/ratings/service/stats - aggregated service rating stats (admin)
router.get(
  '/service/stats',
  authenticate,
  isAdmin,
  ratingController.getServiceRatingStats
);

// GET /api/ratings/product/:productId/stats - product rating stats
router.get(
  '/product/:productId/stats',
  validate([param('productId').isUUID().withMessage('Ungueltige Produkt-ID')]),
  ratingController.getProductRatingStats
);

// POST /api/ratings/reviews/:id/helpful - vote review as helpful
router.post(
  '/reviews/:id/helpful',
  validate([validators.uuid()]),
  ratingController.voteReviewHelpful
);

module.exports = router;
