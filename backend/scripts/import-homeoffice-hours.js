// One-off import of the home-office hours from the PDF
// "Homeoffice_Stunden_Juni-August_2026_final.pdf" (Dominik, 01.06.–21.08.2026)
// into the hidden Stempeluhr tool.
//
// Idempotent: removes this person's entries in the range first, then re-inserts.
// Run:  node scripts/import-homeoffice-hours.js

const { Op } = require('sequelize');
const { sequelize } = require('../src/config/database');
const { TimeClock, VacationEntry } = require('../src/models');

const NAME = 'Dominik';
const DEPARTMENT = 'Neurad';
const RANGE = { from: '2026-06-01', to: '2026-08-21' };

// [date, hours, activity?] — one work session per day, starting 08:00.
const WORK = [
  ['2026-06-01', 2], ['2026-06-02', 8.5], ['2026-06-03', 9.5], ['2026-06-04', 8.5], ['2026-06-05', 8], ['2026-06-06', 7.5], ['2026-06-07', 9.5],
  ['2026-06-08', 5], ['2026-06-09', 6], ['2026-06-10', 6.5], ['2026-06-11', 5], ['2026-06-12', 7], ['2026-06-13', 7.5], ['2026-06-14', 6],
  ['2026-06-15', 5.5], ['2026-06-16', 8.5], ['2026-06-17', 8.5], ['2026-06-18', 10], ['2026-06-19', 9], ['2026-06-20', 6], ['2026-06-21', 6],
  ['2026-06-22', 8.5], ['2026-06-23', 8], ['2026-06-24', 9.5], ['2026-06-25', 8.5], ['2026-06-26', 9.5], ['2026-06-27', 8], ['2026-06-28', 6.5],
  ['2026-06-29', 9], ['2026-06-30', 9], ['2026-07-01', 3], ['2026-07-02', 9], ['2026-07-03', 10], ['2026-07-04', 7], ['2026-07-05', 9.5],
  ['2026-07-06', 8.5], ['2026-07-07', 9.5], ['2026-07-08', 9], ['2026-07-09', 9.5], ['2026-07-10', 4], ['2026-07-11', 8.5], ['2026-07-12', 9.5],
  ['2026-07-13', 3.5], ['2026-07-14', 3.5], ['2026-07-15', 2], ['2026-07-16', 9.5], ['2026-07-17', 10],
  ['2026-07-27', 2], ['2026-07-28', 3.5], ['2026-07-29', 3], ['2026-07-30', 3], ['2026-07-31', 2.5],
  ['2026-08-03', 3.5], ['2026-08-04', 4.5], ['2026-08-05', 6.5], ['2026-08-06', 6],
  ['2026-08-10', 1], ['2026-08-11', 5.5], ['2026-08-12', 6], ['2026-08-13', 5.5], ['2026-08-14', 5],
  ['2026-08-18', 4.5, 'Krankmeldung'], ['2026-08-19', 4.5], ['2026-08-20', 6], ['2026-08-21', 5.5],
];

// [start, end, type] — absences (0 h).
const ABSENCES = [
  ['2026-07-20', '2026-07-25', 'urlaub'],
  ['2026-08-07', '2026-08-09', 'urlaub'],
  ['2026-08-17', '2026-08-17', 'krank'],
];

async function run() {
  await sequelize.authenticate();
  await TimeClock.sync();
  await VacationEntry.sync();

  // Clear a previous import of this person in the range.
  await TimeClock.destroy({ where: { personName: NAME, clockIn: { [Op.gte]: new Date(`${RANGE.from}T00:00:00`), [Op.lte]: new Date(`${RANGE.to}T23:59:59`) } } });
  await VacationEntry.destroy({ where: { personName: NAME, startDate: { [Op.gte]: RANGE.from, [Op.lte]: RANGE.to } } });

  let total = 0;
  const punches = WORK.map(([date, hours, activity]) => {
    const clockIn = new Date(`${date}T08:00:00`);
    const clockOut = new Date(clockIn.getTime() + hours * 3600 * 1000);
    total += hours;
    return { personName: NAME, clockIn, clockOut, activity: activity || 'App-Entwicklung' };
  });
  await TimeClock.bulkCreate(punches);

  for (const [startDate, endDate, type] of ABSENCES) {
    await VacationEntry.create({ personName: NAME, department: DEPARTMENT, startDate, endDate, type, status: 'approved', note: 'PDF-Import' });
  }

  console.log(`Imported ${punches.length} work days (${total} h total) + ${ABSENCES.length} absences for ${NAME}.`);
  await sequelize.close();
}

run().catch((err) => { console.error('import-homeoffice-hours failed:', err.message); process.exit(1); });
