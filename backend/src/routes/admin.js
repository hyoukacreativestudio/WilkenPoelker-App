const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middlewares/auth');
const { isAdmin, isSuperAdmin, authorize } = require('../middlewares/roles');
const { validate, validators, body, query } = require('../middlewares/validate');

// All admin routes require authentication + admin role
router.use(authenticate);

// GET /api/admin/dashboard - dashboard stats
router.get('/dashboard', isAdmin, adminController.getDashboard);

// GET /api/admin/users - user list with filtering
router.get(
  '/users',
  isAdmin,
  validate([
    ...validators.pagination,
    query('search').optional().isString().trim(),
    query('role')
      .optional()
      .isIn(['super_admin', 'admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager', 'customer'])
      .withMessage('Ungueltige Rolle'),
    query('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status muss active oder inactive sein'),
  ]),
  adminController.getUsers
);

// GET /api/admin/audit-log - paginated audit log
router.get(
  '/audit-log',
  isAdmin,
  validate([
    ...validators.pagination,
    query('action').optional().isString().trim(),
    query('userId').optional().isUUID().withMessage('Ungueltige User-ID'),
    query('from').optional().isISO8601().withMessage('Ungueltiges Von-Datum'),
    query('to').optional().isISO8601().withMessage('Ungueltiges Bis-Datum'),
  ]),
  adminController.getAuditLog
);

// POST /api/admin/broadcast - send notification to users
router.post(
  '/broadcast',
  isAdmin,
  validate([
    body('title').notEmpty().withMessage('Titel ist erforderlich').trim(),
    body('message').notEmpty().withMessage('Nachricht ist erforderlich').trim(),
    body('type')
      .optional()
      .isIn(['repair_status', 'repair_ready', 'appointment_reminder', 'chat_message', 'feed_post', 'offer', 'system'])
      .withMessage('Ungueltiger Benachrichtigungstyp'),
    body('role')
      .optional()
      .isIn(['super_admin', 'admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager', 'robby_manager', 'customer'])
      .withMessage('Ungueltige Zielgruppe'),
    body('roles')
      .optional()
      .isArray()
      .withMessage('Rollen muss ein Array sein'),
    body('roles.*')
      .optional()
      .isIn(['super_admin', 'admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager', 'robby_manager', 'customer'])
      .withMessage('Ungueltige Rolle im Array'),
  ]),
  adminController.sendBroadcast
);

// PUT /api/admin/users/:id - update a user
router.put(
  '/users/:id',
  authorize('admin', 'super_admin', 'service_manager'),
  adminController.updateUser
);

// GET /api/admin/yearly-overview - yearly per-employee stats
router.get(
  '/yearly-overview',
  isAdmin,
  validate([
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2100 })
      .withMessage('Jahr muss zwischen 2020 und 2100 liegen'),
  ]),
  adminController.getYearlyOverview
);

// GET /api/admin/analytics - detailed analytics (super admin only)
router.get('/analytics', isSuperAdmin, adminController.getAnalytics);

// POST /api/admin/users/:id/message - send direct message to a user
router.post(
  '/users/:id/message',
  authorize('admin', 'super_admin', 'service_manager'),
  validate([
    body('title').notEmpty().withMessage('Titel ist erforderlich').trim(),
    body('message').notEmpty().withMessage('Nachricht ist erforderlich').trim(),
  ]),
  adminController.sendDirectMessage
);

module.exports = router;
