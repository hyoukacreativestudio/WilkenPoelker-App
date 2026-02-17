const authService = require('../services/authService');
const emailService = require('../services/emailService');
const { asyncHandler } = require('../middlewares/errorHandler');
const db = require('../models');
const { taifunDb } = require('../config/database');

const register = asyncHandler(async (req, res) => {
  const { username, email, password, customerNumber, firstName, lastName, phone, address, dsgvoAccepted } = req.body;

  const result = await authService.registerUser(
    { username, email, password, customerNumber, firstName, lastName, phone, address, dsgvoAccepted },
    db.User,
    taifunDb
  );

  // Send verification email (non-blocking)
  emailService
    .sendVerificationEmail(email, username, result.verificationToken)
    .catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email.',
    data: { user: result.user },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, customerNumber } = req.body;

  const result = await authService.loginUser(
    { email, password, customerNumber },
    db.User
  );

  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user.id, db.User);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  const result = await authService.refreshTokens(token, db.User);

  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await authService.forgotPassword(email, db.User);

  if (result) {
    emailService
      .sendPasswordResetEmail(result.email, result.name, result.resetToken)
      .catch(() => {});
  }

  // Always return success (don't reveal if email exists)
  res.json({
    success: true,
    message: 'If an account with this email exists, a reset link has been sent.',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  await authService.resetPassword(token, password, db.User);

  res.json({
    success: true,
    message: 'Password has been reset successfully. Please log in.',
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  await authService.verifyEmail(token, db.User);

  res.json({
    success: true,
    message: 'Email verified successfully.',
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await db.User.findOne({ where: { email } });

  // Don't reveal if email exists or is already verified
  if (!user || user.emailVerified) {
    return res.json({
      success: true,
      message: 'If an account with this email exists and is not yet verified, a new verification email has been sent.',
    });
  }

  const { generateToken, hashToken } = require('../utils/crypto');
  const verificationToken = generateToken();
  user.emailVerificationToken = hashToken(verificationToken);
  await user.save();

  // Send verification email (non-blocking)
  emailService
    .sendVerificationEmail(email, user.firstName || user.username, verificationToken)
    .catch(() => {});

  res.json({
    success: true,
    message: 'If an account with this email exists and is not yet verified, a new verification email has been sent.',
  });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  await authService.deleteAccount(userId, password, db);

  res.json({
    success: true,
    message: 'Account deleted',
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  deleteAccount,
};
