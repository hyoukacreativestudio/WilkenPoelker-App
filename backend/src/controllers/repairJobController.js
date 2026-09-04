const { Op } = require('sequelize');
const { RepairJob, Appointment } = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');

// Bike-workshop mechanics ("Fahrradwerkstatt") — Service assigns repairs to them.
// Includes Toni (new). Keep in sync with the shop as people join/leave.
const BIKE_WORKSHOP = [
  'Patrick Bonn', 'Fabian Benker', 'Max Breiting', 'Mirco Tammen', 'Jan Lakeberg',
  'Manuela Scherzer-Brosch', 'Ivan Yusyumbeli', 'Sven Onken', 'Daniel Meister',
  'Dominik Przybilski', 'Sönke Haskamp', 'Toni', 'Mandy Rülander',
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// GET /desktop/repairjobs?date=YYYY-MM-DD (defaults to today).
// First rolls every unfinished job from a past day forward to today, then lists.
const listRepairJobs = asyncHandler(async (req, res) => {
  const today = todayISO();
  await RepairJob.update({ date: today }, { where: { done: false, date: { [Op.lt]: today } } });

  // Pull Fahrrad appointments (today AND future) into the board, once each
  // (deduped by id). Future ones already appear on their own day in advance.
  try {
    const appts = await Appointment.findAll({ where: { department: 'fahrrad', date: { [Op.gte]: today }, status: { [Op.ne]: 'cancelled' } } });
    for (const a of appts) {
      const exists = await RepairJob.findOne({ where: { sourceAppointmentId: a.id } });
      if (!exists) {
        await RepairJob.create({
          repairNumber: a.repairNumber || '',
          customerName: a.customerName || null,
          customerNumber: a.customerNumber || null,
          phone: a.phone || null,
          device: a.title || null,
          assignedTo: null,
          date: String(a.date).slice(0, 10),
          note: a.description || 'aus Termin',
          sourceAppointmentId: a.id,
        });
      } else {
        // Keep the appointment-derived fields in sync (e.g. a repair number added
        // to the appointment later). Board fields (assignedTo/done/warnNote) stay.
        const patch = {};
        const set = (f, v) => { if ((exists[f] || '') !== (v || '')) patch[f] = v || null; };
        set('repairNumber', a.repairNumber || '');
        set('customerName', a.customerName);
        set('customerNumber', a.customerNumber);
        set('phone', a.phone);
        set('device', a.title);
        set('date', String(a.date).slice(0, 10));
        if (Object.keys(patch).length) await exists.update(patch);
      }
    }
  } catch (e) { /* non-blocking */ }

  const date = String(req.query.date || today).slice(0, 10);
  const where = { date };
  if (req.query.assignedTo && req.query.assignedTo !== 'all') where.assignedTo = req.query.assignedTo;
  const jobs = await RepairJob.findAll({ where, order: [['done', 'ASC'], ['repairNumber', 'ASC']] });
  res.json({ success: true, data: { jobs, employees: BIKE_WORKSHOP, today } });
});

const createRepairJob = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.repairNumber || !String(b.repairNumber).trim()) throw new AppError('Rep-Nr. ist erforderlich', 400, 'NUMBER_REQUIRED');
  const job = await RepairJob.create({
    repairNumber: String(b.repairNumber).trim(),
    customerName: b.customerName || null,
    customerNumber: b.customerNumber || null,
    phone: b.phone || null,
    device: b.device || null,
    assignedTo: b.assignedTo || null,
    date: b.date || todayISO(),
    note: b.note || null,
    createdByHandle: b.handle || null,
  });
  res.status(201).json({ success: true, data: { job } });
});

const updateRepairJob = asyncHandler(async (req, res) => {
  const job = await RepairJob.findByPk(req.params.id);
  if (!job) throw new NotFoundError('RepairJob');
  const updates = {};
  for (const f of ['repairNumber', 'customerName', 'customerNumber', 'phone', 'device', 'assignedTo', 'date', 'warnNote', 'note']) {
    if (req.body[f] !== undefined) updates[f] = req.body[f] === '' && f === 'date' ? job.date : req.body[f];
  }
  if (req.body.done !== undefined) {
    updates.done = !!req.body.done;
    updates.doneAt = req.body.done ? new Date() : null;
  }
  await job.update(updates);
  // If this job came from an appointment, tick that appointment off too.
  if (req.body.done !== undefined && job.sourceAppointmentId) {
    try {
      await Appointment.update({ workDone: !!req.body.done }, { where: { id: job.sourceAppointmentId } });
    } catch (e) { /* non-blocking */ }
  }
  res.json({ success: true, data: { job } });
});

const deleteRepairJob = asyncHandler(async (req, res) => {
  const job = await RepairJob.findByPk(req.params.id);
  if (!job) throw new NotFoundError('RepairJob');
  await job.destroy();
  res.json({ success: true, data: { deleted: true } });
});

module.exports = { listRepairJobs, createRepairJob, updateRepairJob, deleteRepairJob, BIKE_WORKSHOP };
