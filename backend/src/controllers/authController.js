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
  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  emailService
    .sendVerificationEmail(email, username, result.verificationToken, requestOrigin)
    .catch((err) => {
      console.error('Failed to send verification email:', err.message);
    });

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

  try {
    await authService.verifyEmail(token, db.User);

    // Return user-friendly HTML page
    res.send(`
      <!DOCTYPE html>
      <html lang="de">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>E-Mail bestätigt – WilkenPoelker</title>
      <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
      .card{background:#fff;border-radius:16px;padding:40px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}
      .icon{font-size:64px;margin-bottom:16px}.btn{display:inline-block;background:#2E7D32;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:20px}</style></head>
      <body><div class="card"><div class="icon">✅</div><h2>E-Mail bestätigt!</h2>
      <p>Deine E-Mail-Adresse wurde erfolgreich verifiziert. Du kannst dich jetzt in der App anmelden.</p>
      </div></body></html>
    `);
  } catch (err) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="de">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Fehler – WilkenPoelker</title>
      <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
      .card{background:#fff;border-radius:16px;padding:40px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}
      .icon{font-size:64px;margin-bottom:16px}</style></head>
      <body><div class="card"><div class="icon">❌</div><h2>Verifizierung fehlgeschlagen</h2>
      <p>${err.message || 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Verifizierungslink in der App an.'}</p>
      </div></body></html>
    `);
  }
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
  const resendOrigin = `${req.protocol}://${req.get('host')}`;
  emailService
    .sendVerificationEmail(email, user.firstName || user.username, verificationToken, resendOrigin)
    .catch((err) => {
      console.error('Failed to resend verification email:', err.message);
    });

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
