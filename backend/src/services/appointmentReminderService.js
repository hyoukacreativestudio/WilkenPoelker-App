const { Op } = require('sequelize');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

// The server runs in UTC, appointments are stored in German local time.
// Returns { date: 'YYYY-MM-DD', minutes: minutes since midnight } in Europe/Berlin.
function berlinNow(d = new Date()) {
  const [date, time] = d.toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).split(' ');
  const [h, m] = time.split(':').map(Number);
  return { date, minutes: h * 60 + m };
}

// "Tomorrow" reminders are not pushed in the middle of the night.
const DAY_BEFORE_REMINDER_FROM = 9 * 60; // 09:00

/**
 * Send appointment reminders for upcoming appointments.
 * - 24h reminder: sent once, the day before the appointment
 * - 1h reminder: sent once, ~1 hour before the appointment
 */
async function sendAppointmentReminders() {
  try {
    const { Appointment, Notification } = require('../models');

    const now = new Date();
    const { date: todayStr, minutes: currentMinutes } = berlinNow(now);
    const { date: tomorrowStr } = berlinNow(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    // ── 24h Reminders ──────────────────────────────
    // Find appointments tomorrow that haven't received a 24h reminder
    const appointments24h = currentMinutes < DAY_BEFORE_REMINDER_FROM ? [] : await Appointment.findAll({
      where: {
        date: tomorrowStr,
        status: { [Op.in]: ['confirmed', 'pending'] },
        reminderSent24h: false,
      },
    });

    for (const appointment of appointments24h) {
      try {
        const timeStr = appointment.startTime
          ? ` um ${appointment.startTime.substring(0, 5)} Uhr`
          : '';

        await notificationService.createNotification(
          appointment.userId,
          {
            title: 'Terminerinnerung',
            message: `Morgen${timeStr}: ${appointment.title}`,
            type: 'appointment_reminder',
            category: 'appointment',
            deepLink: `appointments/${appointment.id}`,
            relatedId: appointment.id,
            relatedType: 'appointment',
          },
          { Notification }
        );

        await appointment.update({ reminderSent24h: true });
        logger.info('24h reminder sent', { appointmentId: appointment.id, userId: appointment.userId });
      } catch (err) {
        logger.error('Failed to send 24h reminder', { appointmentId: appointment.id, error: err.message });
      }
    }

    // ── 1h Reminders ──────────────────────────────
    // Find appointments today with startTime within the next hour
    const appointments1h = await Appointment.findAll({
      where: {
        date: todayStr,
        status: { [Op.in]: ['confirmed', 'pending'] },
        reminderSent1h: false,
        startTime: { [Op.not]: null },
      },
    });

    for (const appointment of appointments1h) {
      try {
        // Parse appointment time
        const [apptHour, apptMinute] = appointment.startTime.split(':').map(Number);
        const apptMinutes = apptHour * 60 + apptMinute;
        const diffMinutes = apptMinutes - currentMinutes;

        // Send reminder if appointment is 30-90 minutes away
        if (diffMinutes > 0 && diffMinutes <= 90) {
          await notificationService.createNotification(
            appointment.userId,
            {
              title: 'Termin in Kürze',
              message: `In ca. ${diffMinutes} Minuten: ${appointment.title}`,
              type: 'appointment_reminder',
              category: 'appointment',
              deepLink: `appointments/${appointment.id}`,
              relatedId: appointment.id,
              relatedType: 'appointment',
            },
            { Notification }
          );

          await appointment.update({ reminderSent1h: true });
          logger.info('1h reminder sent', { appointmentId: appointment.id, userId: appointment.userId, diffMinutes });
        }
      } catch (err) {
        logger.error('Failed to send 1h reminder', { appointmentId: appointment.id, error: err.message });
      }
    }

    const totalSent = appointments24h.length + appointments1h.filter(a => a.reminderSent1h).length;
    if (totalSent > 0) {
      logger.info(`Appointment reminders: ${appointments24h.length} x 24h, checked ${appointments1h.length} for 1h`);
    }
  } catch (err) {
    logger.error('Appointment reminder service error', { error: err.message, stack: err.stack });
  }
}

module.exports = { sendAppointmentReminders, berlinNow };
