const { Op } = require('sequelize');
const models = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');

const { TimeClock } = models;

// ── Time clock (Stempeluhr) ──────────────────────────────────────────────
const clockStatus = asyncHandler(async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) throw new AppError('Name fehlt', 400, 'NAME_REQUIRED');
  const open = await TimeClock.findOne({ where: { personName: name, clockOut: null }, order: [['clockIn', 'DESC']] });
  res.json({ success: true, data: { running: !!open, entry: open } });
});

// Everyone currently clocked in (open sessions) — shown atop the report.
const runningNow = asyncHandler(async (req, res) => {
  const entries = await TimeClock.findAll({ where: { clockOut: null }, order: [['clockIn', 'ASC']] });
  res.json({ success: true, data: { entries } });
});

// Toggle: if a session is open → clock out (optionally with a note); else clock in.
const punch = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new AppError('Name fehlt', 400, 'NAME_REQUIRED');
  const activity = (req.body.activity && String(req.body.activity).trim()) || 'App-Entwicklung';
  const note = req.body.note != null ? String(req.body.note).trim() : '';

  const open = await TimeClock.findOne({ where: { personName: name, clockOut: null }, order: [['clockIn', 'DESC']] });
  if (open) {
    await open.update({ clockOut: new Date(), note: note || open.note });
    return res.json({ success: true, data: { running: false, entry: open } });
  }
  const entry = await TimeClock.create({ personName: name, clockIn: new Date(), activity });
  res.status(201).json({ success: true, data: { running: true, entry } });
});

const listTimeClock = asyncHandler(async (req, res) => {
  // Auto-delete days that were checked off more than a week ago.
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  await TimeClock.destroy({ where: { doneAt: { [Op.ne]: null, [Op.lt]: weekAgo } } });

  const name = String(req.query.name || '').trim();
  const scope = req.query.scope || 'active'; // active | done | all
  const where = {};
  if (name) where.personName = name;
  if (scope === 'active') where.doneAt = null;
  else if (scope === 'done') where.doneAt = { [Op.ne]: null };
  if (req.query.from || req.query.to) {
    where.clockIn = {};
    if (req.query.from) where.clockIn[Op.gte] = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.clockIn[Op.lte] = new Date(`${req.query.to}T23:59:59`);
  }
  const entries = await TimeClock.findAll({ where, order: [['clockIn', 'ASC']] });
  const names = (await TimeClock.findAll({ attributes: ['personName'], group: ['personName'] })).map((r) => r.personName);
  res.json({ success: true, data: { entries, names } });
});

// Check off / restore a whole day (all of a person's sessions on that date).
const markDayDone = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const date = String(req.body.date || '').slice(0, 10);
  if (!name || !date) throw new AppError('Name und Datum erforderlich', 400, 'BAD_REQUEST');
  const from = new Date(`${date}T00:00:00`); const to = new Date(`${date}T23:59:59`);
  const [count] = await TimeClock.update(
    { doneAt: req.body.done === false ? null : new Date() },
    { where: { personName: name, clockIn: { [Op.gte]: from, [Op.lte]: to } } },
  );
  res.json({ success: true, data: { updated: count } });
});

const deleteTimeClock = asyncHandler(async (req, res) => {
  const entry = await TimeClock.findByPk(req.params.id);
  if (!entry) throw new NotFoundError('TimeClock');
  await entry.destroy();
  res.json({ success: true, data: { deleted: true } });
});

module.exports = {
  clockStatus, runningNow, punch, listTimeClock, markDayDone, deleteTimeClock,
};
