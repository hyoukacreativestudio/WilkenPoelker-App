const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roles');
const { validate, validators, body } = require('../middlewares/validate');

// GET /api/settings/opening-hours - current opening hours
router.get('/opening-hours', settingsController.getOpeningHours);

// GET /api/settings/opening-hours/status - current open/closed status
router.get('/opening-hours/status', settingsController.getOpeningStatus);

// GET /api/settings/holidays - list holidays
router.get('/holidays', settingsController.getHolidays);

// PUT /api/settings/opening-hours - update opening hours (admin)
router.put(
  '/opening-hours',
  authenticate,
  isAdmin,
  validate([
    body('season')
      .isIn(['standard', 'winter'])
      .withMessage('Season muss standard oder winter sein'),
    body('dayOfWeek')
      .isInt({ min: 0, max: 6 })
      .withMessage('dayOfWeek muss zwischen 0 und 6 liegen'),
    body('isClosed')
      .optional()
      .isBoolean()
      .withMessage('isClosed muss ein Boolean sein'),
    body('periods')
      .optional()
      .isArray()
      .withMessage('periods muss ein Array sein'),
  ]),
  settingsController.updateOpeningHours
);

// POST /api/settings/holidays - add holiday (admin)
router.post(
  '/holidays',
  authenticate,
  isAdmin,
  validate([
    body('date').isISO8601().withMessage('Ungueltiges Datum'),
    body('name').notEmpty().withMessage('Name ist erforderlich').trim(),
    body('isClosed').optional().isBoolean(),
    body('specialHours').optional().isArray(),
    body('isRecurring').optional().isBoolean(),
  ]),
  settingsController.addHoliday
);

// DELETE /api/settings/holidays/:id - remove holiday (admin)
router.delete(
  '/holidays/:id',
  authenticate,
  isAdmin,
  validate([validators.uuid()]),
  settingsController.removeHoliday
);

module.exports = router;
