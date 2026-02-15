const { Op } = require('sequelize');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const { generateRepairNumber } = require('../utils/crypto');
const logger = require('../utils/logger');

// ──────────────────────────────────────────────
// REPAIRS
// ──────────────────────────────────────────────

async function getUserRepairs(userId, query, models) {
  const { Repair, User } = models;
  const { filter, page = 1, limit = 20 } = query;

  const where = { userId };

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: repairs, count: total } = await Repair.findAndCountAll({
    where,
    include: [
      { model: User, as: 'technician', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  return {
    repairs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getAllRepairs(query, models) {
  const { Repair, User } = models;
  const { filter, page = 1, limit = 20 } = query;

  const where = {};

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: repairs, count: total } = await Repair.findAndCountAll({
    where,
    include: [
      { model: User, as: 'customer', attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'phone', 'customerNumber'] },
      { model: User, as: 'technician', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  return {
    repairs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getRepairById(repairId, userId, userRole, models) {
  const { Repair, User } = models;

  const repair = await Repair.findByPk(repairId, {
    include: [
      { model: User, as: 'customer', attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'phone', 'customerNumber'] },
      { model: User, as: 'technician', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
  });

  if (!repair) {
    throw new NotFoundError('Repair');
  }

  // Only allow owner or admin/service_manager to view
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'service_manager';
  if (repair.userId !== userId && !isAdmin) {
    throw new AppError('You do not have permission to view this repair', 403, 'FORBIDDEN');
  }

  return repair;
}

async function getRepairStatus(repairId, userId, userRole, models) {
  const { Repair } = models;

  const repair = await Repair.findByPk(repairId, {
    attributes: ['id', 'repairNumber', 'status', 'statusHistory', 'estimatedCompletion', 'updatedAt'],
  });

  if (!repair) {
    throw new NotFoundError('Repair');
  }

  return {
    repairNumber: repair.repairNumber,
    status: repair.status,
    statusHistory: repair.statusHistory,
    estimatedCompletion: repair.estimatedCompletion,
    lastUpdated: repair.updatedAt,
  };
}

async function createRepair(data, userId, models) {
  const { Repair, User, Notification } = models;

  const { deviceName, deviceDescription, devicePhoto, problemDescription, warrantyStatus } = data;

  const repairNumber = generateRepairNumber();

  const repair = await Repair.create({
    userId,
    repairNumber,
    deviceName,
    deviceDescription: deviceDescription || null,
    devicePhoto: devicePhoto || null,
    problemDescription,
    warrantyStatus: warrantyStatus || null,
    status: 'in_repair',
    statusHistory: [
      {
        status: 'in_repair',
        timestamp: new Date().toISOString(),
        note: 'Reparaturauftrag eingegangen',
      },
    ],
  });

  // Notify admins/service managers
  const managers = await User.findAll({
    where: {
      role: { [Op.in]: ['admin', 'super_admin', 'service_manager'] },
      isActive: true,
    },
    attributes: ['id'],
  });

  const notifications = managers.map((manager) => ({
    userId: manager.id,
    title: 'Neuer Reparaturauftrag',
    message: `Reparatur ${repairNumber}: ${deviceName} – ${problemDescription.substring(0, 80)}`,
    type: 'repair_status',
    category: 'repair',
    relatedId: repair.id,
    relatedType: 'repair',
    deepLink: `/repairs/${repair.id}`,
  }));

  if (notifications.length > 0) {
    await Notification.bulkCreate(notifications);
  }

  logger.info('Repair created', { repairId: repair.id, repairNumber, userId });

  // Re-fetch with associations
  const fullRepair = await Repair.findByPk(repair.id, {
    include: [
      { model: User, as: 'customer', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
  });

  return fullRepair;
}

async function updateRepairStatus(repairId, data, updatedByUserId, models) {
  const { Repair, User, Notification } = models;

  const repair = await Repair.findByPk(repairId);
  if (!repair) {
    throw new NotFoundError('Repair');
  }

  const { status, note, estimatedCompletion, cost, technicianId } = data;

  const validStatuses = ['in_repair', 'quote_created', 'parts_ordered', 'repair_done', 'ready'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid repair status', 400, 'INVALID_STATUS');
  }

  const oldStatus = repair.status;

  // Update status history
  const history = repair.statusHistory || [];
  history.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || null,
    updatedBy: updatedByUserId,
  });

  repair.status = status;
  repair.statusHistory = history;

  if (estimatedCompletion) repair.estimatedCompletion = estimatedCompletion;
  if (cost !== undefined) repair.cost = cost;
  if (technicianId) {
    repair.technicianId = technicianId;
    // Also resolve technician name
    const tech = await User.findByPk(technicianId, { attributes: ['firstName', 'lastName'] });
    if (tech) {
      repair.technicianName = `${tech.firstName || ''} ${tech.lastName || ''}`.trim();
    }
  }

  // If ready, set actual completion date
  if (status === 'ready') {
    repair.actualCompletion = new Date().toISOString().split('T')[0];
  }

  await repair.save();

  // Create notification for the customer
  let notificationType = 'repair_status';
  let notificationTitle = 'Reparatur-Status aktualisiert';
  let notificationMessage = `Ihre Reparatur ${repair.repairNumber} hat jetzt den Status: ${status}.`;

  if (status === 'ready') {
    notificationType = 'repair_ready';
    notificationTitle = 'Reparatur abholbereit!';
    notificationMessage = `Ihre Reparatur ${repair.repairNumber} (${repair.deviceName}) ist fertig und kann abgeholt werden.`;
  }

  await Notification.create({
    userId: repair.userId,
    title: notificationTitle,
    message: notificationMessage,
    type: notificationType,
    category: 'repair',
    relatedId: repair.id,
    relatedType: 'repair',
    deepLink: `/repairs/${repair.id}`,
  });

  logger.info('Repair status updated', { repairId, oldStatus, newStatus: status, updatedBy: updatedByUserId });

  return repair;
}

async function getRepairInvoice(repairId, userId, userRole, models) {
  const { Repair } = models;

  const repair = await Repair.findByPk(repairId, {
    attributes: ['id', 'userId', 'status', 'invoiceUrl', 'repairNumber'],
  });

  if (!repair) {
    throw new NotFoundError('Repair');
  }

  // Only owner or admin can access invoice
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'service_manager';
  if (repair.userId !== userId && !isAdmin) {
    throw new AppError('You do not have permission to access this invoice', 403, 'FORBIDDEN');
  }

  if (repair.status !== 'ready') {
    throw new AppError('Invoice is only available for ready repairs', 400, 'REPAIR_NOT_READY');
  }

  if (!repair.invoiceUrl) {
    throw new NotFoundError('Invoice');
  }

  return {
    repairNumber: repair.repairNumber,
    invoiceUrl: repair.invoiceUrl,
  };
}

async function reviewRepair(repairId, userId, data, models) {
  const { Repair, ServiceRating } = models;

  const repair = await Repair.findByPk(repairId);
  if (!repair) {
    throw new NotFoundError('Repair');
  }

  if (repair.userId !== userId) {
    throw new AppError('You can only review your own repairs', 403, 'FORBIDDEN');
  }

  if (repair.status !== 'ready') {
    throw new AppError('You can only review ready repairs', 400, 'REPAIR_NOT_READY');
  }

  if (repair.isRated) {
    throw new AppError('You have already reviewed this repair', 409, 'ALREADY_RATED');
  }

  const { overallRating, qualityRating, friendlinessRating, waitTimeRating, valueRating, text } = data;

  if (overallRating < 1 || overallRating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
  }

  const rating = await ServiceRating.create({
    userId,
    repairId: repair.id,
    type: 'repair',
    overallRating,
    qualityRating: qualityRating || null,
    friendlinessRating: friendlinessRating || null,
    waitTimeRating: waitTimeRating || null,
    valueRating: valueRating || null,
    text: text || null,
  });

  // Mark repair as rated
  repair.isRated = true;
  await repair.save();

  logger.info('Repair reviewed', { repairId, userId, overallRating });

  return rating;
}

module.exports = {
  getUserRepairs,
  getAllRepairs,
  getRepairById,
  getRepairStatus,
  createRepair,
  updateRepairStatus,
  getRepairInvoice,
  reviewRepair,
};
