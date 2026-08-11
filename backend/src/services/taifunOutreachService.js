const { Op } = require('sequelize');
const { TaifunOrder, TaifunCustomer, User } = require('../models');
const { NotFoundError } = require('../middlewares/errorHandler');

// Staff outreach list: Taifun orders visible in the app whose customer has NO
// app account yet. Service calls these customers and ticks off who they reached.
//
// Deduped: one card per customer PER category (a customer with 3 repair orders
// shows once under Reparatur, listing all 3). Reached customers move to a
// separate "reached" bucket so the open list stays clean. Supports search +
// category filter. Orders WITH an account already appear as the customer's
// Repairs, so scope defaults to no_account.

function customerName(c) {
  if (!c) return null;
  const n = `${c.name1 || ''} ${c.name2 || ''}`.trim();
  return n || null;
}
const norm = (s) => String(s == null ? '' : s).toLowerCase();

async function listOutreach({ filter = 'open', category = 'all', search = '', scope = 'no_account', limit = 3000 } = {}) {
  const rows = await TaifunOrder.findAll({
    where: { appHidden: false, vanishedAt: null, storno: false },
    include: [{
      model: TaifunCustomer,
      as: 'customer',
      attributes: ['name1', 'name2', 'phone', 'mobile', 'street', 'houseNumber', 'zip', 'city', 'kdNr'],
    }],
    limit: parseInt(limit),
  });

  // Which customer numbers already have an app account?
  const kdNrs = [...new Set(rows.map((o) => o.kdNr).filter(Boolean))];
  const users = kdNrs.length
    ? await User.findAll({ where: { customerNumber: { [Op.in]: kdNrs } }, attributes: ['customerNumber'] })
    : [];
  const accountSet = new Set(users.map((u) => u.customerNumber));

  let orders = rows.map((o) => ({
    nr: o.nr,
    info: o.info,
    date: o.date,
    appStatus: o.appStatus,
    appStatusLabel: o.appStatusLabel,
    appCategory: o.appCategory || 'reparatur',
    reachedAt: o.reachedAt,
    kdNr: o.kdNr,
    hasAccount: accountSet.has(o.kdNr),
    customerName: customerName(o.customer),
    phone: o.customer?.phone || null,
    mobile: o.customer?.mobile || null,
    street: o.customer ? `${o.customer.street || ''} ${o.customer.houseNumber || ''}`.trim() || null : null,
    zip: o.customer?.zip || null,
    city: o.customer?.city || null,
  }));

  if (scope === 'no_account') orders = orders.filter((o) => !o.hasAccount);

  // Group by customer + category
  const groups = new Map();
  for (const o of orders) {
    const key = `${o.kdNr}||${o.appCategory}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        id: key,
        kdNr: o.kdNr,
        category: o.appCategory,
        customerName: o.customerName,
        phone: o.phone,
        mobile: o.mobile,
        street: o.street,
        zip: o.zip,
        city: o.city,
        hasAccount: o.hasAccount,
        orders: [],
      };
      groups.set(key, g);
    }
    g.orders.push({
      nr: o.nr, info: o.info, date: o.date,
      appStatus: o.appStatus, appStatusLabel: o.appStatusLabel, reachedAt: o.reachedAt,
    });
  }

  let list = [...groups.values()];
  for (const g of list) {
    g.reached = g.orders.length > 0 && g.orders.every((o) => o.reachedAt);
    g.reachedAt = g.reached
      ? g.orders.map((o) => o.reachedAt).filter(Boolean).sort().slice(-1)[0]
      : null;
    g.orderCount = g.orders.length;
    g.oldestDate = g.orders.map((o) => o.date).filter(Boolean).sort()[0] || null;
    g.orders.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  }

  // Search (customer- or order-level)
  if (search && String(search).trim()) {
    const q = norm(search);
    list = list.filter((g) =>
      norm(g.customerName).includes(q) ||
      norm(g.phone).includes(q) ||
      norm(g.mobile).includes(q) ||
      norm(g.city).includes(q) ||
      norm(g.zip).includes(q) ||
      norm(g.kdNr).includes(q) ||
      g.orders.some((o) => norm(o.nr).includes(q) || norm(o.info).includes(q))
    );
  }

  // Category-tab badges: count OPEN groups per category (independent of selection)
  const byCategory = { reparatur: 0, neu: 0, leasing: 0 };
  for (const g of list) {
    if (!g.reached && byCategory[g.category] !== undefined) byCategory[g.category] += 1;
  }

  // Apply category filter
  let sel = category && category !== 'all' ? list.filter((g) => g.category === category) : list;

  // Open/reached counts within the current category selection
  const openCount = sel.filter((g) => !g.reached).length;
  const reachedCount = sel.filter((g) => g.reached).length;

  // Open vs reached split (reached customers live in their own bucket)
  if (filter === 'open') sel = sel.filter((g) => !g.reached);
  else if (filter === 'reached') sel = sel.filter((g) => g.reached);

  // Oldest first (work top-down)
  sel.sort((a, b) =>
    String(a.oldestDate || '').localeCompare(String(b.oldestDate || '')) ||
    String(a.kdNr).localeCompare(String(b.kdNr))
  );

  return {
    items: sel,
    counts: { byCategory, open: openCount, reached: reachedCount, total: sel.length },
  };
}

// Mark a customer reached / not reached. Marks all their visible orders in the
// given category (or all categories when category is omitted / 'all').
async function markReached(kdNr, category, userId, reached) {
  const where = { kdNr, appHidden: false, vanishedAt: null, storno: false };
  if (category && category !== 'all') where.appCategory = category;
  const orders = await TaifunOrder.findAll({ where });
  if (!orders.length) throw new NotFoundError('TaifunOrder');
  const stamp = reached ? new Date() : null;
  for (const o of orders) {
    o.reachedAt = stamp;
    o.reachedBy = reached ? userId : null;
    await o.save();
  }
  return { kdNr, category: category || 'all', reached: !!reached, count: orders.length };
}

module.exports = { listOutreach, markReached };
