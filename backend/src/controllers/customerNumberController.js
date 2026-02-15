const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { CustomerNumberRequest, User, Notification } = require('../models');

// POST /customer-number/request - Customer submits a request
const createRequest = asyncHandler(async (req, res) => {
  const { phone, address, isExistingCustomer, message } = req.body;
  const userId = req.user.id;

  // Check if user already has a customer number
  const user = await User.findByPk(userId, { attributes: ['id', 'customerNumber'] });
  if (user && user.customerNumber) {
    throw new AppError('Sie haben bereits eine Kundennummer.', 400, 'ALREADY_HAS_CUSTOMER_NUMBER');
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
  getAllRequests,
  approveRequest,
  rejectRequest,
};
