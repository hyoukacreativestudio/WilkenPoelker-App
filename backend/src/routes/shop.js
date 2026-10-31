const express = require('express');
const router = express.Router();
const { asyncHandler, NotFoundError } = require('../middlewares/errorHandler');
const catalog = require('../services/shop/shopCatalog');

// Public product catalog for the app and the website (no login). Only shows
// what customers may see: no stock numbers, reservations or Taifun GUIDs.

router.get('/products', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, data: await catalog.listProducts(req.query) });
}));

router.get('/products/:slug', asyncHandler(async (req, res) => {
  const product = await catalog.getProduct(req.params.slug);
  if (!product) throw new NotFoundError('Produkt');
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, data: { product } });
}));

module.exports = router;
