const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');
const models = require('../models');
const { Order, WarehouseItem, User, Appointment, Ticket, ChatMessage, RobbyCustomer } = models;
const serviceService = require('../services/serviceService');
const appointmentService = require('../services/appointmentService');

// ── Passwordless department login (desktop tool on trusted company PCs) ──
// Each department = one fixed account, linked by its stable username (NOT by a
// person's name or email). Clicking a department logs into that account WITHOUT
// a password. Only these staff roles are ever allowed — never a customer.
// Create the accounts with: node scripts/create-desktop-accounts.js
// Optionally hardened with a shared secret via env DESKTOP_LOGIN_SECRET.
const DEPT_ACCOUNTS = {
  admin:        { username: 'admin',        role: 'admin' },
  fahrrad:      { username: 'fahrrad',       role: 'bike_manager' },
  reinigung:    { username: 'reinigung',     role: 'cleaning_manager' },
  service:      { username: 'service',       role: 'service_manager' },
  rasenmaeher:  { username: 'rasenmaeher',   role: 'motor_manager' },
  robby:        { username: 'robby',         role: 'robby_manager' },
  motorgeraete: { username: 'motorgeraete',  role: 'motor_equipment_manager' },
  elektro:      { username: 'elektro',       role: 'ev_manager' },
  verkauf:      { username: 'verkauf',       role: 'sales_manager' },
  lieferungen:  { username: 'lieferungen',   role: 'delivery_manager' },
  bestellungen: { username: 'bestellungen',  role: 'orders_manager' },
  lager:        { username: 'lager',         role: 'warehouse_worker' },
};
const DESKTOP_ROLES = new Set([
  'admin', 'super_admin', 'bike_manager', 'cleaning_manager', 'motor_manager',
  'service_manager', 'robby_manager', 'sales_manager', 'orders_manager', 'warehouse_worker',
  'delivery_manager', 'motor_equipment_manager', 'ev_manager',
]);

const desktopLogin = asyncHandler(async (req, res) => {
  const secret = process.env.DESKTOP_LOGIN_SECRET;
  if (secret && req.body.secret !== secret) throw new AppError('Nicht erlaubt', 403, 'FORBIDDEN');

  const dept = DEPT_ACCOUNTS[req.body.department];
  if (!dept) throw new AppError('Unbekannte Abteilung', 400, 'UNKNOWN_DEPARTMENT');

  // The Admin account is password-protected.
  if (req.body.department === 'admin') {
    const adminPw = process.env.ADMIN_DESKTOP_PASSWORD || 'CPClemens0901*';
    if (String(req.body.password || '') !== adminPw) throw new AppError('Falsches Passwort', 401, 'ADMIN_PASSWORD');
  }

  const { fn, col, where } = require('sequelize');
  // Prefer the dedicated department account (by username); else the first
  // account holding that role.
  let user = await User.findOne({ where: where(fn('lower', col('username')), dept.username.toLowerCase()) });
  if (!user) user = await User.findOne({ where: { role: dept.role, isActive: true }, order: [['createdAt', 'ASC']] });
  if (!user) throw new AppError(`Kein Account für "${req.body.department}". Bitte anlegen: node scripts/create-desktop-accounts.js`, 404, 'NO_DEPARTMENT_ACCOUNT');
  if (!DESKTOP_ROLES.has(user.role)) throw new AppError('Dieser Account ist im PC-Programm nicht erlaubt', 403, 'ROLE_NOT_ALLOWED');
  if (user.isActive === false) throw new AppError('Account ist deaktiviert', 403, 'INACTIVE');

  const authService = require('../services/authService');
  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken(user);
  res.json({ success: true, data: { accessToken, refreshToken, user: authService.sanitizeUser(user) } });
});

