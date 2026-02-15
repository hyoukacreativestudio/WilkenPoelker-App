const { Op } = require('sequelize');
const { Appointment, User, Notification, Ticket } = require('../models');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const { isWithinOpeningHours, isWeekday } = require('../utils/openingHours');
const logger = require('../utils/logger');

/**
 * Get paginated appointments for a user with optional filters.
 */
async function getUserAppointments(userId, { from, to, status, type, page = 1, limit = 20 }) {
  const where = { userId };

  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to) where.date[Op.lte] = to;
  }

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'profilePicture'],
      },
    ],
    order: [['date', 'ASC'], ['startTime', 'ASC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    appointments: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get all appointment requests for staff (admins, service managers, robby managers).
 * Role-based filtering:
 * - admin/super_admin: see ALL requests
 * - service_manager: see all EXCEPT property_viewing
 * - robby_manager: see ONLY property_viewing
 */
async function getAppointmentRequests(userRole, { status, type, page = 1, limit = 20 }) {
  const where = {};

  // Role-based type filtering
  if (userRole === 'robby_manager') {
    where.type = 'property_viewing';
  } else if (userRole === 'service_manager') {
    where.type = { [Op.ne]: 'property_viewing' };
  }
  // admin/super_admin: no type filter → see everything

  // Optional status filter (default: show pending + proposed)
  if (status) {
    where.status = status;
  } else {
    where.status = { [Op.in]: ['pending', 'proposed'] };
  }

  // Optional type filter (overrides role filter if provided by admin)
  if (type && (userRole === 'admin' || userRole === 'super_admin')) {
    where.type = type;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'customerNumber', 'address'],
      },
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'profilePicture'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    appointments: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get ongoing (confirmed) appointments for staff, with role-based filtering.
 */
async function getOngoingAppointments(userRole, { type, page = 1, limit = 20 }) {
  const where = {
    status: 'confirmed',
    registeredBy: { [Op.ne]: null }, // Only show registered (entered) appointments
  };

  // Role-based type filtering (same as getAppointmentRequests)
  if (userRole === 'robby_manager') {
    where.type = 'property_viewing';
  } else if (userRole === 'service_manager') {
    where.type = { [Op.ne]: 'property_viewing' };
  }

  // Optional type filter for admins
  if (type && (userRole === 'admin' || userRole === 'super_admin')) {
    where.type = type;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'customerNumber', 'address'],
      },
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'profilePicture'],
      },
      {
        model: User,
        as: 'registrant',
        attributes: ['id', 'firstName', 'lastName'],
      },
    ],
    order: [['date', 'ASC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    appointments: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get unregistered (confirmed but not yet entered) appointments for staff.
 */
async function getUnregisteredAppointments(userRole, { type, page = 1, limit = 20 }) {
  const where = {
    status: 'confirmed',
    registeredBy: null, // Not yet registered by staff
  };

  // Role-based type filtering
  if (userRole === 'robby_manager') {
    where.type = 'property_viewing';
  } else if (userRole === 'service_manager') {
    where.type = { [Op.ne]: 'property_viewing' };
  }

  if (type && (userRole === 'admin' || userRole === 'super_admin')) {
    where.type = type;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'customerNumber', 'address'],
      },
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'profilePicture'],
      },
    ],
    order: [['date', 'ASC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    appointments: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Mark an appointment as registered (entered in calendar) by staff.
 */
async function registerAppointment(appointmentId, staffUserId) {
  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  if (appointment.status !== 'confirmed') {
    throw new AppError('Nur bestaetigte Termine koennen als eingetragen markiert werden', 400, 'INVALID_STATUS');
  }

  if (appointment.registeredBy) {
    throw new AppError('Termin wurde bereits als eingetragen markiert', 400, 'ALREADY_REGISTERED');
  }

  appointment.registeredBy = staffUserId;
  appointment.registeredAt = new Date();
  await appointment.save();

  logger.info('Appointment registered by staff', { appointmentId, staffUserId });

  return appointment;
}

/**
 * Staff asks a follow-up question to the customer.
 */
async function askQuestion(appointmentId, staffUserId, question) {
  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  appointment.staffQuestion = question;
  appointment.staffQuestionAt = new Date();
  appointment.staffQuestionBy = staffUserId;
  await appointment.save();

  // Notify the customer
  try {
    const staff = await User.findByPk(staffUserId, { attributes: ['firstName', 'lastName'] });
    const staffName = staff ? `${staff.firstName} ${staff.lastName}` : 'Ein Mitarbeiter';

    await Notification.create({
      userId: appointment.userId,
      title: 'Rueckfrage zu Ihrem Termin',
      message: `${staffName} hat eine Rueckfrage zu "${appointment.title}": ${question}`,
      type: 'appointment_reminder',
      category: 'appointment',
      relatedId: appointment.id,
      relatedType: 'appointment',
    });
  } catch (notifErr) {
    logger.error('Failed to notify customer about question', { error: notifErr.message });
  }

  logger.info('Staff asked question on appointment', { appointmentId, staffUserId });

  return appointment;
}

/**
 * Customer answers a staff follow-up question.
 */
async function answerQuestion(appointmentId, userId, answer) {
  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  if (appointment.userId !== userId) {
    throw new AppError('Sie koennen nur auf eigene Termine antworten', 403, 'FORBIDDEN');
  }

  if (!appointment.staffQuestion) {
    throw new AppError('Es gibt keine Rueckfrage zu beantworten', 400, 'NO_QUESTION');
  }

  appointment.customerNote = answer;
  await appointment.save();

  // Notify the staff who asked the question
  const notifyUserId = appointment.staffQuestionBy || appointment.assignedTo;
  if (notifyUserId) {
    try {
      const customer = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Der Kunde';

      await Notification.create({
        userId: notifyUserId,
        title: 'Antwort auf Ihre Rueckfrage',
        message: `${customerName} hat auf Ihre Rueckfrage zu "${appointment.title}" geantwortet: ${answer}`,
        type: 'appointment_reminder',
        category: 'appointment',
        relatedId: appointment.id,
        relatedType: 'appointment',
      });
    } catch (notifErr) {
      logger.error('Failed to notify staff about answer', { error: notifErr.message });
    }
  }

  logger.info('Customer answered question on appointment', { appointmentId, userId });

  return appointment;
}

/**
 * Create a new appointment request.
 * Customer requests come without date/startTime (just category + description).
 * Admin-created appointments may include date/time.
 */
async function createAppointment(userId, data, isAdminUser = false) {
  const { title, description, type, date, startTime, endTime, ticketId } = data;

  // Only validate date/time if provided (admin-created with specific time)
  if (date && startTime) {
    if (!isAdminUser && !isWeekday(date)) {
      throw new AppError(
        'Termine koennen nur an Werktagen (Mo-Fr) gebucht werden',
        400,
        'WEEKDAY_ONLY'
      );
    }

    const openingCheck = await isWithinOpeningHours(date, startTime);
    if (!openingCheck.valid) {
      throw new AppError(openingCheck.reason, 400, 'OUTSIDE_OPENING_HOURS');
    }

    if (endTime) {
      const endCheck = await isWithinOpeningHours(date, endTime);
      if (!endCheck.valid) {
        throw new AppError(
          `Endzeit: ${endCheck.reason}`,
          400,
          'END_OUTSIDE_OPENING_HOURS'
        );
      }
    }

    const appointmentDate = new Date(`${date}T${startTime}`);
    if (appointmentDate < new Date()) {
      throw new AppError('Termine koennen nicht in der Vergangenheit gebucht werden', 400, 'DATE_IN_PAST');
    }
  }

  const appointment = await Appointment.create({
    userId,
    title,
    description,
    type,
    date: date || null,
    startTime: startTime || null,
    endTime: endTime || null,
    ticketId: ticketId || null,
    status: 'pending',
  });

  logger.info('Appointment created', { appointmentId: appointment.id, userId });

  // If customer request (no date), notify all admins and service managers
  if (!date && !startTime) {
    try {
      const customer = await User.findByPk(userId, { attributes: ['firstName', 'lastName', 'username'] });
      const customerName = customer?.firstName && customer?.lastName
        ? `${customer.firstName} ${customer.lastName}`
        : customer?.username || 'Kunde';

      // Determine which staff to notify based on appointment type
      const staffRoles = ['admin', 'super_admin'];
      if (type === 'property_viewing') {
        staffRoles.push('robby_manager');
      } else {
        staffRoles.push('service_manager');
      }

      const staffUsers = await User.findAll({
        where: {
          role: { [Op.in]: staffRoles },
          isActive: true,
        },
        attributes: ['id'],
      });

      for (const staff of staffUsers) {
        await Notification.create({
          userId: staff.id,
          title: 'Neue Terminanfrage',
          message: `${customerName} hat eine Terminanfrage eingereicht: "${title}" (${type})`,
          type: 'appointment_reminder',
          category: 'appointment',
          relatedId: appointment.id,
          relatedType: 'appointment',
        });
      }

      logger.info('Staff notified about new appointment request', {
        appointmentId: appointment.id,
        staffCount: staffUsers.length,
      });
    } catch (notifErr) {
      logger.error('Failed to notify staff about appointment request', { error: notifErr.message });
    }
  }

  return appointment;
}

/**
 * Admin/Service Manager proposes a date + free text for a pending appointment request.
 */
async function proposeTime(appointmentId, adminUserId, { date, proposedText }) {
  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  if (appointment.status !== 'pending') {
    throw new AppError(
      'Terminvorschlag kann nur fuer ausstehende Anfragen gemacht werden',
      400,
      'INVALID_STATUS'
    );
  }

  // Validate proposed date (weekday + not in the past)
  if (!isWeekday(date)) {
    throw new AppError('Termine koennen nur an Werktagen (Mo-Fr) gebucht werden', 400, 'WEEKDAY_ONLY');
  }

  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    throw new AppError('Termine koennen nicht in der Vergangenheit vorgeschlagen werden', 400, 'DATE_IN_PAST');
  }

  appointment.date = date;
  appointment.proposedText = proposedText;
  appointment.startTime = null;
  appointment.endTime = null;
  appointment.status = 'proposed';
  appointment.assignedTo = appointment.assignedTo || adminUserId;
  await appointment.save();

  // Notify the customer
  await Notification.create({
    userId: appointment.userId,
    title: 'Terminvorschlag erhalten',
    message: `Fuer Ihre Anfrage "${appointment.title}" wurde der ${date} vorgeschlagen: ${proposedText}`,
    type: 'appointment_reminder',
    category: 'appointment',
    relatedId: appointment.id,
    relatedType: 'appointment',
  });

  logger.info('Time proposed for appointment', { appointmentId, adminUserId, date, proposedText });

  return appointment;
}

/**
 * Customer responds to a proposed time: accept or decline.
 */
async function respondToProposal(appointmentId, userId, { accept, message }) {
  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  if (appointment.userId !== userId) {
    throw new AppError('Sie koennen nur auf eigene Terminvorschlaege antworten', 403, 'FORBIDDEN');
  }

  if (appointment.status !== 'proposed') {
    throw new AppError('Es liegt kein Terminvorschlag vor', 400, 'INVALID_STATUS');
  }

  if (accept) {
    appointment.status = 'confirmed';
    appointment.customerNote = message || null;
    await appointment.save();

    // Notify assigned staff
    if (appointment.assignedTo) {
      await Notification.create({
        userId: appointment.assignedTo,
        title: 'Terminvorschlag angenommen',
        message: `Der Kunde hat den Termin "${appointment.title}" am ${appointment.date} bestaetigt.${appointment.customerNote ? ` Kundennotiz: ${appointment.customerNote}` : ''}`,
        type: 'appointment_reminder',
        category: 'appointment',
        relatedId: appointment.id,
        relatedType: 'appointment',
      });
    }

    logger.info('Appointment proposal accepted', { appointmentId, userId });
  } else {
    // Decline: reset to pending, clear date/time/proposedText
    appointment.status = 'pending';
    appointment.date = null;
    appointment.startTime = null;
    appointment.endTime = null;
    appointment.proposedText = null;
    await appointment.save();

    // Notify assigned staff
    if (appointment.assignedTo) {
      await Notification.create({
        userId: appointment.assignedTo,
        title: 'Terminvorschlag abgelehnt',
        message: `Der Kunde hat den Vorschlag fuer "${appointment.title}" abgelehnt.${message ? ` Nachricht: ${message}` : ''}`,
        type: 'appointment_reminder',
        category: 'appointment',
        relatedId: appointment.id,
        relatedType: 'appointment',
      });
    }

    logger.info('Appointment proposal declined', { appointmentId, userId, message });
  }

  return appointment;
}

/**
 * Get appointment details by ID with staff info.
 */
async function getAppointmentById(appointmentId) {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [
      {
        model: User,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'customerNumber', 'address'],
      },
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'role'],
      },
      {
        model: Ticket,
        as: 'ticket',
        attributes: ['id', 'ticketNumber', 'type', 'status'],
      },
      {
        model: User,
        as: 'registrant',
        attributes: ['id', 'firstName', 'lastName'],
      },
      {
        model: User,
        as: 'questioner',
        attributes: ['id', 'firstName', 'lastName'],
      },
    ],
  });

  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  return appointment;
}

