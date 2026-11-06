const { Op } = require('sequelize');
const { TaifunOrder, TaifunCustomer, User, Repair, Notification } = require('../models');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { departmentFromOrder, customerName } = require('./taifunOutreachService');

// Kostenvoranschläge (KVA): every Taifun order in the stand "Reparatur KVA
// erstellt". The PC tool lists them in its own tab, split into customers with
// and without the app. Without app: staff send a WhatsApp/phone; with app: staff
// write a message and the customer answers in the app (accept / decline / call).
// Taifun itself is never changed - the answer only shows up in the PC tool.

const RESPONSES = ['accepted', 'declined', 'call'];
const RESPONSE_LABEL = { accepted: 'bestätigt', declined: 'abgelehnt', call: 'möchte angerufen werden' };
const KVA_STAFF_ROLES = ['admin', 'super_admin', 'service_manager'];

async function listKva() {
  const orders = await TaifunOrder.findAll({
    where: { appStatus: 'REP_KVA', appHidden: false, vanishedAt: null, storno: false },
    include: [{ model: TaifunCustomer, as: 'customer', attributes: ['name1', 'name2', 'phone', 'mobile', 'zip', 'city'] }],
    order: [['date', 'ASC'], ['nr', 'ASC']],
  });
  const kdNrs = [...new Set(orders.map((o) => o.kdNr).filter(Boolean))];
  const users = kdNrs.length
    ? await User.findAll({ where: { customerNumber: { [Op.in]: kdNrs } }, attributes: ['id', 'customerNumber', 'firstName', 'lastName'] })
    : [];
  const userByNr = new Map(users.map((u) => [u.customerNumber, u]));
  const repairs = orders.length
    ? await Repair.findAll({ where: { taifunRepairId: { [Op.in]: orders.map((o) => o.nr) } } })
    : [];
  const repairByNr = new Map(repairs.map((r) => [r.taifunRepairId, r]));

  const items = orders.map((o) => {
    const user = userByNr.get(o.kdNr);
    const repair = repairByNr.get(o.nr);
    return {
      nr: o.nr,
      info: o.info,
      date: o.date,
      kdNr: o.kdNr,
      department: departmentFromOrder(o),
      customerName: customerName(o.customer) || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null),
      phone: o.customer?.phone || null,
      mobile: o.customer?.mobile || null,
      city: [o.customer?.zip, o.customer?.city].filter(Boolean).join(' ') || null,
      hasApp: !!user,
      repairId: repair?.id || null,
      contactedAt: o.quoteContactedAt || null,
      response: repair?.quoteResponse || null,
      respondedAt: repair?.quoteRespondedAt || null,
      message: repair?.quoteMessage || null,
      messageAt: repair?.quoteMessageAt || null,
    };
  });
  return {
    items,
    counts: {
      noApp: items.filter((i) => !i.hasApp).length,
      app: items.filter((i) => i.hasApp).length,
      answered: items.filter((i) => i.response).length,
    },
  };
}

async function findKvaOrder(nr) {
  const order = await TaifunOrder.findOne({ where: { nr: String(nr), vanishedAt: null } });
  if (!order) throw new NotFoundError('Auftrag');
  return order;
}

// Without app (WhatsApp/phone) or by hand: tick "angeschrieben" on/off.
async function setContacted(nr, contacted) {
  const order = await findKvaOrder(nr);
  await order.update({ quoteContactedAt: contacted ? new Date() : null });
  return { nr: order.nr, contactedAt: order.quoteContactedAt };
}

// App customer: staff message about the KVA, as notification + push. The text
// also stays on the repair, so the customer sees it on the repair page.
async function sendMessage(nr, text) {
  const message = String(text || '').trim().slice(0, 1500);
  if (!message) throw new AppError('Bitte eine Nachricht eingeben', 400, 'MESSAGE_REQUIRED');
  const order = await findKvaOrder(nr);
  const repair = await Repair.findOne({ where: { taifunRepairId: order.nr } });
  if (!repair) throw new AppError('Der Kunde hat kein App-Konto zu diesem Auftrag', 400, 'NO_APP_ACCOUNT');
  const now = new Date();
  await repair.update({ quoteMessage: message, quoteMessageAt: now });
  await order.update({ quoteContactedAt: now });
  await Notification.create({
    userId: repair.userId,
    title: 'Nachricht zu Ihrem Kostenvoranschlag',
    message,
    type: 'repair_status',
    category: 'repair',
    relatedId: repair.id,
    relatedType: 'repair',
    deepLink: `/repairs/${repair.id}`,
  });
  return { nr: order.nr, messageAt: now };
}

// The customer answers in the app. Staff get a notification in the PC tool.
async function respond(repairId, userId, decision) {
  if (!RESPONSES.includes(decision)) throw new AppError('Ungültige Antwort', 400, 'BAD_RESPONSE');
  const repair = await Repair.findOne({ where: { id: repairId, userId } });
  if (!repair) throw new NotFoundError('Repair');
  if (repair.status !== 'quote_created') {
    throw new AppError('Für diesen Auftrag gibt es keinen offenen Kostenvoranschlag', 400, 'NO_OPEN_QUOTE');
  }
  const now = new Date();
  await repair.update({
    quoteResponse: decision,
    quoteRespondedAt: now,
    statusHistory: [
      ...(repair.statusHistory || []),
      { status: 'quote_created', timestamp: now.toISOString(), note: `KVA ${RESPONSE_LABEL[decision]} (in der App)` },
    ],
  });

  try {
    const customer = await User.findByPk(userId, { attributes: ['firstName', 'lastName', 'customerNumber'] });
    const who = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || `Kd ${customer.customerNumber}` : 'Kunde';
    const staff = await User.findAll({ where: { role: { [Op.in]: KVA_STAFF_ROLES }, isActive: true }, attributes: ['id'] });
    await Notification.bulkCreate(staff.map((u) => ({
      userId: u.id,
      title: `KVA ${RESPONSE_LABEL[decision]}: ${who}`,
      message: `${repair.deviceName} (Auftrag ${repair.repairNumber})`,
      type: 'repair_status',
      category: 'repair',
      relatedId: repair.id,
      relatedType: 'kva',
    })));
  } catch (e) {
    logger.warn('KVA staff notification failed', { repairId, error: e.message });
  }
  return repair;
}

module.exports = { listKva, setContacted, sendMessage, respond, RESPONSES, KVA_STAFF_ROLES };