// Map a user role to its department key (used to scope orders lists).
const ROLE_DEPARTMENT = {
  bike_manager: 'fahrrad',
  cleaning_manager: 'reinigung',
  motor_manager: 'rasenmaeher',
  service_manager: 'service',
  robby_manager: 'robby',
  motor_equipment_manager: 'motorgeraete',
  ev_manager: 'elektro',
  sales_manager: 'verkauf',
  delivery_manager: 'lieferungen',
};
// Roles that see, edit AND tick off orders across ALL departments — Service
// acts exactly like the Bestellungen account here.
const SEE_ALL_ROLES = ['admin', 'super_admin', 'orders_manager', 'service_manager'];
const ORDER_CHECKOFF_ROLES = ['admin', 'super_admin', 'orders_manager', 'service_manager'];

function departmentForRole(role) {
  return ROLE_DEPARTMENT[role] || null;
}
function creatorName(user) {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Mitarbeiter';
}

// ── Bestellungen (Orders) ─────────────────────────────────────────────

const listOrders = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  // Filter by source, case-insensitive ("amazon" == "Amazon").
  if (req.query.source && req.query.source !== 'all') {
    const { fn, col, where: whereFn } = require('sequelize');
    where[Op.and] = [whereFn(fn('lower', col('source_text')), String(req.query.source).toLowerCase())];
  }

  // orders_manager / admin / service see every department; others only their own.
  if (SEE_ALL_ROLES.includes(req.user.role)) {
    if (req.query.department && req.query.department !== 'all') where.department = req.query.department;
  } else {
    where.department = departmentForRole(req.user.role) || '__none__';
  }

  // Problems first (red, on top), then open before done, newest first.
  const orders = await Order.findAll({
    where,
    order: [
      [require('sequelize').literal('CASE WHEN "problem_note" IS NOT NULL THEN 0 ELSE 1 END'), 'ASC'],
      ['status', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });
  res.json({ success: true, data: { orders } });
});

const createOrder = asyncHandler(async (req, res) => {
  const { sourceText, link, articleNumber, description, customerName, customerNumber, quantity, quantityForStock, notes, handle } = req.body;
  // Only the Kürzel is mandatory (shared login → who wrote it). Everything else
  // may be left blank; description falls back to a dash.
  if (!handle || !String(handle).trim()) {
    throw new AppError('Kürzel ist erforderlich', 400, 'HANDLE_REQUIRED');
  }
  // Department: admins/orders_manager may target any; others post to their own.
  let department = departmentForRole(req.user.role);
  if (SEE_ALL_ROLES.includes(req.user.role)) department = req.body.department || department || 'admin';
  if (!department) throw new AppError('Keine Abteilung zugeordnet', 400, 'NO_DEPARTMENT');

  const order = await Order.create({
    department,
    sourceText: (sourceText && String(sourceText).trim()) || 'Shop',
    link: link || null,
    articleNumber: articleNumber || null,
    description: (description && String(description).trim()) || '—',
    customerName: customerName || null,
    customerNumber: customerNumber || null,
    quantity: quantity != null ? parseInt(quantity, 10) || 1 : 1,
    quantityForStock: quantityForStock != null ? parseInt(quantityForStock, 10) || 0 : 0,
    notes: notes || null,
    status: 'open',
    createdBy: req.user.id,
    createdByName: creatorName(req.user),
    handle: String(handle).trim(),
  });
  res.status(201).json({ success: true, data: { order } });
});

