const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/auth');
const { authorize, ROLES } = require('../middlewares/roles');
const { validate, validators, body, query } = require('../middlewares/validate');

const VALID_TYPES = ['service', 'pickup', 'delivery', 'inspection', 'consultation', 'other', 'repair', 'property_viewing'];
const VALID_STATUSES = ['pending', 'proposed', 'confirmed', 'cancelled', 'completed', 'rescheduled'];

// GET /api/appointments - user's appointments (paginated, filtered)
router.get(
  '/',
  authenticate,
  validate([
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
    query('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
    query('type').optional().isIn(VALID_TYPES).withMessage('Invalid type'),
    ...validators.pagination,
  ]),
  appointmentController.getAppointments
);

// POST /api/appointments - create appointment request
router.post(
  '/',
  authenticate,
  validate([
    body('title').notEmpty().withMessage('Titel ist erforderlich').trim(),
    body('description').optional().trim(),
    body('type').isIn(VALID_TYPES).withMessage('Ungueltiger Termintyp'),
    body('date').optional().isISO8601().withMessage('Ungueltiges Datum'),
    body('startTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Startzeit im Format HH:MM erforderlich'),
    body('endTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Endzeit im Format HH:MM erforderlich'),
    body('ticketId').optional().isUUID().withMessage('Ungueltige Ticket-ID'),
  ]),
  appointmentController.createAppointment
);

// GET /api/appointments/requests - staff: all appointment requests (role-filtered)
router.get(
  '/requests',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.ROBBY_MANAGER),
  validate([
    query('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
    query('type').optional().isIn(VALID_TYPES).withMessage('Invalid type'),
    ...validators.pagination,
  ]),
  appointmentController.getAppointmentRequests
);

// GET /api/appointments/ongoing - staff: confirmed appointments (role-filtered)
router.get(
  '/ongoing',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.ROBBY_MANAGER),
  validate([
    query('type').optional().isIn(VALID_TYPES).withMessage('Invalid type'),
    ...validators.pagination,
  ]),
  appointmentController.getOngoingAppointments
);

// GET /api/appointments/unregistered - staff: confirmed but not yet registered appointments
router.get(
  '/unregistered',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.ROBBY_MANAGER),
  validate([
    query('type').optional().isIn(VALID_TYPES).withMessage('Invalid type'),
    ...validators.pagination,
  ]),
  appointmentController.getUnregisteredAppointments
);

// GET /api/appointments/:id - appointment detail
router.get(
  '/:id',
  authenticate,
  validate([validators.uuid()]),
  appointmentController.getAppointmentById
);

// PUT /api/appointments/:id - reschedule (own appointment)
router.put(
  '/:id',
  authenticate,
  validate([
    validators.uuid(),
    body('date').isISO8601().withMessage('Ungueltiges Datum'),
    body('startTime').matches(/^\d{2}:\d{2}$/).withMessage('Startzeit im Format HH:MM erforderlich'),
    body('endTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Endzeit im Format HH:MM erforderlich'),
    body('title').optional().trim(),
    body('description').optional().trim(),
  ]),
  appointmentController.rescheduleAppointment
);

// DELETE /api/appointments/:id - cancel appointment
router.delete(
  '/:id',
  authenticate,
  validate([
    validators.uuid(),
    body('cancelReason').optional().trim(),
  ]),
  appointmentController.cancelAppointment
);

// POST /api/appointments/:id/confirm - confirm (admin/service_manager/robby_manager)
router.post(
  '/:id/confirm',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.ROBBY_MANAGER),
  validate([validators.uuid()]),
  appointmentController.confirmAppointment
);

// POST /api/appointments/:id/propose - staff proposes date + free text
router.post(
  '/:id/propose',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.ROBBY_MANAGER),
  validate([
    validators.uuid(),
    body('date').isISO8601().withMessage('Ungueltiges Datum'),
    body('proposedText').notEmpty().withMessage('Terminvorschlag-Text ist erforderlich').trim(),
  ]),
  appointmentController.proposeTime
);

// POST /api/appointments/:id/respond - customer accepts or declines proposal
router.post(
  '/:id/respond',
  authenticate,
  validate([
    validators.uuid(),
    body('accept').isBoolean().withMessage('accept muss true oder false sein'),
    body('message').optional().trim(),
  ]),
  appointmentController.respondToProposal
);

// POST /api/appointments/:id/register - staff marks appointment as registered
router.post(
  '/:id/register',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.ROBBY_MANAGER),
  validate([validators.uuid()]),
  appointmentController.registerAppointment
);

// POST /api/appointments/:id/question - staff asks follow-up question
router.post(
  '/:id/question',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SERVICE_MANAGER, ROLES.ROBBY_MANAGER),
  validate([
    validators.uuid(),
    body('question').notEmpty().withMessage('Rueckfrage ist erforderlich').trim(),
  ]),
  appointmentController.askQuestion
);

// POST /api/appointments/:id/answer - customer answers staff question
router.post(
  '/:id/answer',
  authenticate,
  validate([
    validators.uuid(),
    body('answer').notEmpty().withMessage('Antwort ist erforderlich').trim(),
  ]),
  appointmentController.answerQuestion
);

// GET /api/appointments/:id/ical - download iCal file
router.get(
  '/:id/ical',
  authenticate,
  validate([validators.uuid()]),
  appointmentController.getICalFile
);

module.exports = router;
