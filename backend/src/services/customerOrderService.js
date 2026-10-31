const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const models = require('../models');

// "Kundenbestellungen": an order for a customer that has NEITHER a Reparatur-
// NOR a Verkaufsnummer gets its own number. Numbers start at 1 every year;
// numbers still held by last year's (or older) orders that were not picked up
// yet are skipped, so a number on a shelf is never given out twice.
// All articles entered together (same groupId) share one number.

const STATUSES = ['waiting', 'arrived', 'reached', 'picked_up'];
// Arbitrary constant for the Postgres advisory lock around number allocation.
const NUMBER_LOCK_KEY = 70210;

const blank = (v) => !v || !String(v).trim();

function currentYear(now = new Date()) {
  return parseInt(now.toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).slice(0, 4), 10);
}

// Only customer orders without any Rep-/VK-Nr. (old combined refNumber counts too).
function needsCustomerOrderNumber(order) {
  if (order.customerOrderNumber) return false;
  if (!blank(order.repairNumber) || !blank(order.saleNumber) || !blank(order.refNumber)) return false;
  return !blank(order.customerName) || !blank(order.customerNumber);
}

async function nextNumber(year, transaction) {
  const { Order } = models;
  const maxThisYear = await Order.max('customerOrderNumber', { where: { customerOrderYear: year }, transaction });
  const held = await Order.findAll({
    attributes: ['customerOrderNumber'],
    where: {
      customerOrderYear: { [Op.lt]: year },
      customerOrderNumber: { [Op.ne]: null },
      customerOrderStatus: { [Op.ne]: 'picked_up' },
    },
    transaction,
  });
  const blocked = new Set(held.map((o) => o.customerOrderNumber));
  let n = (maxThisYear || 0) + 1;
  while (blocked.has(n)) n += 1;
  return n;
}

// Gives `order` a customer-order number if it needs one. Reuses the number of
// another article from the same form (groupId). Safe with several PCs at once.
async function assignNumberIfNeeded(order) {
  if (!needsCustomerOrderNumber(order)) return order;
  const { Order } = models;
  await sequelize.transaction(async (transaction) => {
    if (sequelize.getDialect() === 'postgres') {
      await sequelize.query(`SELECT pg_advisory_xact_lock(${NUMBER_LOCK_KEY})`, { transaction });
    }
    let year = currentYear();
    let number = null;
    let status = 'waiting';
    if (order.groupId) {
      const sibling = await Order.findOne({
        where: { groupId: order.groupId, customerOrderNumber: { [Op.ne]: null }, id: { [Op.ne]: order.id } },
        transaction,
      });
      if (sibling) {
        year = sibling.customerOrderYear;
        number = sibling.customerOrderNumber;
        status = sibling.customerOrderStatus || 'waiting';
      }
    }
    if (!number) number = await nextNumber(year, transaction);
    await order.update({
      customerOrderYear: year,
      customerOrderNumber: number,
      customerOrderStatus: status,
      customerOrderStatusAt: new Date(),
    }, { transaction });
  });
  return order;
}

// Name as a sorted word set, so "Julia Schmidt" == "schmidt,  julia".
const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim()
  .split(' ').filter(Boolean).sort().join(' ');

// Phone number of a customer we already know. Customer number AND name must
// both match the same record (app account, Taifun, Robby list) - otherwise a
// typo in the number could attach a stranger's phone. Returns '' if unsure.
async function lookupCustomerPhone({ customerNumber, customerName }) {
  const { User, TaifunCustomer, RobbyCustomer } = models;
  const nr = String(customerNumber || '').trim();
  const name = nameKey(customerName);
  if (!nr || !name) return '';

  const users = await User.findAll({ where: { customerNumber: nr } });
  const user = users.find((u) => nameKey(`${u.firstName || ''} ${u.lastName || ''}`) === name && !blank(u.phone));
  if (user) return user.phone.trim();

  const taifuns = await TaifunCustomer.findAll({ where: { kdNr: nr } });
  const taifun = taifuns.find((t) => nameKey(t.name2) === name && !blank(t.mobile || t.phone));
  if (taifun) return (taifun.mobile || taifun.phone).trim();

  const robbys = await RobbyCustomer.findAll({ where: { customerNumber: nr } });
  const robby = robbys.find((r) => nameKey(r.name) === name && !blank(r.phone));
  if (robby) return robby.phone.trim();
  return '';
}

module.exports = {
  STATUSES,
  currentYear,
  needsCustomerOrderNumber,
  assignNumberIfNeeded,
  lookupCustomerPhone,
};
