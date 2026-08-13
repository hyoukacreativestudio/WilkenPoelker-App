const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const config = require('../config/env');
const { sequelize } = require('../config/database');
const { hashPassword, comparePassword, generateToken, hashToken } = require('../utils/crypto');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

// Normalize a street for fuzzy comparison: lowercase, unify "straße/strasse/str."
// to "str", drop everything non-alphanumeric. So "Dresdener Str." == "Dresdener Straße".
function normStreet(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/stra(ss|s)?e|str\.?/g, 'str')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\d+$/, ''); // drop a trailing house number if it slipped into the street
}

// Try to find a matching Taifun customer by last name + zip (+ street when it
// helps). Returns kdNr on a UNIQUE match, null otherwise (never assigns a wrong
// number silently). Zip is compared exactly (numeric, dialect-agnostic).
async function findTaifunCustomerNumber({ firstName, lastName, address }) {
  const { TaifunCustomer } = require('../models');
  if (!TaifunCustomer || !lastName || !address?.zip) return null;

  const last = String(lastName).trim().toLowerCase();
  const zip = String(address.zip).trim();
  const street = normStreet(address.street);

  const candidates = await TaifunCustomer.findAll({
    where: { zip },
    attributes: ['kdNr', 'name1', 'name2', 'street', 'zip'],
  });

  // Last name may live in name1 (Firma) or name2 (person)
  const byName = candidates.filter((c) =>
    `${(c.name1 || '')} ${(c.name2 || '')}`.toLowerCase().includes(last)
  );
  const byStreet = street ? byName.filter((c) => normStreet(c.street) === street) : [];

  // Prefer a street-confirmed unique match; otherwise a unique name+zip match.
  let match = null;
  if (byStreet.length === 1) match = byStreet[0];
  else if (byName.length === 1) match = byName[0];

  logger.info('Taifun auto-match customer number', {
    zip, lastName: last, candidatesAtZip: candidates.length,
    byName: byName.length, byStreet: byStreet.length, matched: match?.kdNr || null,
  });

  return match && match.kdNr ? match.kdNr : null;
}

// Re-check a user WITHOUT a customer number against Taifun and assign it if a
// unique match is found. Runs on every login and on demand (customer taps
// "Kundennummer anfragen"). Once a number is set, this is a no-op forever.
// Returns the assigned number, or null.
async function tryAutoAssignCustomerNumber(user) {
  if (!user || user.customerNumber) return null;
  const { User } = require('../models');
  let kdNr = null;
  try {
    kdNr = await findTaifunCustomerNumber({
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address || {},
    });
  } catch (err) {
    logger.warn('Auto customer-number match failed', { userId: user.id, error: err.message });
    return null;
  }
  if (!kdNr) return null;

  // Never steal a number already linked to someone else.
  const taken = await User.findOne({ where: { customerNumber: kdNr } });
  if (taken) return null;

  user.customerNumber = kdNr;
  await user.save();
  logger.info('Auto-assigned customer number on check', { userId: user.id, customerNumber: kdNr });

  // Pull in any existing Taifun orders as repairs (non-blocking).
  try {
    const repairSync = require('./taifunRepairSync');
    await repairSync.syncRepairsForUser({ id: user.id, customerNumber: kdNr });
  } catch (err) {
    logger.warn('Repair backfill after auto-assign failed', { userId: user.id, error: err.message });
  }
  return kdNr;
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function generateRefreshToken(user, rememberMe = false) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: rememberMe ? '30d' : config.jwt.refreshExpiresIn }
  );
}

