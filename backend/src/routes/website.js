const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { asyncHandler } = require('../middlewares/errorHandler');
const googleReviews = require('../services/googleReviews');

// Public endpoints for the company website (www.wilkenpoelker.de, test: wilpo.net).
// Everything here is public anyway; no login, no personal data of visitors.

// Google reviews, fetched fresh for every display (Google forbids caching them)
router.get('/reviews', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: await googleReviews.getReviews() });
}));

// Author avatars of the reviews, passed through without storing
router.get('/reviews/avatar', (req, res) => googleReviews.streamAvatar(req.query.u, res));

// Latest posts of the app feed ("Neuigkeiten" on the website). Staff posts only
// (only staff can post), without likes, comments or author accounts.
router.get('/news', asyncHandler(async (req, res) => {
  const { Post } = require('../models');
  const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);
  const posts = await Post.findAll({
    where: { isReported: { [Op.not]: true } },
    attributes: ['id', 'content', 'type', 'mediaUrl', 'thumbnailUrl', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit,
  });
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: { posts } });
}));

// The whole public catalog with details in one answer, for the website
// generator (same data as /api/shop/products/:slug, one request instead of 300)
router.get('/catalog', asyncHandler(async (req, res) => {
  const catalog = require('../services/shop/shopCatalog');
  const { MAIN_ORDER } = require('../services/shop/productGrouping');
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { mainOrder: MAIN_ORDER, products: await catalog.getAllProducts() } });
}));

module.exports = router;
