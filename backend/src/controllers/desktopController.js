const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { Order, WarehouseItem, User } = require('../models');

// ── Passwordless department login (desktop tool on trusted company PCs) ──
// Each department = one dedicated account (conventional email below). Clicking a
// department logs into that account WITHOUT a password. Only these staff roles
// are ever allowed — never a real customer account. Optionally hardened with a
// shared secret via env DESKTOP_LOGIN_SECRET (the desktop sends it).
const DEPT_ACCOUNTS = {
  admin:        { email: 'admin@wilkenpoelker.de',        role: 'admin' },
  fahrrad:      { email: 'fahrrad@wilkenpoelker.de',      role: 'bike_manager' },
  reinigung:    { email: 'reinigung@wilkenpoelker.de',    role: 'cleaning_manager' },
  service:      { email: 'service@wilkenpoelker.de',      role: 'service_manager' },
  rasenmaeher:  { email: 'rasenmaeher@wilkenpoelker.de',  role: 'motor_manager' },
  robby:        { email: 'robby@wilkenpoelker.de',        role: 'robby_manager' },
  verkauf:      { email: 'verkauf@wilkenpoelker.de',      role: 'sales_manager' },
  bestellungen: { email: 'bestellungen@wilkenpoelker.de', role: 'orders_manager' },
  lager:        { email: 'lager@wilkenpoelker.de',        role: 'warehouse_worker' },
};
const DESKTOP_ROLES = new Set([
  'admin', 'super_admin', 'bike_manager', 'cleaning_manager', 'motor_manager',
  'service_manager', 'robby_manager', 'sales_manager', 'orders_manager', 'warehouse_worker',
]);

const desktopLogin = asyncHandler(async (req, res) => {
  const secret = process.env.DESKTOP_LOGIN_SECRET;
  if (secret && req.body.secret !== secret) throw new AppError('Nicht erlaubt', 403, 'FORBIDDEN');

  const dept = DEPT_ACCOUNTS[req.body.department];
  if (!dept) throw new AppError('Unbekannte Abteilung', 400, 'UNKNOWN_DEPARTMENT');

  const { fn, col, where } = require('sequelize');
  const user = await User.findOne({ where: where(fn('lower', col('email')), dept.email.toLowerCase()) });
  if (!user) throw new AppError(`Kein Account für "${req.body.department}". Bitte im Admin-Bereich anlegen (${dept.email}).`, 404, 'NO_DEPARTMENT_ACCOUNT');
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
  sales_manager: 'verkauf',
};
const SEE_ALL_ROLES = ['admin', 'super_admin', 'orders_manager'];

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
  if (req.query.source) where.source = req.query.source;

  // orders_manager / admin see every department; everyone else only their own.
  if (SEE_ALL_ROLES.includes(req.user.role)) {
    if (req.query.department && req.query.department !== 'all') where.department = req.query.department;
  } else {
    where.department = departmentForRole(req.user.role) || '__none__';
  }

  const orders = await Order.findAll({ where, order: [['status', 'ASC'], ['createdAt', 'DESC']] });
  res.json({ success: true, data: { orders } });
});

const createOrder = asyncHandler(async (req, res) => {
  const { source, articleNumber, description, customerName, customerNumber, quantity, quantityForStock, amazonLink, notes } = req.body;
  if (!description || !String(description).trim()) {
    throw new AppError('Beschreibung ist erforderlich', 400, 'DESCRIPTION_REQUIRED');
  }
  // Department: admins/orders_manager may target any; others post to their own.
  let department = departmentForRole(req.user.role);
  if (SEE_ALL_ROLES.includes(req.user.role)) department = req.body.department || department || 'admin';
  if (!department) throw new AppError('Keine Abteilung zugeordnet', 400, 'NO_DEPARTMENT');

  const order = await Order.create({
    department,
    source: source === 'amazon' ? 'amazon' : 'shop',
    articleNumber: articleNumber || null,
    description: String(description).trim(),
    customerName: customerName || null,
    customerNumber: customerNumber || null,
    quantity: quantity != null ? parseInt(quantity, 10) || 1 : 1,
    quantityForStock: quantityForStock != null ? parseInt(quantityForStock, 10) || 0 : 0,
    amazonLink: amazonLink || null,
    notes: notes || null,
    status: 'open',
    createdBy: req.user.id,
    createdByName: creatorName(req.user),
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
  // Only the orders_manager/admin flips the ordered/cancelled status
  if (status && isManager) {
    updates.status = status;
    if (status === 'ordered') { updates.orderedBy = req.user.id; updates.orderedAt = new Date(); }
  }
  // Content edits allowed for owner or manager
  for (const f of ['articleNumber', 'description', 'customerName', 'customerNumber', 'amazonLink', 'notes', 'source']) {
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

// ── Lager (Warehouse) ─────────────────────────────────────────────────

const listWarehouse = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const items = await WarehouseItem.findAll({ where, order: [['status', 'ASC'], ['createdAt', 'DESC']] });
  res.json({ success: true, data: { items } });
});

const createWarehouseItem = asyncHandler(async (req, res) => {
  const { brand, color, articleNumber, description, quantity, notes } = req.body;
  if (!description || !String(description).trim()) {
    throw new AppError('Beschreibung ist erforderlich', 400, 'DESCRIPTION_REQUIRED');
  }
  const item = await WarehouseItem.create({
    brand: brand || null,
    color: color || null,
    articleNumber: articleNumber || null,
    description: String(description).trim(),
    quantity: quantity != null ? parseInt(quantity, 10) || 1 : 1,
    notes: notes || null,
    status: 'requested',
    createdBy: req.user.id,
    createdByName: creatorName(req.user),
  });
  res.status(201).json({ success: true, data: { item } });
});

const updateWarehouseItem = asyncHandler(async (req, res) => {
  const item = await WarehouseItem.findByPk(req.params.id);
  if (!item) throw new NotFoundError('WarehouseItem');
  const updates = {};
  if (req.body.status === 'brought') { updates.status = 'brought'; updates.broughtBy = req.user.id; updates.broughtAt = new Date(); }
  else if (req.body.status === 'requested') { updates.status = 'requested'; updates.broughtBy = null; updates.broughtAt = null; }
  for (const f of ['brand', 'color', 'articleNumber', 'description', 'notes']) {
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

module.exports = {
  desktopLogin,
  listOrders, createOrder, updateOrder, deleteOrder,
  listWarehouse, createWarehouseItem, updateWarehouseItem, deleteWarehouseItem,
  departmentForRole,
};