const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new NotFoundError('Order');

  const isManager = SEE_ALL_ROLES.includes(req.user.role);
  const isOwner = order.createdBy === req.user.id;
  if (!isManager && !isOwner) throw new AppError('Keine Berechtigung', 403, 'FORBIDDEN');

  const { status } = req.body;
  const updates = {};
  // Ticking an order off ("erledigt" = ordered) / reopening is reserved for
  // admins and the Bestellungen account — a department can't mark its own done.
  if (status) {
    if (!ORDER_CHECKOFF_ROLES.includes(req.user.role)) throw new AppError('Nur Admin oder Bestellungen darf abhaken', 403, 'ORDER_CHECKOFF_FORBIDDEN');
    updates.status = status;
    if (status === 'ordered') { updates.orderedBy = req.user.id; updates.orderedAt = new Date(); }
    else if (status === 'open') { updates.orderedBy = null; updates.orderedAt = null; }
  }
  for (const f of ['articleNumber', 'description', 'customerName', 'customerNumber', 'link', 'sourceText', 'notes', 'handle']) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body.quantity !== undefined) updates.quantity = parseInt(req.body.quantity, 10) || 1;
  if (req.body.quantityForStock !== undefined) updates.quantityForStock = parseInt(req.body.quantityForStock, 10) || 0;

  await order.update(updates);
  res.json({ success: true, data: { order } });
});

const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new NotFoundError('Order');
  const isManager = SEE_ALL_ROLES.includes(req.user.role);
  if (!isManager && order.createdBy !== req.user.id) throw new AppError('Keine Berechtigung', 403, 'FORBIDDEN');
  await order.destroy();
  res.json({ success: true, data: { deleted: true } });
});

// Flag/clear a problem on an order (e.g. "nicht lieferbar"). The person who
// created the order gets a notification (+ push via the Notification hook).
const setOrderProblem = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new NotFoundError('Order');
  const note = (req.body.note || '').trim();
  const handle = (req.body.handle || '').trim();
  await order.update({
    problemNote: note || null,
    problemBy: note ? (handle || null) : null,
    problemAt: note ? new Date() : null,
  });
  // Notify the order's creator so it shows up (red, on top) for them.
  if (note && order.createdBy) {
    try {
      const { Notification } = models;
      await Notification.create({
        userId: order.createdBy,
        title: 'Problem bei Bestellung',
        message: `${order.description || 'Bestellung'}: ${note}`,
        type: 'system',
        category: 'system',
        relatedId: order.id,
        relatedType: 'order',
      });
    } catch (e) { /* best-effort */ }
  }
  res.json({ success: true, data: { order } });
});

// Bulk-delete DONE ("ordered") orders created on/before a given month.
// Query: ?before=YYYY-MM  (deletes everything up to and including that month).
const purgeDoneOrders = asyncHandler(async (req, res) => {
  const before = String(req.query.before || '');
  const m = /^(\d{4})-(\d{2})$/.exec(before);
  if (!m) throw new AppError('Monat im Format JJJJ-MM erforderlich', 400, 'MONTH_REQUIRED');
  // First day of the month AFTER the selected one = exclusive upper bound.
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10); // 1-12
  const upper = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  const deleted = await Order.destroy({ where: { status: 'ordered', createdAt: { [Op.lt]: upper } } });
  res.json({ success: true, data: { deleted } });
});

// Distinct order sources with counts (across all departments) for the
// "Quellenbearbeitung" tool.
const listOrderSources = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({ attributes: ['sourceText'] });
  const map = new Map(); // lowercased -> { name, count }
  orders.forEach((o) => {
    const name = (o.sourceText || 'Shop');
    const k = name.toLowerCase();
    const e = map.get(k) || { name, count: 0 };
    e.count += 1;
    map.set(k, e);
  });
  const sources = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, data: { sources } });
});

// Merge several source names into one canonical name (removes duplicates).
const mergeOrderSources = asyncHandler(async (req, res) => {
  const from = Array.isArray(req.body.from) ? req.body.from.filter(Boolean) : [];
  const to = (req.body.to || '').trim();
  if (!to) throw new AppError('Ziel-Quelle ist erforderlich', 400, 'TARGET_REQUIRED');
  if (from.length === 0) throw new AppError('Keine Quellen ausgewählt', 400, 'NONE_SELECTED');
  const { fn, col, where: whereFn } = require('sequelize');
  const lowered = from.map((s) => String(s).toLowerCase());
  const [updated] = await Order.update(
    { sourceText: to },
    { where: whereFn(fn('lower', col('source_text')), { [Op.in]: lowered }) }
  );
  res.json({ success: true, data: { updated } });
});

