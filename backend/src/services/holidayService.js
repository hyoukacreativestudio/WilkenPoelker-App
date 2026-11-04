const { Holiday } = require('../models');
const logger = require('../utils/logger');

// Public holidays in Niedersachsen. They are entered by themselves for this year
// and the next, so app, appointments and website always know them. Staff can still
// change or delete them under "Geschlossene Tage".
const FIXED = [
  ['01-01', 'Neujahr'],
  ['05-01', 'Tag der Arbeit'],
  ['10-03', 'Tag der Deutschen Einheit'],
  ['10-31', 'Reformationstag'],
  ['12-25', '1. Weihnachtstag'],
  ['12-26', '2. Weihnachtstag'],
];
// Days after Easter Sunday
const MOVABLE = [
  [-2, 'Karfreitag'],
  [1, 'Ostermontag'],
  [39, 'Christi Himmelfahrt'],
  [50, 'Pfingstmontag'],
];
// Not public holidays, the shop just has its own hours: they stay as last year.
const CARRY_OVER = ['12-24', '12-31'];

// Anonymous Gregorian algorithm; returns "YYYY-MM-DD"
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function movableDates(year) {
  const easter = new Date(`${easterSunday(year)}T12:00:00Z`);
  return MOVABLE.map(([offset, name]) => {
    const d = new Date(easter);
    d.setUTCDate(d.getUTCDate() + offset);
    return { date: d.toISOString().slice(0, 10), name };
  });
}

// A year counts as done once one of its movable holidays exists, so a day the
// staff deleted on purpose does not come back.
async function ensureYear(year, existing) {
  const dates = new Map(existing.map((h) => [String(h.date).slice(0, 10), h]));
  const movable = movableDates(year);
  if (movable.some((m) => dates.has(m.date))) return 0;

  const recurring = new Set(existing.filter((h) => h.isRecurring).map((h) => String(h.date).slice(5, 10)));
  const rows = movable.map((m) => ({ ...m, isClosed: true, isRecurring: false }));
  for (const [day, name] of FIXED) {
    if (!recurring.has(day) && !dates.has(`${year}-${day}`)) {
      rows.push({ date: `${year}-${day}`, name, isClosed: true, isRecurring: true });
    }
  }
  for (const day of CARRY_OVER) {
    const before = dates.get(`${year - 1}-${day}`);
    if (before && !before.isRecurring && !dates.has(`${year}-${day}`)) {
      rows.push({ date: `${year}-${day}`, name: before.name, isClosed: before.isClosed, specialHours: before.specialHours, isRecurring: false });
    }
  }
  await Holiday.bulkCreate(rows);
  logger.info('Holidays added', { year, count: rows.length });
  return rows.length;
}

async function ensureHolidays(now = new Date()) {
  const year = Number(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin', year: 'numeric' }));
  let added = 0;
  for (const y of [year, year + 1]) {
    added += await ensureYear(y, await Holiday.findAll());
  }
  return added;
}

module.exports = { ensureHolidays, easterSunday, movableDates };
