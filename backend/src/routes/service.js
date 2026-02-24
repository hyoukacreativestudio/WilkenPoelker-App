const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate } = require('../middlewares/auth');
const { hasPermission, isAdmin, authorize, ROLES } = require('../middlewares/roles');
const { uploadMultiple } = require('../middlewares/upload');
const { uploadLimiter } = require('../middlewares/rateLimit');
const { validate, validators, body } = require('../middlewares/validate');

// ──────────────────────────────────────────────
// TICKETS
// ──────────────────────────────────────────────

// POST /api/service/tickets - Create a new ticket (authenticated customer)
router.post(
  '/tickets',
  authenticate,
  uploadLimiter,
  uploadMultiple('attachments', 5),
  validate([
    body('title')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('type')
      .isIn(['inspection', 'repair', 'consultation', 'maintenance', 'bike_question', 'cleaning_question', 'motor_question', 'other'])
      .withMessage('Invalid ticket type'),
    body('category')
      .optional()
      .isIn(['service', 'bike', 'cleaning', 'motor'])
      .withMessage('Invalid category'),
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 5000 })
      .withMessage('Description cannot exceed 5000 characters'),
    body('urgency')
      .optional()
      .isIn(['normal', 'urgent'])
      .withMessage('Invalid urgency level'),
    body('appointmentDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid appointment date format'),
    body('alternativeDates')
      .optional()
      .isArray()
      .withMessage('Alternative dates must be an array'),
  ]),
  serviceController.createTicket
);

// GET /api/service/tickets - Get user's tickets (authenticated)
router.get(
  '/tickets',
  authenticate,
  serviceController.getUserTickets
);

// GET /api/service/tickets/all - Get all tickets (managers/admins)
router.get(
  '/tickets/all',
  authenticate,
  hasPermission('service'),
  serviceController.getAllTickets
);

// GET /api/service/tickets/admin - Get tickets for admin panel (category-filtered)
router.get(
  '/tickets/admin',
  authenticate,
  hasPermission('service', 'bike', 'cleaning', 'motor'),
  serviceController.getAdminTickets
);

// GET /api/service/tickets/active-chats - Get active chats for current user
router.get(
  '/tickets/active-chats',
  authenticate,
  serviceController.getActiveChats
);

// GET /api/service/staff/available - Get available staff for forwarding
router.get(
  '/staff/available',
  authenticate,
  hasPermission('service', 'bike', 'cleaning', 'motor'),
  serviceController.getAvailableStaff
);

// GET /api/service/customers/:id/tickets - Get all tickets for a customer (staff only)
router.get(
  '/customers/:id/tickets',
  authenticate,
  hasPermission('service', 'bike', 'cleaning', 'motor'),
  validate([validators.uuid('id')]),
  serviceController.getCustomerTickets
);

// GET /api/service/staff/:id/ratings - Get ratings for a staff member
router.get(
  '/staff/:id/ratings',
  authenticate,
  validate([validators.uuid('id')]),
  serviceController.getStaffRatings
);

// GET /api/service/tickets/:id - Get ticket detail
router.get(
  '/tickets/:id',
  authenticate,
  validate([validators.uuid('id')]),
  serviceController.getTicketById
);

// PUT /api/service/tickets/:id/status - Update ticket status (admin/manager)
router.put(
  '/tickets/:id/status',
  authenticate,
  hasPermission('service'),
  validate([
    validators.uuid('id'),
    body('status')
      .isIn(['open', 'in_progress', 'confirmed', 'completed', 'cancelled', 'closed'])
      .withMessage('Invalid status'),
  ]),
  serviceController.updateTicketStatus
);

// PUT /api/service/tickets/:id/assign - Assign ticket to staff (admin/manager)
router.put(
  '/tickets/:id/assign',
  authenticate,
  hasPermission('service'),
  validate([
    validators.uuid('id'),
    body('staffId').isUUID().withMessage('Invalid staff ID'),
  ]),
  serviceController.assignTicket
);

// PUT /api/service/tickets/:id/close - Close a ticket (staff only)
router.put(
  '/tickets/:id/close',
  authenticate,
  hasPermission('service', 'bike', 'cleaning', 'motor'),
  validate([validators.uuid('id')]),
  serviceController.closeTicket
);

// PUT /api/service/tickets/:id/forward - Forward ticket to another staff
router.put(
  '/tickets/:id/forward',
  authenticate,
  hasPermission('service', 'bike', 'cleaning', 'motor'),
  validate([
    validators.uuid('id'),
    body('targetStaffId').isUUID().withMessage('Invalid target staff ID'),
  ]),
  serviceController.forwardTicket
);

// POST /api/service/tickets/:id/rate - Rate a closed ticket
router.post(
  '/tickets/:id/rate',
  authenticate,
  validate([
    validators.uuid('id'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Comment cannot exceed 2000 characters'),
  ]),
  serviceController.rateTicket
);

// ──────────────────────────────────────────────
// CHAT
// ──────────────────────────────────────────────

// POST /api/service/tickets/:id/chat - Send chat message
router.post(
  '/tickets/:id/chat',
  authenticate,
  uploadLimiter,
  uploadMultiple('attachments', 5),
  validate([
    validators.uuid('id'),
    body('message')
      .optional({ values: 'falsy' })
      .isLength({ max: 5000 })
      .withMessage('Message cannot exceed 5000 characters'),
  ]),
  serviceController.sendChatMessage
);

// GET /api/service/tickets/:id/chat - Get chat messages
router.get(
  '/tickets/:id/chat',
  authenticate,
  validate([validators.uuid('id')]),
  serviceController.getChatMessages
);

// PUT /api/service/messages/:id - Edit message (owner only, within 5 min)
router.put(
  '/messages/:id',
  authenticate,
  validate([
    validators.uuid('id'),
    body('message')
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 5000 })
      .withMessage('Message cannot exceed 5000 characters'),
  ]),
  serviceController.editMessage
);

// DELETE /api/service/messages/:id - Delete message (owner only, within 5 min)
router.delete(
  '/messages/:id',
  authenticate,
  validate([validators.uuid('id')]),
  serviceController.deleteMessage
);

// ──────────────────────────────────────────────
// APPOINTMENTS
// ──────────────────────────────────────────────

// POST /api/service/tickets/:id/confirm-appointment - Confirm appointment date
router.post(
  '/tickets/:id/confirm-appointment',
  authenticate,
  validate([
    validators.uuid('id'),
    body('selectedDate')
      .isISO8601()
      .withMessage('A valid date must be selected'),
  ]),
  serviceController.confirmAppointment
);

module.exports = router;