// ── Lager (Warehouse) ─────────────────────────────────────────────────

const listWarehouse = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const items = await WarehouseItem.findAll({ where, order: [['status', 'ASC'], ['createdAt', 'DESC']] });
  res.json({ success: true, data: { items } });
});

const createWarehouseItem = asyncHandler(async (req, res) => {
  const { brand, color, articleNumber, frameSize, model, quantity, notes, handle } = req.body;
  // Only the Kürzel is mandatory; everything else optional.
  if (!handle || !String(handle).trim()) {
    throw new AppError('Kürzel ist erforderlich', 400, 'HANDLE_REQUIRED');
  }
  const item = await WarehouseItem.create({
    brand: brand || null,
    color: color || null,
    articleNumber: articleNumber || null,
    frameSize: frameSize || null,
    model: model || null,
    // The legacy description column may still be NOT NULL in the DB, so keep it
    // non-null with a sensible fallback (everything else stays optional).
    description: (req.body.description && String(req.body.description).trim()) || model || frameSize || '—',
    quantity: quantity != null ? parseInt(quantity, 10) || 1 : 1,
    notes: notes || null,
    status: 'requested',
    createdBy: req.user.id,
    createdByName: creatorName(req.user),
    handle: String(handle).trim(),
  });
  res.status(201).json({ success: true, data: { item } });
});

const updateWarehouseItem = asyncHandler(async (req, res) => {
  const item = await WarehouseItem.findByPk(req.params.id);
  if (!item) throw new NotFoundError('WarehouseItem');
  const updates = {};
  if (req.body.status === 'brought') { updates.status = 'brought'; updates.broughtBy = req.user.id; updates.broughtAt = new Date(); }
  else if (req.body.status === 'requested') { updates.status = 'requested'; updates.broughtBy = null; updates.broughtAt = null; }
  for (const f of ['brand', 'color', 'articleNumber', 'frameSize', 'model', 'description', 'notes', 'handle']) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body.quantity !== undefined) updates.quantity = parseInt(req.body.quantity, 10) || 1;
  await item.update(updates);
  res.json({ success: true, data: { item } });
});

const deleteWarehouseItem = asyncHandler(async (req, res) => {
  const item = await WarehouseItem.findByPk(req.params.id);
  if (!item) throw new NotFoundError('WarehouseItem');
  const isPriv = ['admin', 'super_admin', 'warehouse_worker'].includes(req.user.role);
  if (!isPriv && item.createdBy !== req.user.id) throw new AppError('Keine Berechtigung', 403, 'FORBIDDEN');
  await item.destroy();
  res.json({ success: true, data: { deleted: true } });
});

// ── Termine (Appointments) ────────────────────────────────────────────
// App-created appointments show up automatically (same table). Staff can also
// create their own by hand with a free-text customer (number/name/phone).

const APPT_TYPES = ['service', 'pickup', 'delivery', 'inspection', 'consultation', 'other', 'repair', 'property_viewing', 'onsite_repair'];
const APPT_STATUSES = ['pending', 'proposed', 'confirmed', 'cancelled', 'completed', 'rescheduled'];

// Who sees every appointment (the general schedulers). Everyone else only sees
// appointments routed to their own department; unrouted ones stay with these.
function seesAllAppointments(role) {
  return ['admin', 'super_admin', 'service_manager', 'orders_manager'].includes(role);
}