/**
 * Reschedule an appointment: create a new one linked to the old one.
 */
async function rescheduleAppointment(appointmentId, userId, newData, isAdminUser = false) {
  const existing = await Appointment.findByPk(appointmentId);

  if (!existing) {
    throw new NotFoundError('Appointment');
  }

  if (existing.userId !== userId) {
    throw new AppError('Sie koennen nur eigene Termine umbuchen', 403, 'FORBIDDEN');
  }

  if (existing.status === 'cancelled') {
    throw new AppError('Stornierte Termine koennen nicht umgebucht werden', 400, 'ALREADY_CANCELLED');
  }

  const { date, startTime, endTime } = newData;

  // Same validations as create
  if (!isAdminUser && !isWeekday(date)) {
    throw new AppError('Termine koennen nur an Werktagen (Mo-Fr) gebucht werden', 400, 'WEEKDAY_ONLY');
  }

  const openingCheck = await isWithinOpeningHours(date, startTime);
  if (!openingCheck.valid) {
    throw new AppError(openingCheck.reason, 400, 'OUTSIDE_OPENING_HOURS');
  }

  // Mark old appointment as rescheduled
  existing.status = 'rescheduled';
  await existing.save();

  // Create new appointment linked to the old one
  const newAppointment = await Appointment.create({
    userId,
    title: newData.title || existing.title,
    description: newData.description || existing.description,
    type: newData.type || existing.type,
    date,
    startTime,
    endTime: endTime || null,
    ticketId: existing.ticketId,
    assignedTo: existing.assignedTo,
    rescheduledFrom: appointmentId,
    status: 'pending',
  });

  // Notify assigned staff if any
  if (existing.assignedTo) {
    await Notification.create({
      userId: existing.assignedTo,
      title: 'Termin umgebucht',
      message: `Der Termin "${existing.title}" wurde auf ${date} um ${startTime} umgebucht.`,
      type: 'appointment_reminder',
      category: 'appointment',
      relatedId: newAppointment.id,
      relatedType: 'appointment',
    });
  }

  logger.info('Appointment rescheduled', {
    oldId: appointmentId,
    newId: newAppointment.id,
    userId,
  });

  return newAppointment;
}

