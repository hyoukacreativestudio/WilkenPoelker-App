const { OpeningHour, Holiday } = require('../models');
const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { getCurrentOpeningStatus, getWeekSchedule, getSeason, getUpcomingClosedDays } = require('../utils/openingHours');
const logger = require('../utils/logger');

/**
 * GET /api/settings/opening-hours
 * Get current opening hours based on season.
 */
const getOpeningHours = asyncHandler(async (req, res) => {
  const now = new Date();
  // ?season=standard|winter: the website shows both (summer and winter hours)
  const season = ['standard', 'winter'].includes(req.query.season) ? req.query.season : getSeason(now);

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
 * GET /api/settings/closed-days
 * Upcoming closed days for the website (public). What the staff adds in the app
 * under "Geschlossene Tage" shows up on wilpo.net by itself.
 */
const getClosedDays = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: { days: await getUpcomingClosedDays() } });
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

  // Validate dayOfWeek (0 = Sunday ... 6)
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new AppError('dayOfWeek muss zwischen 0 und 6 liegen', 400, 'INVALID_DAY');
  }

  // Validate periods: HH:MM, each ends after it starts, in order without overlap
  if (periods !== undefined && periods !== null && (!Array.isArray(periods) || periods.length > 4)) {
    throw new AppError('Höchstens 4 Zeiten pro Tag', 400, 'INVALID_PERIOD');
  }
  if (!isClosed && periods) {
    const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
    let last = '';
    for (const period of periods) {
      if (!period || !period.open || !period.close) {
        throw new AppError('Jede Periode muss open und close enthalten', 400, 'INVALID_PERIOD');
      }
      if (!TIME.test(period.open) || !TIME.test(period.close)) {
        throw new AppError('Zeiten müssen im Format HH:MM sein', 400, 'INVALID_TIME_FORMAT');
      }
      if (period.close <= period.open || period.open < last) {
        throw new AppError('Jede Zeit muss nach dem Beginn enden, ohne Überschneidung', 400, 'INVALID_PERIOD_ORDER');
      }
      last = period.close;
    }
  }
  const clean = isClosed ? [] : (periods || []).map((p) => ({ open: p.open, close: p.close }));

  const [record, created] = await OpeningHour.findOrCreate({
    where: { dayOfWeek, season },
    defaults: {
      isClosed: isClosed || false,
      periods: clean,
    },
  });

  if (!created) {
    record.isClosed = isClosed || false;
    record.periods = clean;
    await record.save();
  }

  logger.info('Opening hours updated', { season, dayOfWeek, isClosed });
  // The website shows the hours and closed days too
  require('../services/websiteBuilder').schedule('Öffnungszeiten oder Schließtage geändert', 60 * 1000);

  res.json({
    success: true,
    message: 'Öffnungszeiten erfolgreich aktualisiert',
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
    throw new AppError('Für dieses Datum existiert bereits ein Feiertag', 409, 'DUPLICATE_HOLIDAY');
  }

  const holiday = await Holiday.create({
    date,
    name,
    isClosed: isClosed !== undefined ? isClosed : true,
    specialHours: specialHours || null,
    isRecurring: isRecurring || false,
  });

  logger.info('Holiday added', { holidayId: holiday.id, date, name });
  // The website shows the hours and closed days too
  require('../services/websiteBuilder').schedule('Öffnungszeiten oder Schließtage geändert', 60 * 1000);

  res.status(201).json({
    success: true,
    message: 'Feiertag erfolgreich hinzugefügt',
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
  // The website shows the hours and closed days too
  require('../services/websiteBuilder').schedule('Öffnungszeiten oder Schließtage geändert', 60 * 1000);

  res.json({
    success: true,
    message: 'Feiertag erfolgreich entfernt',
  });
});

module.exports = {
  getClosedDays,
  getOpeningHours,
  getOpeningStatus,
  getHolidays,
  updateOpeningHours,
  addHoliday,
  removeHoliday,
};