const listAppointments = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status;
  if (req.query.type && req.query.type !== 'all') where.type = req.query.type;
  // Admin/orders may additionally filter by a specific department.
  if (seesAllAppointments(req.user.role) && req.query.department && req.query.department !== 'all') {
    where.department = req.query.department;
  }
  // Auto-sort by department: a department account only sees its own appointments.
  // Lieferungen additionally gets EVERY delivery-type appointment.
  if (!seesAllAppointments(req.user.role)) {
    const dept = departmentForRole(req.user.role);
    if (req.user.role === 'delivery_manager') {
      where[Op.or] = [{ department: 'lieferungen' }, { type: 'delivery' }];
    } else if (req.user.role === 'warehouse_worker') {
      where.department = 'lager';                       // Lager staff calendar
    } else if (req.user.role === 'ev_manager') {
      where.department = { [Op.in]: ['neurad', 'elektro'] }; // Neuradwerkstatt calendar
    } else {
      where.department = dept || '__none__';
    }
  }

  const items = await Appointment.findAll({
    where,
    include: [{ model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'customerNumber', 'phone'] }],
    order: [['date', 'ASC'], ['startTime', 'ASC']],
  });

  // Normalise: staff-entered ones carry the customer as free text; app ones
  // resolve it from the linked account.
  const appointments = items.map((a) => {
    const c = a.customer;
    const fromAccount = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '';
    return {
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      title: a.title,
      description: a.description,
      type: a.type,
      status: a.status,
      department: a.department,
      createdByStaff: a.createdByStaff,
      handle: a.handle || '',
      repairNumber: a.repairNumber || '',
      assignedHandle: a.assignedHandle || '',
      workDone: !!a.workDone,
      warnNote: a.warnNote || '',
      proposedText: a.proposedText || '',
      staffQuestion: a.staffQuestion || '',
      customerNote: a.customerNote || '',
      customerName: a.createdByStaff ? (a.customerName || '') : (fromAccount || a.customerName || ''),
      customerNumber: a.createdByStaff ? (a.customerNumber || '') : (c?.customerNumber || a.customerNumber || ''),
      phone: a.createdByStaff ? (a.phone || '') : (c?.phone || a.phone || ''),
    };
  });
  res.json({ success: true, data: { appointments } });
});

const createAppointment = asyncHandler(async (req, res) => {
  const { title, type, date, startTime, endTime, description, customerNumber, customerName, phone, handle } = req.body;
  // Only the Kürzel is mandatory — everything else may be left blank.
  if (!handle || !String(handle).trim()) throw new AppError('Kürzel ist erforderlich', 400, 'HANDLE_REQUIRED');
  const apptType = type && APPT_TYPES.includes(type) ? type : 'other';

  // Service manages the Fahrrad (bike) calendar, so its hand-entered
  // appointments default there (not to a separate "service" bucket) — that's
  // the calendar Service and the Fahrrad department both look at.
  const CALENDAR_DEPT = { service_manager: 'fahrrad', warehouse_worker: 'lager', ev_manager: 'neurad' };
  const roleDept = CALENDAR_DEPT[req.user.role] || departmentForRole(req.user.role);
  const department = req.body.department || roleDept || null;
  const appointment = await Appointment.create({
    userId: req.user.id, // staff account owns the hand-entered appointment
    title: (title && String(title).trim()) || 'Termin',
    type: apptType,
    date: date || null,
    startTime: startTime || null,
    endTime: endTime || null,
    description: description || null,
    status: 'confirmed',
    createdByStaff: true,
    customerNumber: customerNumber || null,
    customerName: customerName || null,
    phone: phone || null,
    department,
    handle: String(handle).trim(),
    repairNumber: req.body.repairNumber || null,
    assignedHandle: req.body.assignedHandle || null,
  });
  res.status(201).json({ success: true, data: { appointment } });
});