/**
 * Cancel an appointment.
 */
async function cancelAppointment(appointmentId, userId, cancelReason) {
  const appointment = await Appointment.findByPk(appointmentId);

  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  if (appointment.userId !== userId) {
    throw new AppError('Sie koennen nur eigene Termine stornieren', 403, 'FORBIDDEN');
  }

  if (appointment.status === 'cancelled') {
    throw new AppError('Termin ist bereits storniert', 400, 'ALREADY_CANCELLED');
  }

  appointment.status = 'cancelled';
  appointment.cancelledAt = new Date();
  appointment.cancelReason = cancelReason || null;
  await appointment.save();

  // Notify assigned staff if any
  if (appointment.assignedTo) {
    await Notification.create({
      userId: appointment.assignedTo,
      title: 'Termin storniert',
      message: `Der Termin "${appointment.title}" am ${appointment.date} wurde vom Kunden storniert.${cancelReason ? ` Grund: ${cancelReason}` : ''}`,
      type: 'appointment_reminder',
      category: 'appointment',
      relatedId: appointment.id,
      relatedType: 'appointment',
    });
  }

  logger.info('Appointment cancelled', { appointmentId, userId });

  return appointment;
}

/**
 * Confirm an appointment (admin/service_manager).
 */
async function confirmAppointment(appointmentId, confirmedBy) {
  const appointment = await Appointment.findByPk(appointmentId);

  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  if (appointment.status !== 'pending' && appointment.status !== 'proposed') {
    throw new AppError(
      `Termin kann nicht bestaetigt werden (aktueller Status: ${appointment.status})`,
      400,
      'INVALID_STATUS'
    );
  }

  appointment.status = 'confirmed';
  appointment.assignedTo = appointment.assignedTo || confirmedBy;
  await appointment.save();

  // Notify customer
  await Notification.create({
    userId: appointment.userId,
    title: 'Termin bestaetigt',
    message: `Ihr Termin "${appointment.title}" am ${appointment.date} um ${appointment.startTime} wurde bestaetigt.`,
    type: 'appointment_reminder',
    category: 'appointment',
    relatedId: appointment.id,
    relatedType: 'appointment',
  });

  logger.info('Appointment confirmed', { appointmentId, confirmedBy });

  return appointment;
}

