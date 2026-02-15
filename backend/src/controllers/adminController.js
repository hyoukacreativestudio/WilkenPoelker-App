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
  const { email, customerNumber, address } = req.body;
  const { User } = require('../models');

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const updates = {};
  if (email !== undefined) updates.email = email;
  if (customerNumber !== undefined) updates.customerNumber = customerNumber;
  if (address !== undefined) updates.address = address;

  await user.update(updates);

  res.json({
    success: true,
    data: user,
  });
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
  getYearlyOverview,
  sendDirectMessage,
};