const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByPk(req.params.id);
  if (!appointment) throw new NotFoundError('Appointment');
  const wasCancelled = appointment.status === 'cancelled';
  const updates = {};
  if (req.body.status && APPT_STATUSES.includes(req.body.status)) updates.status = req.body.status;
  for (const f of ['title', 'description', 'date', 'startTime', 'endTime', 'customerNumber', 'customerName', 'phone', 'type', 'handle', 'repairNumber', 'assignedHandle', 'workDone', 'warnNote']) {
    if (req.body[f] !== undefined) {
      let v = req.body[f];
      // Empty date/time strings must become NULL (Postgres rejects '' for DATE/TIME).
      if ((f === 'date' || f === 'startTime' || f === 'endTime') && v === '') v = null;
      updates[f] = v;
    }
  }
  await appointment.update(updates);
  // Keep the linked "Reparaturen heute" job in sync when this appointment is
  // ticked off / un-ticked (and vice-versa in repairJobController).
  if (updates.workDone !== undefined) {
    try {
      const { RepairJob } = models;
      await RepairJob.update(
        { done: !!updates.workDone, doneAt: updates.workDone ? new Date() : null },
        { where: { sourceAppointmentId: appointment.id } },
      );
    } catch (e) { /* non-blocking */ }
  }
  // If staff just cancelled it, tell the customer (app appointments have a userId).
  if (updates.status === 'cancelled' && !wasCancelled && appointment.userId && !appointment.createdByStaff) {
    try {
      const { Notification } = models;
      await Notification.create({
        userId: appointment.userId,
        title: 'Termin abgesagt',
        message: `Ihr Termin "${appointment.title}"${appointment.date ? ' am ' + appointment.date : ''} wurde abgesagt.`,
        type: 'appointment_reminder',
        category: 'appointment',
        relatedId: appointment.id,
        relatedType: 'appointment',
      });
    } catch (e) { /* best-effort */ }
  }
  res.json({ success: true, data: { appointment } });
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByPk(req.params.id);
  if (!appointment) throw new NotFoundError('Appointment');
  await appointment.destroy(); // any staff member may remove an appointment
  res.json({ success: true, data: { deleted: true } });
});

// Same full flow as the app: propose a date (customer must confirm), directly
// confirm, or ask a follow-up question. Reuses the app's appointment service so
// the customer gets the same notifications and can respond in the app.
const proposeAppointment = asyncHandler(async (req, res) => {
  const { date, proposedText } = req.body;
  if (!date) throw new AppError('Datum ist erforderlich', 400, 'DATE_REQUIRED');
  if (!proposedText || !String(proposedText).trim()) throw new AppError('Vorschlag-Text ist erforderlich', 400, 'TEXT_REQUIRED');
  const appointment = await appointmentService.proposeTime(req.params.id, req.user.id, { date, proposedText: String(proposedText).trim() });
  res.json({ success: true, data: { appointment } });
});

const confirmAppointmentDesktop = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.confirmAppointment(req.params.id, req.user.id);
  res.json({ success: true, data: { appointment } });
});

const askAppointmentQuestion = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || !String(question).trim()) throw new AppError('Rückfrage ist erforderlich', 400, 'QUESTION_REQUIRED');
  const appointment = await appointmentService.askQuestion(req.params.id, req.user.id, String(question).trim());
  res.json({ success: true, data: { appointment } });
});

