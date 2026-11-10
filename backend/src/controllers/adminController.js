const adminService = require('../services/adminService');
const { asyncHandler } = require('../middlewares/errorHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();

  res.json({
    success: true,
    data: stats,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, role, status } = req.query;

  const result = await adminService.getUserList({
    page: page || 1,
    limit: limit || 20,
    search,
    role,
    status,
  });

  res.json({
    success: true,
    data: result.users,
    pagination: result.pagination,
  });
});

const getAuditLog = asyncHandler(async (req, res) => {
  const { page, limit, action, userId, from, to } = req.query;

  const result = await adminService.getAuditLog({
    page: page || 1,
    limit: limit || 50,
    action,
    userId,
    from,
    to,
  });

  res.json({
    success: true,
    data: result.logs,
    pagination: result.pagination,
  });
});

const sendBroadcast = asyncHandler(async (req, res) => {
  const { title, message, type, roles, role } = req.body;

  const result = await adminService.sendBroadcast({
    title,
    message,
    type,
    roles,
    role,
  });

  res.json({
    success: true,
    message: `Benachrichtigung an ${result.recipientCount} Benutzer gesendet`,
    data: result,
  });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getDetailedAnalytics();

  res.json({
    success: true,
    data: analytics,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, address } = req.body;
  // '' and spaces mean "no number"
  const customerNumber = req.body.customerNumber === undefined ? undefined
    : (String(req.body.customerNumber ?? '').trim() || null);
  const { User, Repair } = require('../models');
  const { Op } = require('sequelize');

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const prevNumber = user.customerNumber;

  // Other staff may only change customer accounts, and only the number
  const isAdminUser = ['admin', 'super_admin'].includes(req.user.role);
  if (!isAdminUser) {
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Nur bei Kundenkonten möglich.' } });
    }
    if (email !== undefined || address !== undefined) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Nur die Kundennummer kann geändert werden.' } });
    }
  }

  // A Taifun customer number belongs to one account only
  if (customerNumber && customerNumber !== prevNumber) {
    const owner = await User.findOne({
      where: { customerNumber, id: { [Op.ne]: user.id } },
      paranoid: false,
    });
    if (owner) {
      const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || '';
      return res.status(409).json({
        success: false,
        error: {
          code: 'CUSTOMER_NUMBER_TAKEN',
          message: `Die Kundennummer ${customerNumber} gehört schon zu ${name || 'einem anderen Konto'}.`,
        },
      });
    }
  }

  const updates = {};
  if (email !== undefined) updates.email = email;
  if (customerNumber !== undefined) updates.customerNumber = customerNumber;
  if (address !== undefined) updates.address = address;

  await user.update(updates);

  // Changed or removed number: the Taifun orders of the old number no longer
  // belong to this account. They are only a copy of Taifun and come back for
  // whoever gets that number.
  if (customerNumber !== undefined && prevNumber && customerNumber !== prevNumber) {
    await Repair.destroy({ where: { userId: user.id, taifunRepairId: { [Op.ne]: null } } });
  }

  // When a customer number is newly assigned, pull in the customer's Taifun
  // repairs and notify them — so their app immediately shows repairs and stops
  // asking for a number (same as the request-approval flow).
  const assignedNow = customerNumber !== undefined && customerNumber && customerNumber !== prevNumber;
  if (assignedNow) {
    try {
      const repairSync = require('../services/taifunRepairSync');
      await repairSync.syncRepairsForUser({ id: user.id, customerNumber });
    } catch (e) { /* non-blocking */ }
    try {
      const { Notification } = require('../models');
      await Notification.create({
        userId: user.id,
        title: 'Kundennummer zugewiesen',
        message: `Ihre Kundennummer ${customerNumber} wurde Ihrem Profil hinzugefügt.`,
        type: 'system', category: 'system', relatedId: user.id, relatedType: 'user',
      });
    } catch (e) { /* non-blocking */ }
  }

  res.json({
    success: true,
    data: user,
  });
});

// DELETE /api/admin/users/:id - hard-delete a customer + all their data
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authService = require('../services/authService');
  const models = require('../models');
  const result = await authService.adminDeleteUser(id, models);
  res.json({ success: true, data: result });
});

const getYearlyOverview = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  const result = await adminService.getYearlyOverview(year);

  res.json({
    success: true,
    data: result,
  });
});

const sendDirectMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, message } = req.body;
  const { User, Notification } = require('../models');
  const notificationService = require('../services/notificationService');

  const targetUser = await User.findByPk(id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Benutzer nicht gefunden' } });
  }

  await notificationService.createNotification(
    id,
    {
      title,
      message,
      type: 'system',
      category: 'system',
      deepLink: 'notifications',
      relatedType: 'direct_message',
    },
    { Notification }
  );

  res.json({
    success: true,
    message: `Nachricht an ${targetUser.firstName || targetUser.email} gesendet`,
  });
});

module.exports = {
  getDashboard,
  getUsers,
  getAuditLog,
  sendBroadcast,
  getAnalytics,
  updateUser,
  deleteUser,
  getYearlyOverview,
  sendDirectMessage,
};
