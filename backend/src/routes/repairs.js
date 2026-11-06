const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const { authenticate } = require('../middlewares/auth');
const { hasPermission, authorize, ROLES } = require('../middlewares/roles');
const { uploadSingle } = require('../middlewares/upload');
const { uploadLimiter } = require('../middlewares/rateLimit');
const { validate, validators, body } = require('../middlewares/validate');

// ──────────────────────────────────────────────
// REPAIRS
// ──────────────────────────────────────────────

// GET /api/repairs - User's repairs (authenticated)
router.get(
  '/',
  authenticate,
  repairController.getUserRepairs
);

// GET /api/repairs/all - All repairs across all users (admin/service_manager only)
router.get(
  '/all',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.BIKE_MANAGER, ROLES.CLEANING_MANAGER, ROLES.MOTOR_MANAGER, ROLES.ROBBY_MANAGER, ROLES.SALES_MANAGER),
  repairController.getAllRepairs
);

// GET /api/repairs/outreach - Staff: Taifun orders without an app account, for
// phone outreach. Placed before /:id so "outreach" isn't captured as an id.
router.get(
  '/outreach',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.BIKE_MANAGER, ROLES.CLEANING_MANAGER, ROLES.MOTOR_MANAGER, ROLES.ROBBY_MANAGER, ROLES.SALES_MANAGER),
  repairController.getOutreach
);

// PATCH /api/repairs/outreach/:kdNr/reached - Staff: toggle "reached" for a customer
router.patch(
  '/outreach/:kdNr/reached',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.BIKE_MANAGER, ROLES.CLEANING_MANAGER, ROLES.MOTOR_MANAGER, ROLES.ROBBY_MANAGER, ROLES.SALES_MANAGER),
  repairController.markOutreachReached
);

// Kostenvoranschläge for the PC tool (before /:id so "kva" isn't taken as an id)
const KVA_STAFF = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER];
router.get('/kva', authenticate, authorize(...KVA_STAFF), repairController.listKva);
router.patch('/kva/:nr/contacted', authenticate, authorize(...KVA_STAFF), repairController.setKvaContacted);
router.post(
  '/kva/:nr/message',
  authenticate,
  authorize(...KVA_STAFF),
  validate([body('text').isString().trim().notEmpty().isLength({ max: 1500 })]),
  repairController.sendKvaMessage
);

// POST /api/repairs - Request new repair (authenticated)
router.post(
  '/',
  authenticate,
  uploadLimiter,
  uploadSingle('devicePhoto'),
  validate([
    body('deviceName')
      .notEmpty()
      .withMessage('Device name is required')
      .isLength({ max: 200 })
      .withMessage('Device name cannot exceed 200 characters'),
    body('deviceDescription')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Device description cannot exceed 2000 characters'),
    body('problemDescription')
      .notEmpty()
      .withMessage('Problem description is required')
      .isLength({ max: 5000 })
      .withMessage('Problem description cannot exceed 5000 characters'),
    body('warrantyStatus')
      .optional()
      .isString()
      .withMessage('Warranty status must be a string'),
  ]),
  repairController.createRepair
);

// GET /api/repairs/:id - Repair detail with full status history
router.get(
  '/:id',
  authenticate,
  validate([validators.uuid('id')]),
  repairController.getRepairById
);

// GET /api/repairs/:id/status - Current status only (lightweight for polling)
router.get(
  '/:id/status',
  authenticate,
  validate([validators.uuid('id')]),
  repairController.getRepairStatus
);

// PUT /api/repairs/:id/status - Update repair status (admin/service_manager)
router.put(
  '/:id/status',
  authenticate,
  hasPermission('service'),
  validate([
    validators.uuid('id'),
    body('status')
      .isIn(['in_repair', 'quote_created', 'parts_ordered', 'repair_done', 'ready'])
      .withMessage('Invalid repair status'),
    body('note')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Note cannot exceed 1000 characters'),
    body('estimatedCompletion')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for estimated completion'),
    body('cost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cost must be a positive number'),
    body('technicianId')
      .optional()
      .isUUID()
      .withMessage('Invalid technician ID'),
  ]),
  repairController.updateRepairStatus
);

// GET /api/repairs/:id/invoice - Get invoice URL (only if completed)
router.get(
  '/:id/invoice',
  authenticate,
  validate([validators.uuid('id')]),
  repairController.getRepairInvoice
);

// POST /api/repairs/:id/review - Rate completed repair (authenticated, only once)
router.post(
  '/:id/review',
  authenticate,
  validate([
    validators.uuid('id'),
    body('overallRating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Overall rating must be between 1 and 5'),
    body('qualityRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Quality rating must be between 1 and 5'),
    body('friendlinessRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Friendliness rating must be between 1 and 5'),
    body('waitTimeRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Wait time rating must be between 1 and 5'),
    body('valueRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Value rating must be between 1 and 5'),
    body('text')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Review text cannot exceed 5000 characters'),
  ]),
  repairController.reviewRepair
);

// POST /api/repairs/:id/acknowledge - Customer acknowledges ready repair
router.post(
  '/:id/acknowledge',
  authenticate,
  validate([validators.uuid('id')]),
  repairController.acknowledgeRepair
);

// POST /api/repairs/:id/quote-response - Customer answers the cost estimate
router.post(
  '/:id/quote-response',
  authenticate,
  validate([validators.uuid('id'), body('decision').isIn(['accepted', 'declined', 'call'])]),
  repairController.respondToQuote
);

module.exports = router;