/**
 * Generate iCal content for an appointment.
 */
async function generateICalContent(appointmentId) {
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [
      {
        model: User,
        as: 'customer',
        attributes: ['firstName', 'lastName', 'email'],
      },
    ],
  });

  if (!appointment) {
    throw new NotFoundError('Appointment');
  }

  const location = appointment.location || {};
  const locationStr = location.name
    ? `${location.name}${location.address ? ', ' + location.address : ''}`
    : 'WilkenPoelker';

  // Build dtstart and dtend in YYYYMMDDTHHMMSS format
  const dateClean = appointment.date.replace(/-/g, '');
  const startClean = appointment.startTime.replace(/:/g, '').substring(0, 4) + '00';
  const dtStart = `${dateClean}T${startClean}`;

  let dtEnd;
  if (appointment.endTime) {
    const endClean = appointment.endTime.replace(/:/g, '').substring(0, 4) + '00';
    dtEnd = `${dateClean}T${endClean}`;
  } else {
    // Default to 1 hour after start
    const [h, m] = appointment.startTime.split(':').map(Number);
    const endH = String(h + 1).padStart(2, '0');
    const endM = String(m).padStart(2, '0');
    dtEnd = `${dateClean}T${endH}${endM}00`;
  }

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${appointment.id}@wilkenpoelker.de`;

  const description = appointment.description
    ? appointment.description.replace(/\n/g, '\\n')
    : '';

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WilkenPoelker//Termin//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/Berlin:${dtStart}`,
    `DTEND;TZID=Europe/Berlin:${dtEnd}`,
    `SUMMARY:${appointment.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${locationStr}`,
    `STATUS:${appointment.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ical;
}

module.exports = {
  getUserAppointments,
  getAppointmentRequests,
  getOngoingAppointments,
  getUnregisteredAppointments,
  createAppointment,
  getAppointmentById,
  rescheduleAppointment,
  cancelAppointment,
  confirmAppointment,
  proposeTime,
  respondToProposal,
  registerAppointment,
  askQuestion,
  answerQuestion,
  generateICalContent,
};
