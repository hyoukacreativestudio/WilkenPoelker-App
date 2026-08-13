const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { Order, WarehouseItem, User } = require('../models');

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
  const { sourceText, link, articleNumber, description, customerName, customerNumber, quantity, quantityForStock, notes } = req.body;
  if (!description || !String(description).trim()) {
    throw new AppError('Beschreibung ist erforderlich', 400, 'DESCRIPTION_REQUIRED');
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
    description: String(description).trim(),
    customerName: customerName || null,
    customerNumber: customerNumber || null,
    quantity: quantity != null ? parseInt(quantity, 10) || 1 : 1,
    quantityForStock: quantityForStock != null ? parseInt(quantityForStock, 10) || 0 : 0,
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
  // Anyone (owner or manager) can tick an order off ("erledigt" = ordered) / reopen.
  if (status) {
    updates.status = status;
    if (status === 'ordered') { updates.orderedBy = req.user.id; updates.orderedAt = new Date(); }
    else if (status === 'open') { updates.orderedBy = null; updates.orderedAt = null; }
  }
  for (const f of ['articleNumber', 'description', 'customerName', 'customerNumber', 'link', 'sourceText', 'notes']) {
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
