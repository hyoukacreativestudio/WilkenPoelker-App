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

const normName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Phone number of a customer we already know: by customer number (app account,
// Taifun, Robby list), else by a full name that matches exactly ONE Taifun
// customer. Returns '' when nothing reliable is found.
async function lookupCustomerPhone({ customerNumber, customerName }) {
  const { User, TaifunCustomer, RobbyCustomer } = models;
  const nr = String(customerNumber || '').trim();
  if (nr) {
    const user = await User.findOne({ where: { customerNumber: nr, phone: { [Op.ne]: null } } });
    if (user && !blank(user.phone)) return user.phone.trim();
    const taifun = await TaifunCustomer.findOne({ where: { kdNr: nr } });
    const tPhone = taifun && (taifun.mobile || taifun.phone);
    if (!blank(tPhone)) return tPhone.trim();
    const robby = await RobbyCustomer.findOne({ where: { customerNumber: nr } });
    if (robby && !blank(robby.phone)) return robby.phone.trim();
  }
  const name = normName(customerName);
  if (name.includes(' ')) {
    const { fn, col, where } = require('sequelize');
    const hits = await TaifunCustomer.findAll({ where: where(fn('lower', col('name2')), name), limit: 2 });
    const phone = hits.length === 1 && (hits[0].mobile || hits[0].phone);
    if (!blank(phone)) return phone.trim();
  }
  return '';
}

module.exports = {
  STATUSES,
  currentYear,
  needsCustomerOrderNumber,
  assignNumberIfNeeded,
  lookupCustomerPhone,
};
