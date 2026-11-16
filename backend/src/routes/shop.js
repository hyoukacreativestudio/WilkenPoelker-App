const express = require('express');
const router = express.Router();
const { asyncHandler, NotFoundError } = require('../middlewares/errorHandler');
const { authenticate } = require('../middlewares/auth');
const { inquiryLimiter } = require('../middlewares/rateLimit');
const { validate, body } = require('../middlewares/validate');
const catalog = require('../services/shop/shopCatalog');
const inquiries = require('../controllers/inquiryController');

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

// Product inquiry from the app: becomes a ticket, the answer comes in the app.
router.post(
  '/inquiries/app',
  authenticate,
  inquiryLimiter,
  validate([
    body('slug').notEmpty().withMessage('Produkt fehlt'),
    body('message').optional({ nullable: true }).isLength({ max: 2000 }).withMessage('Nachricht ist zu lang'),
  ]),
  inquiries.createAppInquiry,
);

// Inquiry from a website form (product, workshop, general question, callback):
// e-mail AND phone are required, the customer has no account and is contacted
// there. A callback request ("rueckruf") only needs the phone number.
const isCallback = (req) => req.body && req.body.topic === 'rueckruf';
router.post(
  '/inquiries',
  inquiryLimiter,
  validate([
    body('topic').optional({ nullable: true }).isIn(Object.keys(inquiries.TOPICS)).withMessage('Unbekanntes Thema'),
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Bitte geben Sie Ihren Namen an'),
    body('email')
      .if((value, { req }) => !(isCallback(req) && !String(value || '').trim()))
      .trim().isEmail().isLength({ max: 200 }).withMessage('Bitte geben Sie eine gültige E-Mail-Adresse an'),
    body('phone').trim().matches(/^[+()\d][\d\s()/+-]{5,30}$/).withMessage('Bitte geben Sie eine gültige Telefonnummer an'),
    body('message').optional({ nullable: true }).isLength({ max: 2000 }).withMessage('Nachricht ist zu lang'),
    body('pageUrl').optional({ nullable: true }).isLength({ max: 300 }),
  ]),
  inquiries.createWebInquiry,
);

module.exports = router;