// ── Tickets (per department) ──────────────────────────────────────────
// Each department only sees tickets in its category. Detail/chat/status reuse
// the app's service layer so notifications + access control stay consistent.
const ALL_TICKET_CATEGORIES = ['service', 'bike', 'cleaning', 'motor'];
// Legacy category fallback (for old tickets that have no department set).
// Only the original four categories exist, so only these roles get a fallback;
// the newer departments see ONLY tickets explicitly routed to them.
const DEPT_TICKET_CATEGORIES = {
  bike_manager: ['bike'],
  cleaning_manager: ['cleaning'],
  motor_manager: ['motor'],
  service_manager: ['service', 'bike', 'cleaning', 'motor'],
  sales_manager: ['bike'], // Verkauf also sees Fahrrad (bike) tickets
  ev_manager: ['bike'],    // Neuradwerkstatt handles Fahrrad + Elektro tickets
};
// The department key(s) each role owns (matches the ticket's `department` field).
// A role can own several departments — e.g. Verkauf also handles Fahrrad tickets.
const ROLE_TICKET_DEPARTMENTS = {
  bike_manager: ['fahrrad'],
  cleaning_manager: ['reinigung'],
  motor_manager: ['rasenmaeher'],
  robby_manager: ['robby'],
  motor_equipment_manager: ['motorgeraete'],
  ev_manager: ['elektro', 'fahrrad'],
  sales_manager: ['verkauf', 'fahrrad'],
  delivery_manager: ['lieferungen'],
};
function deptsForTicketRole(role) { return ROLE_TICKET_DEPARTMENTS[role] || []; }
function ticketCategoriesForRole(role) {
  if (['admin', 'super_admin', 'orders_manager'].includes(role)) return ALL_TICKET_CATEGORIES;
  return DEPT_TICKET_CATEGORIES[role] || [];
}
function seesAllTickets(role) {
  return ['admin', 'super_admin', 'orders_manager', 'service_manager'].includes(role);
}
// A staff member may access a ticket if they see all, or the ticket's department
// is one of theirs, or (for old tickets without a department) its category is in
// their category set.
function canAccessTicket(role, ticket) {
  if (seesAllTickets(role)) return true;
  if (ticket.department && deptsForTicketRole(role).includes(ticket.department)) return true;
  if (!ticket.department && ticketCategoriesForRole(role).includes(ticket.category)) return true;
  return false;
}

const listTickets = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const cats = ticketCategoriesForRole(role);
  const depts = deptsForTicketRole(role);
  if (cats.length === 0 && depts.length === 0 && !seesAllTickets(role)) {
    return res.json({ success: true, data: { tickets: [] } });
  }

  const where = {};
  if (req.query.status && req.query.status !== 'all') where.status = req.query.status;
  if (!seesAllTickets(role)) {
    // Match by department (new tickets) OR by category when no department (old).
    const or = [];
    if (depts.length) or.push({ department: { [Op.in]: depts } });
    if (cats.length) or.push({ department: null, category: { [Op.in]: cats } });
    where[Op.or] = or;
  }

  const tickets = await Ticket.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'customerNumber', 'phone'] },
      { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: { tickets } });
});

function assertTicketAccess(role, ticket) {
  if (!canAccessTicket(role, ticket)) {
    throw new AppError('Kein Zugriff auf dieses Ticket', 403, 'FORBIDDEN');
  }
}

const getTicket = asyncHandler(async (req, res) => {
  const ticket = await serviceService.getTicketById(req.params.id, req.user.id, models);
  assertTicketAccess(req.user.role, ticket);
  // Load the chat directly: getChatMessages only allows the owner/assignee/admin,
  // but any department manager should be able to read their category's ticket.
  const messages = await ChatMessage.findAll({
    where: { ticketId: req.params.id },
    include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'role'] }],
    order: [['createdAt', 'ASC']],
  });
  res.json({ success: true, data: { ticket, messages } });
});

const addTicketMessage = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) throw new NotFoundError('Ticket');
  assertTicketAccess(req.user.role, ticket);
  // Staff can always add to a chat (even a "Fertig"/closed ticket) so they can
  // append something in an emergency — the chat is never locked on the PC side.
  const message = (req.body.message || '').trim();
  if (!message) throw new AppError('Nachricht ist erforderlich', 400, 'MESSAGE_REQUIRED');

  // Any manager of this category may reply from the shared department account —
  // no per-person assignment gate (unlike the app's stricter sendChatMessage).
  const { Notification } = models;
  if (!ticket.assignedTo || ticket.status === 'open') {
    await ticket.update({ assignedTo: ticket.assignedTo || req.user.id, status: ticket.status === 'open' ? 'in_progress' : ticket.status });
  }
  const created = await ChatMessage.create({ ticketId: ticket.id, userId: req.user.id, message });

  // Notify the customer of the reply.
  if (ticket.userId) {
    try {
      await Notification.create({
        userId: ticket.userId,
        title: 'Neue Chat-Nachricht',
        message: `Neue Nachricht in Ticket ${ticket.ticketNumber}: ${message.substring(0, 60)}`,
        type: 'chat_message',
        category: 'chat',
        relatedId: ticket.id,
        relatedType: 'ticket',
        deepLink: `/service/tickets/${ticket.id}/chat`,
      });
    } catch (e) { /* notification failure must not block the reply */ }
  }
  res.status(201).json({ success: true, data: { message: created } });
});

