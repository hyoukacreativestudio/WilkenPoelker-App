const { Op } = require('sequelize');
const { hashPassword, comparePassword } = require('../utils/crypto');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Get a user's own profile by ID.
 */
async function getProfile(userId, User) {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password', 'refreshToken', 'emailVerificationToken', 'passwordResetToken', 'passwordResetExpires', 'pinCode'] },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

/**
 * Update profile fields (non-sensitive).
 */
async function updateProfile(userId, data, User) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  const allowedFields = ['firstName', 'lastName', 'phone', 'address'];
  const updates = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  await user.update(updates);

  logger.info('Profile updated', { userId });

  // Return sanitized user
  const updated = user.toJSON();
  delete updated.password;
  delete updated.refreshToken;
  delete updated.emailVerificationToken;
  delete updated.passwordResetToken;
  delete updated.passwordResetExpires;
  delete updated.pinCode;

  return updated;
}

/**
 * Update user avatar / profile picture.
 */
async function updateAvatar(userId, filePath, User) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  await user.update({ profilePicture: filePath });

  logger.info('Avatar updated', { userId });

  return { profilePicture: user.profilePicture };
}

/**
 * Change password (requires current password verification).
 */
async function changePassword(userId, { currentPassword, newPassword }, User) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }

  const hashedPassword = await hashPassword(newPassword);
  await user.update({
    password: hashedPassword,
    refreshToken: null, // Invalidate all sessions
  });

  logger.info('Password changed', { userId });
}

// ──────────────────────────────────────────────
// Admin operations
// ──────────────────────────────────────────────

/**
 * List users with pagination and optional search/role filter.
 */
async function listUsers({ page = 1, limit = 20, search, role }, User) {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { username: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { customerNumber: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password', 'refreshToken', 'emailVerificationToken', 'passwordResetToken', 'passwordResetExpires', 'pinCode'] },
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    users: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Change a user's role (super_admin only). Creates audit log entry.
 */
async function changeUserRole(targetId, newRole, adminUser, { User, AuditLog }, req) {
  const target = await User.findByPk(targetId);
  if (!target) {
    throw new NotFoundError('User');
  }

  const previousRole = target.role;

  if (previousRole === newRole) {
    throw new AppError('User already has this role', 400, 'SAME_ROLE');
  }

  await target.update({ role: newRole });

  // Audit log
  await AuditLog.create({
    userId: adminUser.id,
    action: 'CHANGE_ROLE',
    entityType: 'User',
    entityId: targetId,
    previousValues: { role: previousRole },
    newValues: { role: newRole },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  logger.info('User role changed', { targetId, previousRole, newRole, adminId: adminUser.id });

  return { id: target.id, username: target.username, role: newRole };
}

/**
 * Update a user's permissions array. Creates audit log entry.
 */
async function updatePermissions(targetId, permissions, adminUser, { User, AuditLog }, req) {
  const target = await User.findByPk(targetId);
  if (!target) {
    throw new NotFoundError('User');
  }

  const previousPermissions = target.permissions || [];

  await target.update({ permissions });

  // Audit log
  await AuditLog.create({
    userId: adminUser.id,
    action: 'UPDATE_PERMISSIONS',
    entityType: 'User',
    entityId: targetId,
    previousValues: { permissions: previousPermissions },
    newValues: { permissions },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  logger.info('User permissions updated', { targetId, adminId: adminUser.id });

  return { id: target.id, username: target.username, permissions };
}

/**
 * Get a single user's detail (admin view).
 */
async function getUserDetail(targetId, User) {
  const user = await User.findByPk(targetId, {
    attributes: { exclude: ['password', 'refreshToken', 'emailVerificationToken', 'passwordResetToken', 'passwordResetExpires', 'pinCode'] },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

/**
 * Deactivate a user account. Creates audit log entry.
 */
async function deactivateUser(targetId, adminUser, { User, AuditLog }, req) {
  const target = await User.findByPk(targetId);
  if (!target) {
    throw new NotFoundError('User');
  }

  if (!target.isActive) {
    throw new AppError('User is already deactivated', 400, 'ALREADY_DEACTIVATED');
  }

  // Prevent deactivating yourself
  if (target.id === adminUser.id) {
    throw new AppError('You cannot deactivate your own account', 400, 'SELF_DEACTIVATION');
  }

  await target.update({ isActive: false, refreshToken: null });

  // Audit log
  await AuditLog.create({
    userId: adminUser.id,
    action: 'DEACTIVATE_USER',
    entityType: 'User',
    entityId: targetId,
    previousValues: { isActive: true },
    newValues: { isActive: false },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  logger.info('User deactivated', { targetId, adminId: adminUser.id });

  return { id: target.id, username: target.username, isActive: false };
}

/**
 * Get paginated audit logs with optional filters.
 */
async function getAuditLogs({ page = 1, limit = 20, action, userId }, { AuditLog, User }) {
  const offset = (page - 1) * limit;
  const where = {};

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'actor',
        attributes: ['id', 'username', 'email', 'role'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    logs: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

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
  getAuditLogs,
};
