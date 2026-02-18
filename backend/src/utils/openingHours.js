const { OpeningHour, Holiday } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');

// Default opening hours when database has no entries
const DEFAULT_HOURS = {
  standard: {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    0: { isClosed: true, periods: [] },
    1: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    2: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    3: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    4: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    5: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    6: { isClosed: false, periods: [{ open: '09:00', close: '13:00' }] },
  },
  winter: {
    0: { isClosed: true, periods: [] },
    1: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    2: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    3: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    4: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    5: { isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    6: { isClosed: false, periods: [{ open: '09:00', close: '13:00' }] },
  },
};

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/**
 * Determine the current season based on date.
 * Winter: 1. November through 1. February (inclusive)
 * Standard: 2. February through 31. October
 */
function getSeason(date) {
  const month = date.getMonth() + 1; // 1-based
  const day = date.getDate();
  // November and December are always winter
  if (month >= 11) return 'winter';
  // January is always winter
  if (month === 1) return 'winter';
  // 1. February is still winter
  if (month === 2 && day === 1) return 'winter';
  // Everything else is standard
  return 'standard';
}

/**
 * Convert a date to Europe/Berlin timezone and return components.
 */
function toBerlinTime(date) {
  const berlinStr = date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
  const berlin = new Date(berlinStr);
  return {
    date: berlin,
    dayOfWeek: berlin.getDay(),
    hours: berlin.getHours(),
    minutes: berlin.getMinutes(),
    dateOnly: `${berlin.getFullYear()}-${String(berlin.getMonth() + 1).padStart(2, '0')}-${String(berlin.getDate()).padStart(2, '0')}`,
  };
}

/**
 * Parse a time string "HH:MM" into total minutes since midnight.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get the opening hours for a specific day, checking DB first then fallback to defaults.
 */
async function getDayHours(dayOfWeek, season) {
  try {
    const dbHours = await OpeningHour.findOne({
      where: { dayOfWeek, season },
    });

    if (dbHours) {
      return {
        isClosed: dbHours.isClosed,
        periods: dbHours.periods || [],
      };
    }
  } catch (err) {
    logger.warn('Failed to fetch opening hours from DB, using defaults', { error: err.message });
  }

  return DEFAULT_HOURS[season]?.[dayOfWeek] || { isClosed: true, periods: [] };
}

/**
 * Check if a specific date is a holiday.
 */
async function checkHoliday(dateOnly) {
  try {
    const holiday = await Holiday.findOne({
      where: {
        [Op.or]: [
          { date: dateOnly },
          {
            isRecurring: true,
            date: {
              [Op.like]: `%-${dateOnly.slice(5)}`,
            },
          },
        ],
      },
    });

    return holiday;
  } catch (err) {
    logger.warn('Failed to check holiday from DB', { error: err.message });
    return null;
  }
}

/**
 * Get current opening status for a given date.
 *
 * @param {Date} date - The date/time to check (default: now)
 * @returns {Object} { isOpen, currentPeriod, nextOpen, todayHours, season, holiday }
 */
async function getCurrentOpeningStatus(date = new Date()) {
  const berlin = toBerlinTime(date);
  const season = getSeason(berlin.date);
  const currentMinutes = berlin.hours * 60 + berlin.minutes;

  // Check if today is a holiday
  const holiday = await checkHoliday(berlin.dateOnly);

  let todayHours;
  let isHoliday = false;

  if (holiday) {
    isHoliday = true;
    if (holiday.isClosed) {
      todayHours = { isClosed: true, periods: [] };
    } else if (holiday.specialHours) {
      todayHours = { isClosed: false, periods: holiday.specialHours };
    } else {
      todayHours = { isClosed: true, periods: [] };
    }
  } else {
    todayHours = await getDayHours(berlin.dayOfWeek, season);
  }

  let isOpen = false;
  let currentPeriod = null;

  if (!todayHours.isClosed && todayHours.periods) {
    for (const period of todayHours.periods) {
      const openMin = timeToMinutes(period.open);
      const closeMin = timeToMinutes(period.close);

      if (currentMinutes >= openMin && currentMinutes < closeMin) {
        isOpen = true;
        currentPeriod = { open: period.open, close: period.close };
        break;
      }
    }
  }

  // Calculate next open time
  const nextOpen = await findNextOpenTime(berlin, season, todayHours, currentMinutes);

  return {
    isOpen,
    currentPeriod,
    nextOpen,
    todayHours: {
      dayName: DAY_NAMES[berlin.dayOfWeek],
      isClosed: todayHours.isClosed,
      periods: todayHours.periods || [],
      isHoliday,
      holidayName: holiday ? holiday.name : null,
    },
    season,
  };
}

/**
 * Find the next opening time from the current moment.
 */
async function findNextOpenTime(berlin, season, todayHours, currentMinutes) {
  // Check if there is a later period today
  if (!todayHours.isClosed && todayHours.periods) {
    for (const period of todayHours.periods) {
      const openMin = timeToMinutes(period.open);
      if (openMin > currentMinutes) {
        return {
          date: berlin.dateOnly,
          dayName: DAY_NAMES[berlin.dayOfWeek],
          time: period.open,
        };
      }
    }
  }

  // Check subsequent days (up to 7 days ahead)
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(berlin.date);
    nextDate.setDate(nextDate.getDate() + i);
    const nextBerlin = toBerlinTime(nextDate);
    const nextSeason = getSeason(nextBerlin.date);

    // Check if next day is a holiday
    const nextHoliday = await checkHoliday(nextBerlin.dateOnly);
    let nextDayHours;

    if (nextHoliday) {
      if (nextHoliday.isClosed) {
        continue;
      }
      nextDayHours = { isClosed: false, periods: nextHoliday.specialHours || [] };
    } else {
      nextDayHours = await getDayHours(nextBerlin.dayOfWeek, nextSeason);
    }

    if (!nextDayHours.isClosed && nextDayHours.periods && nextDayHours.periods.length > 0) {
      return {
        date: nextBerlin.dateOnly,
        dayName: DAY_NAMES[nextBerlin.dayOfWeek],
        time: nextDayHours.periods[0].open,
      };
    }
  }

  return null;
}