const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findByPk(req.params.id, { attributes: ['id', 'category', 'department'] });
  if (!ticket) throw new NotFoundError('Ticket');
  assertTicketAccess(req.user.role, ticket);
  const valid = ['open', 'in_progress', 'confirmed', 'completed', 'cancelled', 'closed'];
  if (!valid.includes(req.body.status)) throw new AppError('Ungültiger Status', 400, 'INVALID_STATUS');
  const updated = await serviceService.updateTicketStatus(req.params.id, req.body.status, req.user.id, models);
  res.json({ success: true, data: { ticket: updated } });
});

// ── Robby customers (who bought a Robby) ──────────────────────────────
const listRobbyCustomers = asyncHandler(async (req, res) => {
  const q = String(req.query.search || '').trim().toLowerCase();
  const all = await RobbyCustomer.findAll({ order: [['name', 'ASC']] });
  const items = !q ? all : all.filter((c) => {
    const hay = [c.name, c.customerNumber, c.street, c.zip, c.city, c.phone, c.device, c.pin, c.purchaseDate, c.notes]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
  res.json({ success: true, data: { customers: items } });
});

const createRobbyCustomer = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) throw new AppError('Name ist erforderlich', 400, 'NAME_REQUIRED');
  const customer = await RobbyCustomer.create({
    name: String(b.name).trim(),
    customerNumber: b.customerNumber || null,
    street: b.street || null,
    zip: b.zip || null,
    city: b.city || null,
    phone: b.phone || null,
    device: b.device || null,
    pin: b.pin || null,
    purchaseDate: b.purchaseDate || null,
    notes: b.notes || null,
    createdByHandle: b.handle || null,
  });
  res.status(201).json({ success: true, data: { customer } });
});

const updateRobbyCustomer = asyncHandler(async (req, res) => {
  const customer = await RobbyCustomer.findByPk(req.params.id);
  if (!customer) throw new NotFoundError('RobbyCustomer');
  const updates = {};
  for (const f of ['name', 'customerNumber', 'street', 'zip', 'city', 'phone', 'device', 'pin', 'purchaseDate', 'notes']) {
    if (req.body[f] !== undefined) updates[f] = req.body[f] || null;
  }
  await customer.update(updates);
  res.json({ success: true, data: { customer } });
});

const deleteRobbyCustomer = asyncHandler(async (req, res) => {
  const customer = await RobbyCustomer.findByPk(req.params.id);
  if (!customer) throw new NotFoundError('RobbyCustomer');
  await customer.destroy();
  res.json({ success: true, data: { deleted: true } });
});

module.exports = {
  desktopLogin,
  listRobbyCustomers, createRobbyCustomer, updateRobbyCustomer, deleteRobbyCustomer,
  listOrders, createOrder, updateOrder, deleteOrder, setOrderProblem, purgeDoneOrders,
  listOrderSources, mergeOrderSources,
  listWarehouse, createWarehouseItem, updateWarehouseItem, deleteWarehouseItem,
  listAppointments, createAppointment, updateAppointment, deleteAppointment,
  proposeAppointment, confirmAppointmentDesktop, askAppointmentQuestion,
  listTickets, getTicket, addTicketMessage, updateTicket,
  departmentForRole,
};
