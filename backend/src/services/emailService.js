const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: config.email.user
      ? { user: config.email.user, pass: config.email.password }
      : undefined,
  });

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"WilkenPoelker" <${config.email.from}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Email send failed', {
      to,
      subject,
      error: error.message,
      code: error.code,
      response: error.response,
      host: config.email.host,
      port: config.email.port,
      from: config.email.from,
      hasPassword: !!config.email.password,
    });
    throw error; // Re-throw so callers know email failed
  }
}

async function testEmailConfig() {
  const transport = getTransporter();
  try {
    await transport.verify();
    return {
      success: true,
      host: config.email.host,
      port: config.email.port,
      from: config.email.from,
      user: config.email.user,
      hasPassword: !!config.email.password,
      passwordLength: config.email.password ? config.email.password.length : 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      host: config.email.host,
      port: config.email.port,
      from: config.email.from,
      user: config.email.user,
      hasPassword: !!config.email.password,
      passwordLength: config.email.password ? config.email.password.length : 0,
    };
  }
}

async function sendVerificationEmail(email, name, token, requestOrigin) {
  // Build the API base URL for the verification link
  let baseUrl = config.urls.api;
  if (baseUrl.includes('localhost') && requestOrigin) {
    baseUrl = requestOrigin;
  } else if (baseUrl.includes('localhost')) {
    baseUrl = 'https://wilkenpoelker-app.onrender.com';
  }
  // Ensure baseUrl ends with /api (API_URL might not include it)
  baseUrl = baseUrl.replace(/\/+$/, '');
  if (!baseUrl.endsWith('/api')) {
    baseUrl += '/api';
  }
  const verifyUrl = `${baseUrl}/auth/verify-email/${token}`;
  logger.info('Verification email URL constructed', { verifyUrl: verifyUrl.replace(token, 'TOKEN_HIDDEN'), to: email });

  await sendEmail({
    to: email,
    subject: 'E-Mail-Adresse bestätigen - WilkenPoelker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2E7D32; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">WilkenPoelker</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Hallo ${name}!</h2>
          <p>Vielen Dank für Ihre Registrierung bei WilkenPoelker.</p>
          <p>Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den folgenden Button klicken:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}"
               style="background-color: #2E7D32; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              E-Mail bestätigen
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Oder kopieren Sie diesen Link: ${verifyUrl}</p>
          <p style="color: #666; font-size: 14px;">Dieser Link ist 24 Stunden gültig.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          WilkenPoelker GmbH & Co. KG | info@wilkenpoelker.de
        </div>
      </div>
    `,
    text: `Hallo ${name}! Bitte bestätigen Sie Ihre E-Mail-Adresse: ${verifyUrl}`,
  });
}

async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${config.urls.app}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Passwort zurücksetzen - WilkenPoelker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2E7D32; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">WilkenPoelker</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Passwort zurücksetzen</h2>
          <p>Hallo ${name},</p>
          <p>Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie auf den Button:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #2E7D32; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Passwort zurücksetzen
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Dieser Link ist 1 Stunde gültig.</p>
          <p style="color: #666; font-size: 14px;">Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          WilkenPoelker GmbH & Co. KG | info@wilkenpoelker.de
        </div>
      </div>
    `,
    text: `Passwort zurücksetzen: ${resetUrl} (1 Stunde gültig)`,
  });
}

async function sendAppointmentReminder(email, name, appointment) {
  await sendEmail({
    to: email,
    subject: `Termin-Erinnerung: ${appointment.title} - WilkenPoelker`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2E7D32; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">WilkenPoelker</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Termin-Erinnerung</h2>
          <p>Hallo ${name},</p>
          <p>Wir möchten Sie an Ihren bevorstehenden Termin erinnern:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>${appointment.title}</strong></p>
            <p>Datum: ${appointment.date}</p>
            <p>Uhrzeit: ${appointment.startTime} Uhr</p>
            <p>Ort: WilkenPoelker</p>
          </div>
          <p>Wir freuen uns auf Ihren Besuch!</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          WilkenPoelker GmbH & Co. KG | info@wilkenpoelker.de
        </div>
      </div>
    `,
    text: `Termin-Erinnerung: ${appointment.title} am ${appointment.date} um ${appointment.startTime} Uhr bei WilkenPoelker.`,
  });
}

async function sendTicketConfirmation(email, name, ticket) {
  await sendEmail({
    to: email,
    subject: `Service-Anfrage ${ticket.ticketNumber} erhalten - WilkenPoelker`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2E7D32; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">WilkenPoelker</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Service-Anfrage erhalten</h2>
          <p>Hallo ${name},</p>
          <p>Ihre Service-Anfrage wurde erfolgreich erstellt:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Ticket-Nummer:</strong> ${ticket.ticketNumber}</p>
            <p><strong>Art:</strong> ${ticket.type}</p>
            <p><strong>Status:</strong> Offen</p>
          </div>
          <p>Wir bearbeiten Ihre Anfrage schnellstmöglich und melden uns bei Ihnen.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          WilkenPoelker GmbH & Co. KG | info@wilkenpoelker.de
        </div>
      </div>
    `,
    text: `Service-Anfrage ${ticket.ticketNumber} erhalten. Wir melden uns schnellstmöglich bei Ihnen.`,
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAppointmentReminder,
  sendTicketConfirmation,
  testEmailConfig,
};
