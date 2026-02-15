const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middlewares/auth');
const { validate, validators, body } = require('../middlewares/validate');
const { aiLimiter } = require('../middlewares/rateLimit');
const { uploadMultiple } = require('../middlewares/upload');

// POST /api/ai/chat - send message to AI (with optional image attachments)
router.post(
  '/chat',
  authenticate,
  aiLimiter,
  uploadMultiple('images', 3),
  validate([
    body('category')
      .isIn(['bike', 'cleaning', 'motor', 'general'])
      .withMessage('Kategorie muss bike, cleaning, motor oder general sein'),
    body('message')
      .notEmpty()
      .withMessage('Nachricht darf nicht leer sein')
      .isLength({ max: 2000 })
      .withMessage('Nachricht darf maximal 2000 Zeichen lang sein')
      .trim(),
    body('sessionId').optional().isUUID().withMessage('Ungueltige Session-ID'),
  ]),
  aiController.chat
);

// GET /api/ai/sessions - user's AI sessions
router.get(
  '/sessions',
  authenticate,
  aiController.getSessions
);

// GET /api/ai/sessions/:id - session detail
router.get(
  '/sessions/:id',
  authenticate,
  validate([validators.uuid()]),
  aiController.getSessionById
);

// POST /api/ai/sessions/:id/escalate - escalate to human
router.post(
  '/sessions/:id/escalate',
  authenticate,
  validate([validators.uuid()]),
  aiController.escalateSession
);

module.exports = router;
