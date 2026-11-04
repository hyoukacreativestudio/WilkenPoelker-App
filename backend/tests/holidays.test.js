jest.mock('../src/models', () => ({ Holiday: {} }));
const { easterSunday, movableDates } = require('../src/services/holidayService');

describe('holidays that move with Easter', () => {
  test('Easter Sunday', () => {
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    expect(easterSunday(2028)).toBe('2028-04-16');
    expect(easterSunday(2030)).toBe('2030-04-21');
  });

  test('2027 dates', () => {
    expect(movableDates(2027)).toEqual([
      { date: '2027-03-26', name: 'Karfreitag' },
      { date: '2027-03-29', name: 'Ostermontag' },
      { date: '2027-05-06', name: 'Christi Himmelfahrt' },
      { date: '2027-05-17', name: 'Pfingstmontag' },
    ]);
  });
});
