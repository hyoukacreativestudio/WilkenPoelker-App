const { Op } = require('sequelize');
const models = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const { resolveRoster } = require('../data/teamRoster');

const { TimeClock, VacationEntry, AboutContent } = models;

// ── Workforce roster (from the app's "Unser Team", + department overrides) ──
const listEmployees = asyncHandler(async (req, res) => {
  let teamContent = null;
  try {
    const row = await AboutContent.findOne({ where: { section: 'team', contentKey: 'departments' } });
    if (row && row.content) teamContent = { departments: row.content };
  } catch (e) { /* fall back to the embedded roster */ }
  const employees = resolveRoster(teamContent);
  const departments = [...new Set(employees.map((e) => e.department))].sort((a, b) => a.localeCompare(b));
  res.json({ success: true, data: { employees, departments } });
});

// ── Time clock (Stempeluhr) ──────────────────────────────────────────────
const clockStatus = asyncHandler(async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) throw new AppError('Name fehlt', 400, 'NAME_REQUIRED');
  const open = await TimeClock.findOne({ where: { personName: name, clockOut: null }, order: [['clockIn', 'DESC']] });
  res.json({ success: true, data: { running: !!open, entry: open } });
});

// Toggle: if a session is open → clock out; else clock in.
const punch = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new AppError('Name fehlt', 400, 'NAME_REQUIRED');
  const activity = (req.body.activity && String(req.body.activity).trim()) || 'App-Entwicklung';

  const open = await TimeClock.findOne({ where: { personName: name, clockOut: null }, order: [['clockIn', 'DESC']] });
  if (open) {
    await open.update({ clockOut: new Date() });
    return res.json({ success: true, data: { running: false, entry: open } });
  }
  const entry = await TimeClock.create({ personName: name, clockIn: new Date(), activity });
  res.status(201).json({ success: true, data: { running: true, entry } });
});

const listTimeClock = asyncHandler(async (req, res) => {
  const name = String(req.query.name || '').trim();
  const where = {};
  if (name) where.personName = name;
  if (req.query.from || req.query.to) {
    where.clockIn = {};
    if (req.query.from) where.clockIn[Op.gte] = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.clockIn[Op.lte] = new Date(`${req.query.to}T23:59:59`);
  }
  const entries = await TimeClock.findAll({ where, order: [['clockIn', 'ASC']] });
  const names = (await TimeClock.findAll({ attributes: ['personName'], group: ['personName'] })).map((r) => r.personName);
  res.json({ success: true, data: { entries, names } });
});

const deleteTimeClock = asyncHandler(async (req, res) => {
  const entry = await TimeClock.findByPk(req.params.id);
  if (!entry) throw new NotFoundError('TimeClock');
  await entry.destroy();
  res.json({ success: true, data: { deleted: true } });
});

// ── Vacation entries (Urlaub) ────────────────────────────────────────────
const listVacations = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.department && req.query.department !== 'all') where.department = req.query.department;
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status;
  if (req.query.from || req.query.to) {
    // overlap: entry.start <= to AND entry.end >= from
    if (req.query.to) where.startDate = { [Op.lte]: req.query.to };
    if (req.query.from) where.endDate = { [Op.gte]: req.query.from };
  }
  const entries = await VacationEntry.findAll({ where, order: [['startDate', 'ASC']] });
  res.json({ success: true, data: { entries } });
});

// Other people from the SAME department whose vacation overlaps the range.
async function findConflicts({ department, startDate, endDate, personName, excludeId }) {
  if (!department) return [];
  const where = {
    department,
    startDate: { [Op.lte]: endDate },
    endDate: { [Op.gte]: startDate },
    personName: { [Op.ne]: personName },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return VacationEntry.findAll({ where, order: [['startDate', 'ASC']] });
}

const createVacation = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.personName || !String(b.personName).trim()) throw new AppError('Name ist erforderlich', 400, 'NAME_REQUIRED');
  if (!b.startDate || !b.endDate) throw new AppError('Zeitraum ist erforderlich', 400, 'RANGE_REQUIRED');
  if (String(b.endDate) < String(b.startDate)) throw new AppError('Enddatum vor Startdatum', 400, 'BAD_RANGE');
  const personName = String(b.personName).trim();

  // Requests are created as "pending"; they only reach the calendar once approved.
  const entry = await VacationEntry.create({
    personName,
    department: b.department || null,
    startDate: b.startDate,
    endDate: b.endDate,
    type: b.type || 'urlaub',
    status: 'pending',
    note: b.note || null,
    createdByHandle: b.handle || null,
  });

  const conflicts = await findConflicts({ department: b.department, startDate: b.startDate, endDate: b.endDate, personName, excludeId: entry.id });
  res.status(201).json({ success: true, data: { entry, conflicts } });
});

// Approve a request → it now shows in the calendar.
const approveVacation = asyncHandler(async (req, res) => {
  const entry = await VacationEntry.findByPk(req.params.id);
  if (!entry) throw new NotFoundError('VacationEntry');
  await entry.update({ status: 'approved' });
  res.json({ success: true, data: { entry } });
});

const deleteVacation = asyncHandler(async (req, res) => {
  const entry = await VacationEntry.findByPk(req.params.id);
  if (!entry) throw new NotFoundError('VacationEntry');
  await entry.destroy();
  res.json({ success: true, data: { deleted: true } });
});

module.exports = {
  listEmployees,
  clockStatus, punch, listTimeClock, deleteTimeClock,
  listVacations, createVacation, approveVacation, deleteVacation,
};
