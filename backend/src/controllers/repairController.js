const repairService = require('../services/repairService');
const pushService = require('../services/pushService');
const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { Ticket, ChatMessage, User, Product, ProductReview, Favorite, Repair, Notification, ShareTracking } = require('../models');
const ServiceRating = require('../models/ServiceRating');

const models = { Repair, User, Notification, ServiceRating };

// ──────────────────────────────────────────────
// REPAIRS
// ──────────────────────────────────────────────

// GET / - User's repairs
const getUserRepairs = asyncHandler(async (req, res) => {
  const result = await repairService.getUserRepairs(req.user.id, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /all - All repairs (admin/service_manager only)
const getAllRepairs = asyncHandler(async (req, res) => {
  const result = await repairService.getAllRepairs(req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /:id - Repair detail with full status history
const getRepairById = asyncHandler(async (req, res) => {
  const repair = await repairService.getRepairById(req.params.id, req.user.id, req.user.role, models);

  res.json({
    success: true,
    data: { repair },
  });
});

// GET /:id/status - Current status only (lightweight for polling)
const getRepairStatus = asyncHandler(async (req, res) => {
  const status = await repairService.getRepairStatus(req.params.id, req.user.id, req.user.role, models);

  res.json({
    success: true,
    data: status,
  });
});

// POST / - Request new repair
const createRepair = asyncHandler(async (req, res) => {
  const { deviceName, deviceDescription, problemDescription, warrantyStatus } = req.body;

  // Process device photo if uploaded
  let devicePhoto = null;
  if (req.file) {
    const { uploadFile } = require('../services/uploadService');
    devicePhoto = await uploadFile(req.file, 'repairs');
  }

  const repair = await repairService.createRepair(
    { deviceName, deviceDescription, devicePhoto, problemDescription, warrantyStatus },
    req.user.id,
    models
  );

  // Send push notification to managers (non-blocking)
  const managerIds = await User.findAll({
    where: { role: ['admin', 'super_admin', 'service_manager'], isActive: true },
    attributes: ['id'],
  });
  if (managerIds.length > 0) {
    pushService
      .sendToMultiple(
        managerIds.map((m) => m.id),
        {
          title: 'Neuer Reparaturauftrag',
          body: `${repair.repairNumber}: ${deviceName}`,
          data: { type: 'new_repair', repairId: repair.id },
        }
      )
      .catch(() => {});
  }

  res.status(201).json({
    success: true,
    data: { repair },
  });
});

// PUT /:id/status - Update repair status (admin/service_manager)
const updateRepairStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new AppError('Status is required', 400, 'STATUS_REQUIRED');
  }

  const repair = await repairService.updateRepairStatus(req.params.id, req.body, req.user.id, models);

  // Send push notification to customer (non-blocking)
  const pushPayload = {
    title: status === 'ready' ? 'Reparatur abholbereit!' : 'Reparatur-Status aktualisiert',
    body: status === 'ready'
      ? `${repair.deviceName} ist fertig und kann abgeholt werden.`
      : `Reparatur ${repair.repairNumber}: ${status}`,
    data: { type: 'repair_status', repairId: repair.id },
  };
  pushService.sendToUser(repair.userId, pushPayload).catch(() => {});

  res.json({
    success: true,
    data: { repair },
  });
});

// GET /:id/invoice - Get invoice URL (only if completed)
const getRepairInvoice = asyncHandler(async (req, res) => {
  const invoice = await repairService.getRepairInvoice(req.params.id, req.user.id, req.user.role, models);

  res.json({
    success: true,
    data: invoice,
  });
});

// POST /:id/review - Rate completed repair
const reviewRepair = asyncHandler(async (req, res) => {
  const rating = await repairService.reviewRepair(req.params.id, req.user.id, req.body, models);

  res.status(201).json({
    success: true,
    data: { rating },
  });
});

// POST /:id/acknowledge - Customer acknowledges ready repair
const acknowledgeRepair = asyncHandler(async (req, res) => {
  const repair = await Repair.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!repair) {
    throw new NotFoundError('Repair');
  }

  if (repair.status !== 'ready') {
    throw new AppError('Reparatur ist nicht im Status "abholbereit"', 400, 'INVALID_STATUS');
  }

  if (repair.acknowledgedAt) {
    return res.json({ success: true, message: 'Bereits bestätigt', data: { repair } });
  }

  await repair.update({ acknowledgedAt: new Date() });

  // Notify staff that customer acknowledged
  const managers = await User.findAll({
    where: { role: ['admin', 'super_admin', 'service_manager'], isActive: true },
    attributes: ['id'],
  });
  if (managers.length > 0) {
    const customer = await User.findByPk(req.user.id, { attributes: ['firstName', 'lastName'] });
    const customerName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Kunde';
    pushService.sendToMultiple(
      managers.map((m) => m.id),
      {
        title: 'Abholung bestätigt',
        body: `${customerName} hat Kenntnis genommen: ${repair.deviceName} (${repair.repairNumber})`,
        data: { type: 'repair_status', repairId: repair.id },
      }
    ).catch(() => {});
  }

  res.json({
    success: true,
    message: 'Kenntnisnahme bestätigt',
    data: { repair },
  });
});

module.exports = {
  getUserRepairs,
  getAllRepairs,
  getRepairById,
  getRepairStatus,
  createRepair,
  updateRepairStatus,
  getRepairInvoice,
  reviewRepair,
  acknowledgeRepair,
};
