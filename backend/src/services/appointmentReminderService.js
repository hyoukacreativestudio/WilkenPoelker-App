const { Op } = require('sequelize');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

/**
 * Send appointment reminders for upcoming appointments.
 * - 24h reminder: sent once, the day before the appointment
 * - 1h reminder: sent once, ~1 hour before the appointment
 */
async function sendAppointmentReminders() {
  try {
    const { Appointment, Notification, User } = require('../models');

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);

    // Format dates for DATEONLY comparison
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = in24h.toISOString().split('T')[0];

    // Current time in HH:MM format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // ── 24h Reminders ──────────────────────────────
    // Find appointments tomorrow that haven't received a 24h reminder
    const appointments24h = await Appointment.findAll({
      where: {
        date: tomorrowStr,
        status: { [Op.in]: ['confirmed', 'pending'] },
        reminderSent24h: false,
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName'],
      }],
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
            category: 'appointments',
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
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName'],
      }],
    });

    for (const appointment of appointments1h) {
      try {
        // Parse appointment time
        const [apptHour, apptMinute] = appointment.startTime.split(':').map(Number);
        const apptMinutes = apptHour * 60 + apptMinute;
        const currentMinutes = currentHour * 60 + currentMinute;
        const diffMinutes = apptMinutes - currentMinutes;

        // Send reminder if appointment is 30-90 minutes away
        if (diffMinutes > 0 && diffMinutes <= 90) {
          await notificationService.createNotification(
            appointment.userId,
            {
              title: 'Termin in Kürze',
              message: `In ca. ${diffMinutes} Minuten: ${appointment.title}`,
              type: 'appointment_reminder',
              category: 'appointments',
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

module.exports = { sendAppointmentReminders };