async function registerUser(data, User, taifunDb) {
  const { username, email, password, customerNumber, firstName, lastName, phone, address, dsgvoAccepted } = data;

  // Check DSGVO acceptance
  if (!dsgvoAccepted) {
    throw new AppError('DSGVO consent is required', 400, 'DSGVO_REQUIRED');
  }

  // Check if email already exists
  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ where: { username } });
  if (existingUsername) {
    throw new AppError('This username is already taken', 409, 'USERNAME_EXISTS');
  }

  // Validate customer number against Taifun DB (optional)
  let customerData = null;
  if (customerNumber) {
    customerData = await taifunDb.validateCustomerNumber(customerNumber);
    if (!customerData) {
      throw new AppError('Customer number not found in our system', 400, 'INVALID_CUSTOMER_NUMBER');
    }

    // Check if customer number already registered
    const existingCustomer = await User.findOne({ where: { customerNumber } });
    if (existingCustomer) {
      throw new AppError('This customer number is already registered', 409, 'CUSTOMER_NUMBER_EXISTS');
    }
  }

  // Auto-match Taifun customer number by name + address when the user did not
  // enter one. Silent: unique match assigns, ambiguous/none leaves it empty
  // so the customer can request approval manually.
  let autoMatchedNumber = null;
  if (!customerNumber) {
    try {
      autoMatchedNumber = await findTaifunCustomerNumber({ firstName, lastName, address });
      if (autoMatchedNumber) {
        const taken = await User.findOne({ where: { customerNumber: autoMatchedNumber } });
        if (taken) autoMatchedNumber = null;
      }
    } catch (err) {
      logger.warn('Auto customer-number match failed', { error: err.message });
    }
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate email verification token
  const verificationToken = generateToken();

  // Create user
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    customerNumber: customerNumber || autoMatchedNumber || null,
    firstName: firstName || customerData?.firstName || '',
    lastName: lastName || customerData?.lastName || '',
    phone: phone || null,
    address: address || { street: null, zip: null, city: null, country: 'Deutschland' },
    emailVerificationToken: hashToken(verificationToken),
    dsgvoAccepted: true,
    dsgvoAcceptedAt: new Date(),
    agbAccepted: true,
    agbAcceptedAt: new Date(),
  });

  logger.info('New user registered', { userId: user.id, email });

  // If the user already has a customer number (entered or auto-matched), pull in
  // any existing Taifun orders for them as Repairs. Non-blocking.
  if (user.customerNumber) {
    try {
      const repairSync = require('./taifunRepairSync');
      const r = await repairSync.syncRepairsForUser({ id: user.id, customerNumber: user.customerNumber });
      if (r.created) logger.info('Backfilled Taifun repairs for new user', { userId: user.id, ...r });
    } catch (err) {
      logger.warn('Repair backfill on registration failed', { userId: user.id, error: err.message });
    }
  }

  return {
    user: sanitizeUser(user),
    verificationToken,
  };
}

async function loginUser(data, User) {
  const { email, password, customerNumber, rememberMe } = data;

  // Find user by email (case-insensitive) or customer number
  let whereClause;
  if (email.includes('@')) {
    const { fn, col, where } = require('sequelize');
    whereClause = where(fn('lower', col('email')), String(email).trim().toLowerCase());
  } else {
    whereClause = { customerNumber: email };
  }

  const user = await User.findOne({ where: whereClause });

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
  }

  // Verify customer number (only if user has one and one was provided)
  if (customerNumber && user.customerNumber && user.customerNumber !== customerNumber) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check email verification
  if (!user.emailVerified) {
    throw new AppError('Bitte verifiziere zuerst deine E-Mail-Adresse.', 403, 'EMAIL_NOT_VERIFIED');
  }

  // Re-check the Taifun customer number on every login until one is linked.
  if (!user.customerNumber) {
    try { await tryAutoAssignCustomerNumber(user); } catch (e) { /* never block login */ }
  }

  // Generate tokens (rememberMe extends refresh token to 30 days)
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, rememberMe);

  // Store hashed refresh token
  user.refreshToken = hashToken(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  logger.info('User logged in', { userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

async function refreshTokens(refreshToken, User) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE');
  }

  const user = await User.findByPk(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated', 401, 'USER_NOT_FOUND');
  }

  // Verify stored refresh token hash matches
  const tokenHash = hashToken(refreshToken);
  if (user.refreshToken !== tokenHash) {
    // Token reuse detected - invalidate all sessions
    user.refreshToken = null;
    await user.save();
    throw new AppError('Refresh token has been revoked', 401, 'TOKEN_REVOKED');
  }

  // Rotate tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = hashToken(newRefreshToken);
  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: sanitizeUser(user),
  };
}

