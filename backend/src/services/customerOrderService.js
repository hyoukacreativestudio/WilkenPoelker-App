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
// The shop wants 2026 to continue at 1101. Every later year starts at 1 again.
const FIRST_NUMBER_BY_YEAR = { 2026: 1101 };
const firstNumberFor = (year) => FIRST_NUMBER_BY_YEAR[year] || 1;

const blank = (v) => !v || !String(v).trim();

function currentYear(now = new Date()) {
  return parseInt(now.toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).slice(0, 4), 10);
}

// A customer order has a customer number and is not entirely for stock
// ("fürs Lager"). A name alone is not enough.
function isForCustomer(order) {
  const quantity = Number(order.quantity ?? 1);
  const forStock = Number(order.quantityForStock ?? 0);
  return !blank(order.customerNumber) && forStock < quantity;
}

// Only customer orders without any Rep-/VK-Nr. (old combined refNumber counts too).
function needsCustomerOrderNumber(order) {
  if (order.customerOrderNumber) return false;
  if (!blank(order.repairNumber) || !blank(order.saleNumber) || !blank(order.refNumber)) return false;
  return isForCustomer(order);
}

// After an edit: an order that became stock-only or lost its customer number
// leaves the Kundenbestellungen again; otherwise it gets a number if it needs one.
async function syncCustomerOrderNumber(order) {
  if (order.customerOrderNumber && !isForCustomer(order)) {
    await order.update({
      customerOrderYear: null,
      customerOrderNumber: null,
      customerOrderStatus: null,
      customerOrderStatusAt: null,
      customerOrderStatusBy: null,
    });
    return order;
  }
  return assignNumberIfNeeded(order);
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
  let n = Math.max((maxThisYear || 0) + 1, firstNumberFor(year));
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

const nameWords = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .split(/[^a-z0-9]+/).filter(Boolean);

// Staff usually type just the surname, Taifun has "Vorname Nachname": every
// typed word must appear in the customer's name (order and case do not matter).
function nameFits(typed, known) {
  const words = nameWords(typed);
  const knownWords = new Set(nameWords(known));
  return words.some((w) => w.length >= 3) && words.every((w) => knownWords.has(w));
}

// Phone number of a customer we already know. Customer number AND name must
// fit the same record (app account, Taifun, Robby list) - otherwise a typo in
// the number could attach a stranger's phone. Returns '' if unsure.
async function lookupCustomerPhone({ customerNumber, customerName }) {
  const { User, TaifunCustomer, RobbyCustomer } = models;
  const nr = String(customerNumber || '').trim();
  if (!nr || blank(customerName)) return '';

  const users = await User.findAll({ where: { customerNumber: nr } });
  const user = users.find((u) => nameFits(customerName, `${u.firstName || ''} ${u.lastName || ''}`) && !blank(u.phone));
  if (user) return user.phone.trim();

  const taifuns = await TaifunCustomer.findAll({ where: { kdNr: nr } });
  const taifun = taifuns.find((t) => nameFits(customerName, `${t.name1 || ''} ${t.name2 || ''}`) && !blank(t.mobile || t.phone));
  if (taifun) return (taifun.mobile || taifun.phone).trim();

  const robbys = await RobbyCustomer.findAll({ where: { customerNumber: nr } });
  const robby = robbys.find((r) => nameFits(customerName, r.name) && !blank(r.phone));
  if (robby) return robby.phone.trim();
  return '';
}

module.exports = {
  STATUSES,
  currentYear,
  firstNumberFor,
  isForCustomer,
  needsCustomerOrderNumber,
  assignNumberIfNeeded,
  syncCustomerOrderNumber,
  nameFits,
  lookupCustomerPhone,
};
