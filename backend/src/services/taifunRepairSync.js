const { Op } = require('sequelize');
const { Repair, TaifunOrder, User, Notification } = require('../models');
const logger = require('../utils/logger');
const pushService = require('./pushService');
const { appStatusToRepair } = require('./taifunStatusMap');

// Notify the customer that their repair status changed. In-app notification +
// push. Only called on a real status transition of an existing repair (never on
// first import). Non-blocking: failures are logged, not thrown.
async function notifyStatusChange(repair, mapping, deviceName) {
  const isReady = mapping.repairStatus === 'ready';
  const title = isReady ? 'Abholbereit!' : 'Status aktualisiert';
  const body = isReady
    ? `${deviceName} ist abholbereit.`
    : `${repair.repairNumber}: ${mapping.label}`;

  try {
    await Notification.create({
      userId: repair.userId,
      title,
      message: body,
      type: isReady ? 'repair_ready' : 'repair_status',
      category: 'repair',
      relatedId: repair.id,
      relatedType: 'repair',
      deepLink: `/repairs/${repair.id}`,
    });
  } catch (err) {
    logger.warn('Taifun repair notification failed', { repairId: repair.id, error: err.message });
  }

  pushService
    .sendToUser(repair.userId, {
      title,
      body,
      data: { type: 'repair_status', repairId: repair.id },
    })
    .catch(() => {});
}

// Turns Taifun work orders into app-visible Repair records.
//
// One Taifun order (keyed by its Nr) -> one Repair (taifunRepairId = Nr).
// A Repair is only created for orders whose customer has an app account, i.e.
// a User whose customerNumber equals the order's KdNr. Orders without a matching
// user stay in taifun_orders; when that customer later registers or is assigned
// a number, syncRepairsForUser() backfills their repairs.
//
// Hidden/unknown Taifun stands (appHidden=true) and storno/vanished orders never
// become Repairs.

function today() {
  return new Date().toISOString().split('T')[0];
}

// Create or refresh a single Repair from a TaifunOrder for a known user.
async function upsertRepairFromOrder(order, userId) {
  const mapping = appStatusToRepair(order.appStatus);
  if (!mapping) return 'skipped'; // hidden/unknown — shouldn't reach here

  const nowIso = new Date().toISOString();
  const deviceName = order.info || `Taifun-Auftrag ${order.nr}`;

  const existing = await Repair.findOne({ where: { taifunRepairId: order.nr } });

  if (!existing) {
    await Repair.create({
      userId,
      taifunRepairId: order.nr,
      repairNumber: order.nr, // Taifun order number is the natural, unique key
      deviceName,
      deviceDescription: order.info || null,
      category: mapping.category,
      status: mapping.repairStatus,
      estimatedCompletion: order.date || null,
      statusHistory: [
        { status: mapping.repairStatus, timestamp: nowIso, note: `Aus Taifun importiert (${mapping.label})` },
      ],
    });
    return 'created';
  }

  // Never override a repair the customer already acknowledged as picked up
  // (it's on its way to the 7-day hard-delete cleanup).
  if (existing.acknowledgedAt) return 'unchanged';

  const statusChanged = existing.status !== mapping.repairStatus;
  const changed =
    statusChanged ||
    existing.category !== mapping.category ||
    existing.userId !== userId;

  if (!changed) return 'unchanged';

  const history = Array.isArray(existing.statusHistory) ? existing.statusHistory.slice() : [];
  if (statusChanged) {
    history.push({ status: mapping.repairStatus, timestamp: nowIso, note: `Status aus Taifun: ${mapping.label}` });
  }

  await existing.update({
    userId,
    category: mapping.category,
    status: mapping.repairStatus,
    statusHistory: history,
    ...(mapping.repairStatus === 'ready' && !existing.actualCompletion
      ? { actualCompletion: today() }
      : {}),
  });

  // Push + in-app notification ONLY when the status actually changed.
  if (statusChanged) {
    await notifyStatusChange(existing, mapping, deviceName);
  }
  return 'updated';
}

// Sync a list of TaifunOrder instances into Repairs.
async function syncOrders(orders) {
  let created = 0;
  let updated = 0;
  let skippedNoUser = 0;
  if (!orders || orders.length === 0) return { created, updated, skippedNoUser };

  // Batch-resolve app users by customerNumber (= Taifun KdNr).
  const kdNrs = [...new Set(orders.map((o) => o.kdNr).filter(Boolean))];
  const users = kdNrs.length
    ? await User.findAll({
        where: { customerNumber: { [Op.in]: kdNrs } },
        attributes: ['id', 'customerNumber'],
      })
    : [];
  const userIdByNr = new Map(users.map((u) => [u.customerNumber, u.id]));

  for (const order of orders) {
    const userId = order.kdNr ? userIdByNr.get(order.kdNr) : null;
    if (!userId) { skippedNoUser++; continue; }
    try {
      const res = await upsertRepairFromOrder(order, userId);
      if (res === 'created') created++;
      else if (res === 'updated') updated++;
    } catch (err) {
      logger.error('Repair upsert from Taifun order failed', { nr: order.nr, error: err.message });
    }
  }
  return { created, updated, skippedNoUser };
}

// Called after an XML import: sync just the orders that were in the push.
async function syncRepairsForOrderNrs(nrs) {
  if (!nrs || nrs.length === 0) return { created: 0, updated: 0, skippedNoUser: 0 };
  const orders = await TaifunOrder.findAll({
    where: { nr: { [Op.in]: nrs }, appHidden: false, vanishedAt: null, storno: false },
  });
  return syncOrders(orders);
}

// Backfill: when a user gets a customerNumber (registration or admin approval),
// create repairs from all their existing visible Taifun orders. Accepts a User
// instance/object with { id, customerNumber }.
async function syncRepairsForUser(user) {
  const userId = user?.id;
  const kdNr = user?.customerNumber;
  if (!userId || !kdNr) return { created: 0, updated: 0, skippedNoUser: 0 };

  const orders = await TaifunOrder.findAll({
    where: { kdNr, appHidden: false, vanishedAt: null, storno: false },
  });
  return syncOrders(orders);
}

module.exports = {
  syncRepairsForOrderNrs,
  syncRepairsForUser,
  syncOrders,
};