async function logoutUser(userId, User) {
  const user = await User.findByPk(userId);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
}

async function forgotPassword(email, User) {
  // Case-insensitive lookup: on Postgres a plain { email } match is
  // case-sensitive, so a differently-cased address silently found no user and
  // no reset mail was sent (verification mail worked because SMTP is fine).
  const { fn, col, where } = require('sequelize');
  const needle = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ where: where(fn('lower', col('email')), needle) });

  // Don't reveal if email exists
  if (!user) {
    logger.info('Password reset requested for unknown email', { email: needle });
    return;
  }

  const resetToken = generateToken();
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  logger.info('Password reset requested', { userId: user.id });

  return { resetToken, email: user.email, name: user.firstName || user.username };
}

async function resetPassword(token, newPassword, User) {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  if (user.passwordResetExpires < new Date()) {
    throw new AppError('Reset token has expired', 400, 'RESET_TOKEN_EXPIRED');
  }

  user.password = await hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.refreshToken = null; // Invalidate all sessions
  await user.save();

  logger.info('Password reset completed', { userId: user.id });
}

async function verifyEmail(token, User) {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    where: { emailVerificationToken: hashedToken },
  });

  if (!user) {
    throw new AppError('Invalid verification token', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  await user.save();

  logger.info('Email verified', { userId: user.id });
}

function sanitizeUser(user) {
  const data = user.toJSON ? user.toJSON() : { ...user };
  delete data.password;
  delete data.refreshToken;
  delete data.emailVerificationToken;
  delete data.passwordResetToken;
  delete data.passwordResetExpires;
  delete data.pinCode;
  return data;
}

// Delete a user + all their related rows atomically (DSGVO Art. 17). Shared by
// self-service delete (with password) and admin delete (without).
async function deleteUserCascade(user, models) {
  const { Notification, Repair, Appointment, Post, Comment, Like, Favorite, FCMToken, ServiceRating, AISession, AIUsage, Ticket, ChatMessage, ProductReview, StaffRating, ShareTracking, AuditLog } = models;
  const userId = user.id;
  await sequelize.transaction(async (t) => {
    const opts = { where: { userId }, transaction: t };
    await Notification.destroy(opts);
    await Repair.destroy(opts);
    await Appointment.destroy(opts);
    await Comment.destroy(opts);
    await Like.destroy(opts);
    await Favorite.destroy(opts);
    await FCMToken.destroy(opts);
    await ServiceRating.destroy(opts);
    await ProductReview.destroy(opts);
    await StaffRating.destroy(opts);
    await ShareTracking.destroy(opts);
    await AIUsage.destroy(opts);
    await AISession.destroy(opts);
    await ChatMessage.destroy(opts);
    await Ticket.destroy(opts);
    await AuditLog.destroy(opts);
    await Post.destroy(opts);
    await user.destroy({ transaction: t, force: true });
  });
}

async function deleteAccount(userId, password, models) {
  const { User } = models;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Falsches Passwort', 401, 'WRONG_PASSWORD');
  }

  await deleteUserCascade(user, models);
  logger.info('Account deleted (DSGVO Art. 17)', { userId });
  return { deleted: true };
}

// Admin hard-delete: no password, but staff/admin accounts are protected.
async function adminDeleteUser(userId, models) {
  const { User } = models;
  const user = await User.findByPk(userId, { paranoid: false });
  if (!user) {
    throw new NotFoundError('User');
  }
  if (user.role && user.role !== 'customer') {
    throw new AppError('Mitarbeiter-/Admin-Konten können hier nicht gelöscht werden', 403, 'CANNOT_DELETE_STAFF');
  }
  await deleteUserCascade(user, models);
  logger.info('Customer hard-deleted by admin', { userId });
  return { deleted: true };
}

module.exports = {
  findTaifunCustomerNumber,
  tryAutoAssignCustomerNumber,
  adminDeleteUser,
  generateAccessToken,
  generateRefreshToken,
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sanitizeUser,
  deleteAccount,
};
