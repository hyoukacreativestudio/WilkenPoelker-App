const { OpeningHour, Holiday } = require('../models');
const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { getCurrentOpeningStatus, getWeekSchedule, getSeason } = require('../utils/openingHours');
const logger = require('../utils/logger');

/**
 * GET /api/settings/opening-hours
 * Get current opening hours based on season.
 */
const getOpeningHours = asyncHandler(async (req, res) => {
  const now = new Date();
  const season = getSeason(now);

  const schedule = await getWeekSchedule(season);

  res.json({
    success: true,
    data: {
      season,
      schedule,
    },
  });
});

/**
 * GET /api/settings/opening-hours/status
 * Get current open/closed status with next open time.
 */
const getOpeningStatus = asyncHandler(async (req, res) => {
  const status = await getCurrentOpeningStatus(new Date());

  res.json({
    success: true,
    data: status,
  });
});

/**
 * GET /api/settings/holidays
 * List all holidays.
 */
const getHolidays = asyncHandler(async (req, res) => {
  const holidays = await Holiday.findAll({
    order: [['date', 'ASC']],
  });

  res.json({
    success: true,
    data: holidays,
  });
});

/**
 * PUT /api/settings/opening-hours
 * Update opening hours (admin).
 * Body: { season, dayOfWeek, isClosed, periods: [{ open, close }] }
 */
const updateOpeningHours = asyncHandler(async (req, res) => {
  const { season, dayOfWeek, isClosed, periods } = req.body;

  // Validate season
  if (!['standard', 'winter'].includes(season)) {
    throw new AppError('Season muss standard oder winter sein', 400, 'INVALID_SEASON');
  }

  // Validate dayOfWeek
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new AppError('dayOfWeek muss zwischen 0 und 6 liegen', 400, 'INVALID_DAY');
  }

  // Validate periods format
  if (!isClosed && periods) {
    for (const period of periods) {
      if (!period.open || !period.close) {
        throw new AppError('Jede Periode muss open und close enthalten', 400, 'INVALID_PERIOD');
      }
      if (!/^\d{2}:\d{2}$/.test(period.open) || !/^\d{2}:\d{2}$/.test(period.close)) {
        throw new AppError('Zeiten muessen im Format HH:MM sein', 400, 'INVALID_TIME_FORMAT');
      }
    }
  }

  const [record, created] = await OpeningHour.findOrCreate({
    where: { dayOfWeek, season },
    defaults: {
      isClosed: isClosed || false,
      periods: isClosed ? [] : (periods || []),
    },
  });

  if (!created) {
    record.isClosed = isClosed || false;
    record.periods = isClosed ? [] : (periods || []);
    await record.save();
  }

  logger.info('Opening hours updated', { season, dayOfWeek, isClosed });

  res.json({
    success: true,
    message: 'Oeffnungszeiten erfolgreich aktualisiert',
    data: record,
  });
});

/**
 * POST /api/settings/holidays
 * Add a holiday (admin).
 */
const addHoliday = asyncHandler(async (req, res) => {
  const { date, name, isClosed, specialHours, isRecurring } = req.body;

  // Check for duplicate
  const existing = await Holiday.findOne({ where: { date } });
  if (existing) {
    throw new AppError('Fuer dieses Datum existiert bereits ein Feiertag', 409, 'DUPLICATE_HOLIDAY');
  }

  const holiday = await Holiday.create({
    date,
    name,
    isClosed: isClosed !== undefined ? isClosed : true,
    specialHours: specialHours || null,
    isRecurring: isRecurring || false,
  });

  logger.info('Holiday added', { holidayId: holiday.id, date, name });

  res.status(201).json({
    success: true,
    message: 'Feiertag erfolgreich hinzugefuegt',
    data: holiday,
  });
});

/**
 * DELETE /api/settings/holidays/:id
 * Remove a holiday (admin).
 */
const removeHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findByPk(req.params.id);

  if (!holiday) {
    throw new NotFoundError('Holiday');
  }

  await holiday.destroy();

  logger.info('Holiday removed', { holidayId: req.params.id });

  res.json({
    success: true,
    message: 'Feiertag erfolgreich entfernt',
  });
});

module.exports = {
  getOpeningHours,
  getOpeningStatus,
  getHolidays,
  updateOpeningHours,
  addHoliday,
  removeHoliday,
};
