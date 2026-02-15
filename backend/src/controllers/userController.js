const userService = require('../services/userService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { User, Post, Comment, Like, Notification, FCMToken, AuditLog } = require('../models');

// ──────────────────────────────────────────────
// Profile endpoints
// ──────────────────────────────────────────────

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id, User);

  res.json({
    success: true,
    data: { user },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, address } = req.body;

  const user = await userService.updateProfile(
    req.user.id,
    { firstName, lastName, phone, address },
    User
  );

  res.json({
    success: true,
    data: { user },
  });
});

const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_FILE', message: 'No avatar file provided' },
    });
  }

  const filePath = `/uploads/${req.file.filename}`;
  const result = await userService.updateAvatar(req.user.id, filePath, User);

  res.json({
    success: true,
    data: result,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await userService.changePassword(req.user.id, { currentPassword, newPassword }, User);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

// ──────────────────────────────────────────────
// Admin endpoints
// ──────────────────────────────────────────────

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, role } = req.query;

  const result = await userService.listUsers({ page, limit, search, role }, User);

  res.json({
    success: true,
    data: result,
  });
});

const changeUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const result = await userService.changeUserRole(id, role, req.user, { User, AuditLog }, req);

  res.json({
    success: true,
    data: result,
  });
});

const updatePermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  const result = await userService.updatePermissions(id, permissions, req.user, { User, AuditLog }, req);

  res.json({
    success: true,
    data: result,
  });
});

const getUserDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await userService.getUserDetail(id, User);

  res.json({
    success: true,
    data: { user },
  });
});

const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await userService.deactivateUser(id, req.user, { User, AuditLog }, req);

  res.json({
    success: true,
    data: result,
  });
});

const getAuditLog = asyncHandler(async (req, res) => {
  const { page, limit, action, userId } = req.query;

  const result = await userService.getAuditLogs({ page, limit, action, userId }, { AuditLog, User });

  res.json({
    success: true,
    data: result,
  });
});

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
  listUsers,
  changeUserRole,
  updatePermissions,
  getUserDetail,
  deactivateUser,
  getAuditLog,
};
