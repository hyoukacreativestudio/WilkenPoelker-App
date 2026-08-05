const { Op } = require('sequelize');
const { TaifunOrder, TaifunCustomer, User } = require('../models');
const { NotFoundError } = require('../middlewares/errorHandler');

// Staff outreach list: Taifun orders that are visible in the app but whose
// customer has NO app account yet. Service can call these customers top-down and
// tick off who they've reached. Orders WITH an account already show up as the
// customer's Repairs, so by default they're excluded here.

function customerName(c) {
  if (!c) return null;
  const n = `${c.name1 || ''} ${c.name2 || ''}`.trim();
  return n || null;
}

async function listOutreach({ filter = 'open', scope = 'no_account', limit = 1000 } = {}) {
  const where = { appHidden: false, vanishedAt: null, storno: false };
  if (filter === 'open') where.reachedAt = null;
  else if (filter === 'reached') where.reachedAt = { [Op.ne]: null };
  // filter === 'all' -> no reached constraint

  const rows = await TaifunOrder.findAll({
    where,
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

  let items = rows.map((o) => ({
    nr: o.nr,
    info: o.info,
    date: o.date,
    appStatus: o.appStatus,
    appStatusLabel: o.appStatusLabel,
    appCategory: o.appCategory,
    reachedAt: o.reachedAt,
    hasAccount: accountSet.has(o.kdNr),
    kdNr: o.kdNr,
    customerName: customerName(o.customer),
    phone: o.customer?.phone || null,
    mobile: o.customer?.mobile || null,
    street: o.customer ? `${o.customer.street || ''} ${o.customer.houseNumber || ''}`.trim() || null : null,
    zip: o.customer?.zip || null,
    city: o.customer?.city || null,
  }));

  if (scope === 'no_account') items = items.filter((i) => !i.hasAccount);

  // Not-yet-reached first, then oldest orders first (work the list top-down).
  items.sort((a, b) => {
    const ar = a.reachedAt ? 1 : 0;
    const br = b.reachedAt ? 1 : 0;
    if (ar !== br) return ar - br;
    return String(a.date || '').localeCompare(String(b.date || '')) || String(a.nr).localeCompare(String(b.nr));
  });

  return {
    items,
    counts: {
      total: items.length,
      open: items.filter((i) => !i.reachedAt).length,
      reached: items.filter((i) => i.reachedAt).length,
    },
  };
}

async function markReached(nr, userId, reached) {
  const order = await TaifunOrder.findOne({ where: { nr } });
  if (!order) throw new NotFoundError('TaifunOrder');
  order.reachedAt = reached ? new Date() : null;
  order.reachedBy = reached ? userId : null;
  await order.save();
  return { nr: order.nr, reachedAt: order.reachedAt };
}

module.exports = { listOutreach, markReached };
