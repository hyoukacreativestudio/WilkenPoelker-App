const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { feedbackLimiter } = require('../middlewares/rateLimit');
const { validate, body } = require('../middlewares/validate');
const { createFeedback } = require('../controllers/feedbackController');

// POST /api/feedback - free text from the app, only admins read it
router.post(
  '/',
  authenticate,
  feedbackLimiter,
  validate([
    body('message').trim().isLength({ min: 3, max: 3000 }).withMessage('Bitte schreiben Sie Ihr Feedback (bis zu 3000 Zeichen).'),
  ]),
  createFeedback,
);

module.exports = router;
