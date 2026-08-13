const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { CustomerNumberRequest, User, Notification } = require('../models');

// POST /customer-number/request - Customer submits a request
const createRequest = asyncHandler(async (req, res) => {
  const { phone, address, isExistingCustomer, message } = req.body;
  const userId = req.user.id;

  // Check if user already has a customer number
  const user = await User.findByPk(userId);
  if (user && user.customerNumber) {
    throw new AppError('Sie haben bereits eine Kundennummer.', 400, 'ALREADY_HAS_CUSTOMER_NUMBER');
  }

  // First, try to auto-match against Taifun right away — if the customer is
  // already in the system, link the number immediately, no admin step needed.
  if (address) {
    user.address = {
      street: address.street, zip: address.zip, city: address.city,
      country: address.country || 'Deutschland',
    };
  }
  if (phone && !user.phone) user.phone = phone;
  const authService = require('../services/authService');
  const autoAssigned = await authService.tryAutoAssignCustomerNumber(user);
  if (autoAssigned) {
    return res.status(201).json({
      success: true,
      data: { autoAssigned: true, customerNumber: autoAssigned, user: authService.sanitizeUser(user) },
    });
  }

  // Check if user already has a pending request
  const existingRequest = await CustomerNumberRequest.findOne({
    where: { userId, status: 'pending' },
  });
  if (existingRequest) {
    throw new AppError('Sie haben bereits eine ausstehende Anfrage.', 400, 'REQUEST_ALREADY_EXISTS');
  }

  // Update user phone and address if not already set
  const updateData = {};
  if (phone && !user.phone) updateData.phone = phone;
  if (address) {
    updateData.address = {
      street: address.street,
      zip: address.zip,
      city: address.city,
      country: address.country || 'Deutschland',
    };
  }
  if (Object.keys(updateData).length > 0) {
    await User.update(updateData, { where: { id: userId } });
  }

  const request = await CustomerNumberRequest.create({
    userId,
    phone,
    address: {
      street: address.street,
      zip: address.zip,
      city: address.city,
      country: address.country || 'Deutschland',
    },
    isExistingCustomer,
    message: message || null,
  });

  // Notify admins and managers
  const managers = await User.findAll({
    where: {
      role: ['admin', 'super_admin', 'service_manager', 'bike_manager', 'cleaning_manager', 'motor_manager'],
      isActive: true,
    },
    attributes: ['id'],
  });

  const notifications = managers.map((m) => ({
    userId: m.id,
    title: 'Neue Kundennummer-Anfrage',
    message: `${user.firstName || 'Ein Nutzer'} hat eine Kundennummer angefragt.`,
    type: 'system',
    category: 'system',
    relatedId: request.id,
    relatedType: 'customer_number_request',
    deepLink: `/admin/customer-requests/${request.id}`,
  }));

  if (notifications.length > 0) {
    await Notification.bulkCreate(notifications);
  }

  res.status(201).json({
    success: true,
    data: { request },
  });
});

// GET /customer-number/request/my - Get current user's request
const getMyRequest = asyncHandler(async (req, res) => {
  const request = await CustomerNumberRequest.findOne({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: { request },
  });
});

// GET /customer-number/requests - Admin: get all requests
const getAllRequests = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const where = {};
  if (status !== 'all') where.status = status;

  const requests = await CustomerNumberRequest.findAll({
    where,
    include: [
      { model: User, as: 'requester', attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'phone', 'profilePicture', 'customerNumber'] },
      { model: User, as: 'reviewer', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: { requests },
  });
});

// PUT /customer-number/requests/:id/approve - Admin approves a request
const approveRequest = asyncHandler(async (req, res) => {
  const { customerNumber } = req.body;
  const { id } = req.params;

  const request = await CustomerNumberRequest.findByPk(id, {
    include: [{ model: User, as: 'requester', attributes: ['id', 'username', 'firstName', 'customerNumber'] }],
  });

  if (!request) {
    throw new AppError('Anfrage nicht gefunden.', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'pending') {
    throw new AppError('Anfrage wurde bereits bearbeitet.', 400, 'ALREADY_PROCESSED');
  }

  // Check customer number uniqueness
  const existing = await User.findOne({ where: { customerNumber } });
  if (existing) {
    throw new AppError('Diese Kundennummer ist bereits vergeben.', 400, 'CUSTOMER_NUMBER_EXISTS');
  }

  // Update request
  request.status = 'approved';
  request.assignedCustomerNumber = customerNumber;
  request.reviewedBy = req.user.id;
  request.reviewedAt = new Date();
  await request.save();

  // Update user's customer number
  await User.update({ customerNumber }, { where: { id: request.userId } });

  // Backfill any existing Taifun orders for this customer as Repairs. Non-blocking.
  try {
    const repairSync = require('../services/taifunRepairSync');
    const r = await repairSync.syncRepairsForUser({ id: request.userId, customerNumber });
    if (r.created) {
      const logger = require('../utils/logger');
      logger.info('Backfilled Taifun repairs after number approval', { userId: request.userId, ...r });
    }
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('Repair backfill after approval failed', { userId: request.userId, error: err.message });
  }

  // Notify the customer
  await Notification.create({
    userId: request.userId,
    title: 'Kundennummer zugewiesen',
    message: `Ihre Kundennummer ${customerNumber} wurde Ihrem Profil hinzugefügt.`,
    type: 'system',
    category: 'system',
    relatedId: request.id,
    relatedType: 'customer_number_request',
  });

  res.json({
    success: true,
    data: { request },
  });
});

// POST /customer-number/self-check - re-run the Taifun match for the current
// user if they have no number yet. Called on repairs open / "Kundennummer
// anfragen" tap. Returns the (possibly newly assigned) number + fresh user.
const selfCheck = asyncHandler(async (req, res) => {
  const authService = require('../services/authService');
  const user = await User.findByPk(req.user.id);
  let assigned = null;
  if (user && !user.customerNumber) {
    assigned = await authService.tryAutoAssignCustomerNumber(user);
  }
  res.json({
    success: true,
    data: {
      customerNumber: user ? user.customerNumber : null,
      assigned: !!assigned,
      user: user ? authService.sanitizeUser(user) : null,
    },
  });
});

// PUT /customer-number/requests/:id/reject - Admin rejects a request
const rejectRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const request = await CustomerNumberRequest.findByPk(id);

  if (!request) {
    throw new AppError('Anfrage nicht gefunden.', 404, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'pending') {
    throw new AppError('Anfrage wurde bereits bearbeitet.', 400, 'ALREADY_PROCESSED');
  }

  request.status = 'rejected';
  request.reviewedBy = req.user.id;
  request.reviewedAt = new Date();
  request.reviewNote = note || null;
  await request.save();

  // Notify the customer
  await Notification.create({
    userId: request.userId,
    title: 'Kundennummer-Anfrage abgelehnt',
    message: note || 'Ihre Anfrage wurde leider abgelehnt.',
    type: 'system',
    category: 'system',
    relatedId: request.id,
    relatedType: 'customer_number_request',
  });

  res.json({
    success: true,
    data: { request },
  });
});

module.exports = {
  createRequest,
  getMyRequest,
  selfCheck,
  getAllRequests,
  approveRequest,
  rejectRequest,
};
