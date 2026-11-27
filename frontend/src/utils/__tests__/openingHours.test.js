import { dayProblem, groupedRows, normalizeTime } from '../openingHours';

const day = (dayOfWeek, periods) => ({ dayOfWeek, isClosed: !periods, periods: periods || [] });
const week = [
  day(0, null),
  ...[1, 2, 3, 4, 5].map((d) => day(d, [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }])),
  day(6, [{ open: '09:00', close: '13:00' }]),
];
const label = (i) => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][i];

describe('opening hours helpers', () => {
  test('groups equal consecutive days, Monday first', () => {
    expect(groupedRows(week, label)).toEqual([
      { day: 'Mo – Fr', hours: '08:00–13:00 | 14:00–18:00' },
      { day: 'Sa', hours: '09:00–13:00' },
      { day: 'So', hours: null },
    ]);
  });

  test('a different day splits the group', () => {
    const w = week.map((d) => (d.dayOfWeek === 3 ? day(3, [{ open: '08:00', close: '12:00' }]) : d));
    expect(groupedRows(w, label).map((r) => r.day)).toEqual(['Mo – Di', 'Mi', 'Do – Fr', 'Sa', 'So']);
  });

  test('normalizes typed times', () => {
    expect(normalizeTime('8')).toBe('08:00');
    expect(normalizeTime('8.30')).toBe('08:30');
    expect(normalizeTime(' 14:00 ')).toBe('14:00');
    expect(normalizeTime('abc')).toBe('abc');
  });

  test('finds problems of a day', () => {
    expect(dayProblem(day(0, null))).toBeNull();
    expect(dayProblem({ dayOfWeek: 1, isClosed: false, periods: [] })).toBe('empty');
    expect(dayProblem(day(1, [{ open: '8:00', close: '13:00' }]))).toBe('format');
    expect(dayProblem(day(1, [{ open: '13:00', close: '08:00' }]))).toBe('order');
    expect(dayProblem(day(1, [{ open: '08:00', close: '13:00' }, { open: '12:00', close: '18:00' }]))).toBe('order');
    expect(dayProblem(week[1])).toBeNull();
  });
});
