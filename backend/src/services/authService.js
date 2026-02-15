const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { hashPassword, comparePassword, generateToken, hashToken } = require('../utils/crypto');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

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

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
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

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate email verification token
  const verificationToken = generateToken();

  // Create user
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    customerNumber: customerNumber || null,
    firstName: firstName || customerData?.firstName || '',
    lastName: lastName || customerData?.lastName || '',
    phone: phone || null,
    address: address || { street: null, zip: null, city: null, country: 'Deutschland' },
    emailVerificationToken: hashToken(verificationToken),
    dsgvoAccepted: true,
    dsgvoAcceptedAt: new Date(),
    agbAcceptedAt: new Date(),
  });

  logger.info('New user registered', { userId: user.id, email });

  return {
    user: sanitizeUser(user),
    verificationToken,
  };
}

async function loginUser(data, User) {
  const { email, password, customerNumber } = data;

  // Find user by email or last name
  const whereClause = email.includes('@')
    ? { email }
    : { lastName: email };

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

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

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
  const user = await User.findOne({ where: { email } });

  // Don't reveal if email exists
  if (!user) return;

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

async function deleteAccount(userId, password, models) {
  const { User, Notification, Repair, Appointment, Post, Comment, Like, Favorite, FCMToken, ServiceRating, AISession, AIUsage, Ticket, ChatMessage, ProductReview, StaffRating, ShareTracking, AuditLog } = models;

  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Falsches Passwort', 401, 'WRONG_PASSWORD');
  }

  // Delete all related data (DSGVO Art. 17 - Right to be Forgotten)
  await Notification.destroy({ where: { userId } });
  await Repair.destroy({ where: { userId } });
  await Appointment.destroy({ where: { userId } });
  await Comment.destroy({ where: { userId } });
  await Like.destroy({ where: { userId } });
  await Favorite.destroy({ where: { userId } });
  await FCMToken.destroy({ where: { userId } });
  await ServiceRating.destroy({ where: { userId } });
  await ProductReview.destroy({ where: { userId } });
  await StaffRating.destroy({ where: { userId } });
  await ShareTracking.destroy({ where: { userId } });
  await AIUsage.destroy({ where: { userId } });
  await AISession.destroy({ where: { userId } });
  await ChatMessage.destroy({ where: { userId } });
  await Ticket.destroy({ where: { userId } });
  await AuditLog.destroy({ where: { userId } });
  await Post.destroy({ where: { userId } });

  // Finally delete the user record (hard delete)
  await user.destroy();

  logger.info('Account deleted (DSGVO Art. 17)', { userId });

  return { deleted: true };
}

module.exports = {
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
