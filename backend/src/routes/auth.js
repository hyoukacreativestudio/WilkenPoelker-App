const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { validate, validators, body } = require('../middlewares/validate');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middlewares/rateLimit');

// POST /api/auth/register
router.post(
  '/register',
  registerLimiter,
  validate([
    validators.username,
    validators.email,
    validators.password,
    validators.passwordConfirm,
    body('customerNumber').optional().matches(/^\d{4,}$/).withMessage('Customer number must contain at least 4 digits'),
    body('dsgvoAccepted').isBoolean().withMessage('DSGVO consent is required'),
  ]),
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  validate([
    body('email').notEmpty().withMessage('Email or last name is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('customerNumber').optional(),
  ]),
  authController.login
);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /api/auth/refresh-token
router.post(
  '/refresh-token',
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ]),
  authController.refreshToken
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate([validators.email]),
  authController.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate([
    body('token').notEmpty().withMessage('Reset token is required'),
    validators.password,
  ]),
  authController.resetPassword
);

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', authController.verifyEmail);

// POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  validate([validators.email]),
  authController.resendVerification
);

// DELETE /api/auth/delete-account (DSGVO Art. 17 - Right to be Forgotten)
router.delete(
  '/delete-account',
  authenticate,
  validate([body('password').notEmpty().withMessage('Password is required')]),
  authController.deleteAccount
);

module.exports = router;
