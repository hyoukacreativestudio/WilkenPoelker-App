// Opening hours as the server keeps them: per season ('standard' = summer,
// 'winter' = 01.11.–31.01.) one entry per weekday:
// { dayOfWeek: 0 (Sunday) … 6, isClosed, periods: [{ open: 'HH:MM', close: 'HH:MM' }] }

export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
// Monday first, as people read a week here
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// "8:00" or "8" -> "08:00"; anything else stays as typed (and fails TIME_RE)
export function normalizeTime(value) {
  const s = String(value || '').trim().replace('.', ':');
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(s);
  if (!m) return s;
  return `${m[1].padStart(2, '0')}:${m[2] || '00'}`;
}

// Problem of one day, or null: times in HH:MM, each period closes after it
// opens, periods in order without overlap
export function dayProblem(day) {
  if (day.isClosed) return null;
  if (!day.periods.length) return 'empty';
  let last = '';
  for (const p of day.periods) {
    if (!TIME_RE.test(p.open) || !TIME_RE.test(p.close)) return 'format';
    if (p.close <= p.open || p.open < last) return 'order';
    last = p.close;
  }
  return null;
}

// Rows for display: consecutive days with the same hours in one row
// ("Mo – Fr 08:00–13:00 | 14:00–18:00"). dayLabel(i) gives the short name.
export function groupedRows(schedule, dayLabel) {
  const byDay = new Map((schedule || []).map((d) => [d.dayOfWeek, d]));
  const text = (d) => (!d || d.isClosed || !(d.periods || []).length ? null : d.periods.map((p) => `${p.open}–${p.close}`).join(' | '));
  const rows = [];
  for (const i of WEEK_ORDER) {
    const hours = text(byDay.get(i));
    const prev = rows[rows.length - 1];
    if (prev && prev.hours === hours) prev.to = i;
    else rows.push({ from: i, to: i, hours });
  }
  return rows.map((r) => ({
    day: r.from === r.to ? dayLabel(r.from) : `${dayLabel(r.from)} – ${dayLabel(r.to)}`,
    hours: r.hours, // null = closed
  }));
}
