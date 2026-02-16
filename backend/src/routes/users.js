const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { authorize, isAdmin, isSuperAdmin, canPost, ROLES } = require('../middlewares/roles');
const { validate, validators, body, query, param } = require('../middlewares/validate');
const { uploadSingle } = require('../middlewares/upload');
const { uploadLimiter } = require('../middlewares/rateLimit');

// ──────────────────────────────────────────────
// Profile routes (authenticated user)
// ──────────────────────────────────────────────

// GET /api/users/profile
router.get('/profile', authenticate, userController.getProfile);

// PUT /api/users/profile
router.put(
  '/profile',
  authenticate,
  validate([
    body('firstName').optional().isString().trim().isLength({ max: 100 }).withMessage('First name must be at most 100 characters'),
    body('lastName').optional().isString().trim().isLength({ max: 100 }).withMessage('Last name must be at most 100 characters'),
    body('phone').optional().isString().trim().withMessage('Phone must be a string'),
    body('address').optional().isObject().withMessage('Address must be an object'),
  ]),
  userController.updateProfile
);

// PUT /api/users/avatar
router.put(
  '/avatar',
  authenticate,
  uploadLimiter,
  uploadSingle('avatar'),
  userController.updateAvatar
);

// GET /api/users/export (DSGVO Art. 15 - Data Export)
router.get('/export', authenticate, userController.exportMyData);

// PUT /api/users/password
router.put(
  '/password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[a-z]/)
      .withMessage('New password must contain a lowercase letter')
      .matches(/[A-Z]/)
      .withMessage('New password must contain an uppercase letter')
      .matches(/\d/)
      .withMessage('New password must contain a number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('New password must contain a special character'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ]),
  userController.changePassword
);

// ──────────────────────────────────────────────
// Admin routes
// ──────────────────────────────────────────────

// GET /api/users/admin/list
router.get(
  '/admin/list',
  authenticate,
  isAdmin,
  validate([
    ...validators.pagination,
    query('search').optional().isString().trim(),
    query('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role filter'),
  ]),
  userController.listUsers
);

// PUT /api/users/admin/:id/role
router.put(
  '/admin/:id/role',
  authenticate,
  isAdmin,
  validate([
    validators.uuid('id'),
    body('role').isIn(Object.values(ROLES)).withMessage('Invalid role'),
  ]),
  userController.changeUserRole
);

// PUT /api/users/admin/:id/permissions
router.put(
  '/admin/:id/permissions',
  authenticate,
  isAdmin,
  validate([
    validators.uuid('id'),
    body('permissions').isArray().withMessage('Permissions must be an array'),
  ]),
  userController.updatePermissions
);

// GET /api/users/admin/:id
router.get(
  '/admin/:id',
  authenticate,
  isAdmin,
  validate([validators.uuid('id')]),
  userController.getUserDetail
);

// PUT /api/users/admin/:id/deactivate
router.put(
  '/admin/:id/deactivate',
  authenticate,
  isAdmin,
  validate([validators.uuid('id')]),
  userController.deactivateUser
);

// GET /api/users/admin/audit-log
router.get(
  '/admin/audit-log',
  authenticate,
  isAdmin,
  validate([
    ...validators.pagination,
    query('action').optional().isString().trim(),
    query('userId').optional().isUUID().withMessage('Invalid userId format'),
  ]),
  userController.getAuditLog
);

module.exports = router;