/**
 * Get the full week schedule for a given season.
 */
async function getWeekSchedule(season) {
  const schedule = [];

  for (let day = 0; day <= 6; day++) {
    const hours = await getDayHours(day, season);
    schedule.push({
      dayOfWeek: day,
      dayName: DAY_NAMES[day],
      isClosed: hours.isClosed,
      periods: hours.periods || [],
    });
  }

  return schedule;
}

/**
 * Validate whether a given date and time fall within opening hours.
 * Used for appointment booking validation.
 */
async function isWithinOpeningHours(dateStr, timeStr) {
  // Extract date-only part (handles both "2026-02-23" and full ISO strings)
  const datePart = typeof dateStr === 'string' ? dateStr.substring(0, 10) : dateStr;
  const date = new Date(`${datePart}T12:00:00`);
  const berlin = toBerlinTime(date);
  const season = getSeason(berlin.date);
  const targetMinutes = timeToMinutes(timeStr);

  // Check holiday
  const holiday = await checkHoliday(datePart);
  if (holiday && holiday.isClosed) {
    return { valid: false, reason: `Geschlossen wegen Feiertag: ${holiday.name}` };
  }

  let dayHours;
  if (holiday && !holiday.isClosed && holiday.specialHours) {
    dayHours = { isClosed: false, periods: holiday.specialHours };
  } else if (holiday) {
    return { valid: false, reason: `Geschlossen wegen Feiertag: ${holiday.name}` };
  } else {
    dayHours = await getDayHours(berlin.dayOfWeek, season);
  }

  if (dayHours.isClosed) {
    return { valid: false, reason: `${DAY_NAMES[berlin.dayOfWeek]} ist geschlossen` };
  }

  for (const period of dayHours.periods) {
    const openMin = timeToMinutes(period.open);
    const closeMin = timeToMinutes(period.close);

    if (targetMinutes >= openMin && targetMinutes < closeMin) {
      return { valid: true };
    }
  }

  const periodsStr = dayHours.periods.map(p => `${p.open}-${p.close}`).join(', ');
  return {
    valid: false,
    reason: `Uhrzeit liegt ausserhalb der Oeffnungszeiten (${periodsStr})`,
  };
}

/**
 * Check if a date is a weekday (Mon-Fri).
 */
function isWeekday(dateStr) {
  // Extract date-only part (handles both "2026-02-23" and full ISO strings)
  const datePart = typeof dateStr === 'string' ? dateStr.substring(0, 10) : dateStr;
  const date = new Date(`${datePart}T12:00:00`);
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

module.exports = {
  getCurrentOpeningStatus,
  getWeekSchedule,
  isWithinOpeningHours,
  isWeekday,
  getSeason,
  DAY_NAMES,
  DEFAULT_HOURS,
};
