const { Op, fn, col } = require('sequelize');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const { generateTicketNumber } = require('../utils/crypto');
const logger = require('../utils/logger');

// ──────────────────────────────────────────────
// TICKETS
// ──────────────────────────────────────────────

// Department the customer picks → the ticket category used for routing.
// Every department is selectable; ones without a native category map to 'service'.
const DEPARTMENT_CATEGORY = {
  fahrrad: 'bike',
  reinigung: 'cleaning',
  rasenmaeher: 'motor',
  service: 'service',
  robby: 'service',
  motorgeraete: 'motor',
  elektro: 'bike',
  verkauf: 'service',
  lieferungen: 'service',
};
// Department → which manager roles get notified.
const DEPARTMENT_ROLES = {
  fahrrad: ['bike_manager'],
  reinigung: ['cleaning_manager'],
  rasenmaeher: ['motor_manager'],
  service: ['service_manager'],
  robby: ['robby_manager'],
  motorgeraete: ['motor_equipment_manager'],
  elektro: ['ev_manager'],
  verkauf: ['sales_manager'],
  lieferungen: ['delivery_manager'],
};

async function createTicket(data, userId, models) {
  const { Ticket, User, Notification } = models;
  const { title, type, category, description, urgency, appointmentDate, alternativeDates, attachments, department } = data;

  const ticketNumber = generateTicketNumber();
  // Prefer the picked department; keep the category consistent with it.
  const finalCategory = (department && DEPARTMENT_CATEGORY[department]) || category || 'service';

  const ticket = await Ticket.create({
    ticketNumber,
    userId,
    title: title || 'Allgemeine Anfrage',
    type,
    category: finalCategory,
    department: department || null,
    description,
    urgency: urgency || 'normal',
    appointmentDate: appointmentDate || null,
    alternativeDates: alternativeDates || [],
    attachments: attachments || [],
    status: 'open',
  });

  // Determine which managers to notify — by department if given, else category.
  const categoryRoleMap = {
    bike: ['bike_manager'],
    cleaning: ['cleaning_manager'],
    motor: ['motor_manager'],
    service: ['service_manager'],
  };
  const categoryRoles = (department && DEPARTMENT_ROLES[department]) || categoryRoleMap[finalCategory] || ['service_manager'];
  const allRoles = ['admin', 'super_admin', ...categoryRoles];

  const managers = await User.findAll({
    where: {
      role: { [Op.in]: allRoles },
      isActive: true,
    },
    attributes: ['id'],
  });

  const notifications = managers.map((manager) => ({
    userId: manager.id,
    title: 'Neues Service-Ticket',
    message: `Ticket ${ticketNumber} – ${title || type}: ${description.substring(0, 80)}...`,
    type: 'chat_message',
    category: 'chat',
    relatedId: ticket.id,
    relatedType: 'ticket',
    deepLink: `/service/tickets/${ticket.id}`,
  }));

  if (notifications.length > 0) {
    await Notification.bulkCreate(notifications);
  }

  // Re-fetch ticket with associations
  const fullTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'firstName', 'lastName', 'email'] },
    ],
  });

  logger.info('Ticket created', { ticketId: ticket.id, ticketNumber, userId });

  return fullTicket;
}

async function getUserTickets(userId, query, models) {
  const { Ticket, User, ChatMessage } = models;
  const { status, category, page = 1, limit = 20 } = query;

  const where = { userId };
  if (status) where.status = status;
  if (category) where.category = category;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: tickets, count: total } = await Ticket.findAndCountAll({
    where,
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  return {
    tickets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function getAllTickets(query, models) {
  const { Ticket, User } = models;
  const { status, category, assigned, page = 1, limit = 20 } = query;

  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (assigned === 'unassigned') {
    where.assignedTo = null;
  } else if (assigned) {
    where.assignedTo = assigned;
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: tickets, count: total } = await Ticket.findAndCountAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'firstName', 'lastName', 'email'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  return {
    tickets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

// Admin tickets filtered by staff's category permissions
async function getAdminTickets(user, query, models) {
  const { Ticket, User } = models;
  const { tab = 'open', page = 1, limit = 20 } = query;

  const where = {};

  // Determine allowed categories based on role
  const roleCategories = {
    bike_manager: ['bike'],
    cleaning_manager: ['cleaning'],
    motor_manager: ['motor'],
    service_manager: ['service', 'bike', 'cleaning', 'motor'],
    admin: ['service', 'bike', 'cleaning', 'motor'],
    super_admin: ['service', 'bike', 'cleaning', 'motor'],
  };

  // Combine the primary role's categories with any extra roles (multi-role)
  // stored in `permissions`, so a staff member with several roles sees them all.
  const extraCategories = (user.permissions || []).flatMap((p) => roleCategories[p] || []);
  const allowedCategories = [...new Set([...(roleCategories[user.role] || []), ...extraCategories])];
  if (allowedCategories.length > 0 && user.role !== 'admin' && user.role !== 'super_admin') {
    where.category = { [Op.in]: allowedCategories };
  }

  const isAdminRole = user.role === 'admin' || user.role === 'super_admin';

  // Filter by tab
  if (tab === 'open') {
    where.status = 'open';
    // Non-admin staff: only show unassigned tickets or tickets assigned to them
    if (!isAdminRole) {
      where[Op.or] = [
        { assignedTo: null },
        { assignedTo: user.id },
      ];
    }
  } else if (tab === 'mine') {
    where.assignedTo = user.id;
    where.status = { [Op.in]: ['in_progress', 'open', 'confirmed'] };
  } else if (tab === 'all') {
    // Non-admin staff: only show their own assigned tickets and unassigned ones
    if (!isAdminRole) {
      where[Op.or] = [
        { assignedTo: null },
        { assignedTo: user.id },
      ];
    }
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: tickets, count: total } = await Ticket.findAndCountAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'firstName', 'lastName', 'email'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  return {
    tickets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

// Get active chats for a user (customer OR assigned staff)
async function getActiveChats(userId, models) {
  const { Ticket, User, ChatMessage } = models;

  const tickets = await Ticket.findAll({
    where: {
      status: { [Op.in]: ['in_progress', 'confirmed'] },
      [Op.or]: [
        { userId },
        { assignedTo: userId },
      ],
    },
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture'] },
    ],
    order: [['updatedAt', 'DESC']],
  });

  const ticketIds = tickets.map((t) => t.id);

  // All unread counts in ONE grouped query instead of one per ticket.
  const unreadMap = {};
  if (ticketIds.length) {
    const unreadRows = await ChatMessage.findAll({
      where: { ticketId: { [Op.in]: ticketIds }, userId: { [Op.ne]: userId }, readAt: null },
      attributes: ['ticketId', [fn('COUNT', col('id')), 'cnt']],
      group: ['ticketId'],
      raw: true,
    });
    unreadRows.forEach((r) => { unreadMap[r.ticketId] = parseInt(r.cnt, 10) || 0; });
  }

  // The last message is a fast index lookup per ticket (idx_chat_messages_ticket_date).
  const chats = await Promise.all(
    tickets.map(async (ticket) => {
      const lastMessage = await ChatMessage.findOne({
        where: { ticketId: ticket.id },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'username', 'firstName', 'lastName'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      return {
        ...ticket.toJSON(),
        lastMessage: lastMessage ? lastMessage.toJSON() : null,
        unreadCount: unreadMap[ticket.id] || 0,
      };
    })
  );

  return { chats };
}

async function getTicketById(ticketId, userId, models) {
  const { Ticket, User, ChatMessage } = models;

  const ticket = await Ticket.findByPk(ticketId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role', 'profilePicture', 'phone', 'address', 'customerNumber'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'profilePicture'] },
    ],
  });

  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  // Access control: customers can ONLY see their own tickets; staff see assigned/unassigned/admin-all
  const requestingUser = await User.findByPk(userId, { attributes: ['id', 'role'] });
  if (!requestingUser) {
    throw new AppError('Authentifizierung erforderlich', 401, 'UNAUTHENTICATED');
  }

  const isTicketCreator = ticket.userId === userId;

  if (requestingUser.role === 'customer') {
    if (!isTicketCreator) {
      throw new AppError('Sie haben keinen Zugriff auf dieses Ticket', 403, 'TICKET_ACCESS_DENIED');
    }
  } else {
    const isAdmin = requestingUser.role === 'admin' || requestingUser.role === 'super_admin';
    const isAssigned = ticket.assignedTo === userId;
    const isUnassigned = !ticket.assignedTo;
    // A category manager (e.g. bike_manager) can legitimately open ANY ticket
    // in their category — even if it's assigned to a different manager in that
    // category. service_manager sees everything. Without this, tapping a ticket
    // assigned to a colleague 403'd and the UI looked like it did nothing.
    const categoryRoleMap = {
      bike: 'bike_manager',
      cleaning: 'cleaning_manager',
      motor: 'motor_manager',
      service: 'service_manager',
    };
    const isCategoryManager =
      requestingUser.role === 'service_manager' ||
      requestingUser.role === categoryRoleMap[ticket.category];

    // Staff currently handling another ticket from the same customer can also
    // read this one — needed so they can review the customer's history for
    // recurring problems.
    let hasContext = false;
    if (!isAdmin && !isCategoryManager && !isTicketCreator && !isAssigned && !isUnassigned) {
      hasContext = await hasActiveTicketFromCustomer(userId, ticket.userId, models);
    }

    if (!isAdmin && !isCategoryManager && !isTicketCreator && !isAssigned && !isUnassigned && !hasContext) {
      throw new AppError('Dieses Ticket ist einem anderen Mitarbeiter zugewiesen.', 403, 'TICKET_ACCESS_DENIED');
    }
  }

  // Count messages
  const messageCount = await ChatMessage.count({ where: { ticketId } });

  const ticketData = ticket.toJSON();
  ticketData.messageCount = messageCount;

  return ticketData;
}

async function updateTicketStatus(ticketId, status, userId, models) {
  const { Ticket, User, Notification } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  const oldStatus = ticket.status;
  ticket.status = status;
  await ticket.save();

  // Create notification for the ticket owner
  await Notification.create({
    userId: ticket.userId,
    title: 'Ticket-Status aktualisiert',
    message: `Ihr Ticket ${ticket.ticketNumber} wurde von "${oldStatus}" auf "${status}" geändert.`,
    type: 'system',
    category: 'system',
    relatedId: ticket.id,
    relatedType: 'ticket',
    deepLink: `/service/tickets/${ticket.id}`,
  });

  logger.info('Ticket status updated', { ticketId, oldStatus, newStatus: status, updatedBy: userId });

  return ticket;
}

async function assignTicket(ticketId, staffId, models) {
  const { Ticket, User, Notification } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  const staff = await User.findByPk(staffId);
  if (!staff) {
    throw new NotFoundError('Staff member');
  }

  ticket.assignedTo = staffId;
  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
  }
  await ticket.save();

  // Notify the assigned staff member
  await Notification.create({
    userId: staffId,
    title: 'Ticket zugewiesen',
    message: `Ihnen wurde Ticket ${ticket.ticketNumber} zugewiesen.`,
    type: 'system',
    category: 'system',
    relatedId: ticket.id,
    relatedType: 'ticket',
    deepLink: `/service/tickets/${ticket.id}`,
  });

  logger.info('Ticket assigned', { ticketId, staffId });

  const updatedTicket = await Ticket.findByPk(ticketId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
  });

  return updatedTicket;
}

// Close a ticket (staff only)
async function closeTicket(ticketId, staffId, models) {
  const { Ticket, ChatMessage, User, Notification } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  if (ticket.status === 'closed') {
    throw new AppError('Ticket is already closed', 400, 'ALREADY_CLOSED');
  }

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.closedBy = staffId;
  await ticket.save();

  // Add system message
  await ChatMessage.create({
    ticketId,
    userId: staffId,
    message: 'Chat wurde geschlossen.',
    isSystemMessage: true,
  });

  // Notify customer
  await Notification.create({
    userId: ticket.userId,
    title: 'Chat geschlossen',
    message: `Ihr Ticket ${ticket.ticketNumber} wurde geschlossen. Bitte bewerten Sie den Service.`,
    type: 'ticket_closed',
    category: 'chat',
    relatedId: ticket.id,
    relatedType: 'ticket',
    deepLink: `/service/tickets/${ticket.id}/rate`,
  });

  logger.info('Ticket closed', { ticketId, closedBy: staffId });

  return ticket;
}

// Forward a ticket to another staff member
async function forwardTicket(ticketId, currentStaffId, targetStaffId, models) {
  const { Ticket, ChatMessage, User, Notification } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  const targetStaff = await User.findByPk(targetStaffId, {
    attributes: ['id', 'username', 'firstName', 'lastName', 'role'],
  });
  if (!targetStaff) {
    throw new NotFoundError('Target staff member');
  }

  const currentStaff = await User.findByPk(currentStaffId, {
    attributes: ['id', 'username', 'firstName', 'lastName'],
  });

  ticket.forwardedFrom = currentStaffId;
  ticket.assignedTo = targetStaffId;
  await ticket.save();

  // Add system message about forwarding
  const currentName = currentStaff ? `${currentStaff.firstName || currentStaff.username}` : 'Ein Mitarbeiter';
  const targetName = `${targetStaff.firstName || targetStaff.username}`;
  await ChatMessage.create({
    ticketId,
    userId: currentStaffId,
    message: `Ticket wurde von ${currentName} an ${targetName} weitergeleitet.`,
    isSystemMessage: true,
  });

  // Notify new assignee
  await Notification.create({
    userId: targetStaffId,
    title: 'Ticket weitergeleitet',
    message: `Ticket ${ticket.ticketNumber} wurde an Sie weitergeleitet.`,
    type: 'system',
    category: 'system',
    relatedId: ticket.id,
    relatedType: 'ticket',
    deepLink: `/service/tickets/${ticket.id}`,
  });

  logger.info('Ticket forwarded', { ticketId, from: currentStaffId, to: targetStaffId });

  const updatedTicket = await Ticket.findByPk(ticketId, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
  });

  return updatedTicket;
}

// Rate a closed ticket
async function rateTicket(ticketId, userId, data, models) {
  const { Ticket, ServiceRating } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  if (ticket.status !== 'closed') {
    throw new AppError('Can only rate closed tickets', 400, 'TICKET_NOT_CLOSED');
  }

  if (ticket.userId !== userId) {
    throw new AppError('Only the ticket creator can rate', 403, 'FORBIDDEN');
  }

  // Check if already rated
  const existing = await ServiceRating.findOne({ where: { ticketId, userId } });
  if (existing) {
    throw new AppError('You have already rated this ticket', 400, 'ALREADY_RATED');
  }

  const rating = await ServiceRating.create({
    userId,
    staffId: ticket.assignedTo || ticket.closedBy,
    ticketId,
    type: 'service',
    overallRating: data.rating,
    text: data.comment || null,
  });

  logger.info('Ticket rated', { ticketId, userId, rating: data.rating });

  return rating;
}

// Get ratings for a specific staff member
async function getStaffRatings(staffId, models) {
  const { ServiceRating, User, Ticket } = models;

  const ratings = await ServiceRating.findAll({
    where: { staffId },
    include: [
      { model: User, as: 'ratedStaff', attributes: ['id', 'username', 'firstName', 'lastName'] },
      { model: Ticket, attributes: ['id', 'ticketNumber', 'title'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  // Calculate average
  const totalRatings = ratings.length;
  const avgRating = totalRatings > 0
    ? ratings.reduce((sum, r) => sum + r.overallRating, 0) / totalRatings
    : 0;

  return {
    ratings,
    stats: {
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings,
    },
  };
}

// Get available staff for forwarding
async function getAvailableStaff(category, models) {
  const { User } = models;

  const roleFilter = ['admin', 'super_admin', 'service_manager'];
  if (category === 'bike') roleFilter.push('bike_manager');
  else if (category === 'cleaning') roleFilter.push('cleaning_manager');
  else if (category === 'motor') roleFilter.push('motor_manager');
  else {
    roleFilter.push('bike_manager', 'cleaning_manager', 'motor_manager');
  }

  const staff = await User.findAll({
    where: {
      role: { [Op.in]: roleFilter },
      isActive: true,
    },
    attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'profilePicture'],
    order: [['firstName', 'ASC']],
  });

  return { staff };
}

// ──────────────────────────────────────────────
// CHAT MESSAGES
// ──────────────────────────────────────────────

async function sendChatMessage(ticketId, userId, data, models) {
  const { Ticket, ChatMessage, User, Notification } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  if (ticket.status === 'cancelled' || ticket.status === 'completed' || ticket.status === 'closed') {
    throw new AppError('Cannot send messages to a closed ticket', 400, 'TICKET_CLOSED');
  }

  // Access control: non-admin staff cannot message in tickets assigned to other staff
  const senderCheck = await User.findByPk(userId, { attributes: ['id', 'role'] });
  if (senderCheck && senderCheck.role !== 'customer') {
    const isSenderAdmin = senderCheck.role === 'admin' || senderCheck.role === 'super_admin';
    const isSenderAssigned = ticket.assignedTo === userId;
    const isUnassigned = !ticket.assignedTo;

    if (!isSenderAdmin && !isSenderAssigned && !isUnassigned && ticket.userId !== userId) {
      throw new AppError('You do not have access to this chat', 403, 'CHAT_ACCESS_DENIED');
    }
  }

  // Auto-assign: if staff responds to an open/unassigned ticket, assign them
  const user = await User.findByPk(userId, { attributes: ['id', 'role', 'username', 'firstName', 'lastName'] });
  if (user && user.role !== 'customer' && !ticket.assignedTo) {
    ticket.assignedTo = userId;
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }
    await ticket.save();

    // System message about assignment
    const staffName = user.firstName || user.username || 'Ein Mitarbeiter';
    await ChatMessage.create({
      ticketId,
      userId,
      message: `${staffName} hat das Ticket übernommen.`,
      isSystemMessage: true,
    });
  }

  const message = await ChatMessage.create({
    ticketId,
    userId,
    message: data.message,
    attachments: data.attachments || [],
  });

  const fullMessage = await ChatMessage.findByPk(message.id, {
    include: [
      { model: User, as: 'sender', attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture'] },
    ],
  });

  // Determine the recipient (the other party)
  let recipientId;
  if (userId === ticket.userId) {
    // Customer sent message -> notify assigned staff or all managers
    recipientId = ticket.assignedTo;
  } else {
    // Staff sent message -> notify customer
    recipientId = ticket.userId;
  }

  if (recipientId) {
    await Notification.create({
      userId: recipientId,
      title: 'Neue Chat-Nachricht',
      message: `Neue Nachricht in Ticket ${ticket.ticketNumber}: ${data.message ? data.message.substring(0, 60) : 'Bild gesendet'}`,
      type: 'chat_message',
      category: 'chat',
      relatedId: ticketId,
      relatedType: 'ticket',
      deepLink: `/service/tickets/${ticketId}/chat`,
    });
  }

  return fullMessage;
}

async function getChatMessages(ticketId, userId, query, models) {
  const { Ticket, ChatMessage, User } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  // Chat access check: ticket creator, assigned staff, admin, or staff currently
  // handling another ticket from the same customer (context read of history).
  const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  const isTicketOwner = ticket.userId === userId;
  const isAssigned = ticket.assignedTo === userId;

  let hasContext = false;
  if (!isAdmin && !isTicketOwner && !isAssigned) {
    hasContext = await hasActiveTicketFromCustomer(userId, ticket.userId, models);
  }

  if (!isAdmin && !isTicketOwner && !isAssigned && !hasContext) {
    throw new AppError('You do not have access to this chat', 403, 'CHAT_ACCESS_DENIED');
  }

  const { page = 1, limit = 50 } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: messages, count: total } = await ChatMessage.findAndCountAll({
    where: { ticketId },
    include: [
      { model: User, as: 'sender', attributes: ['id', 'username', 'firstName', 'lastName', 'profilePicture', 'role'] },
    ],
    order: [['createdAt', 'ASC']],
    limit: parseInt(limit),
    offset,
  });

  return {
    messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

async function editMessage(messageId, userId, newText, models) {
  const { ChatMessage } = models;

  const message = await ChatMessage.findByPk(messageId);
  if (!message) {
    throw new NotFoundError('Message');
  }

  if (message.userId !== userId) {
    throw new AppError('You can only edit your own messages', 403, 'FORBIDDEN');
  }

  // Check 5-minute edit window
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (message.createdAt < fiveMinutesAgo) {
    throw new AppError('Messages can only be edited within 5 minutes of sending', 400, 'EDIT_WINDOW_EXPIRED');
  }

  message.message = newText;
  message.editedAt = new Date();
  await message.save();

  return message;
}

async function deleteMessage(messageId, userId, models) {
  const { ChatMessage } = models;

  const message = await ChatMessage.findByPk(messageId);
  if (!message) {
    throw new NotFoundError('Message');
  }

  if (message.userId !== userId) {
    throw new AppError('You can only delete your own messages', 403, 'FORBIDDEN');
  }

  // Check 5-minute delete window
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (message.createdAt < fiveMinutesAgo) {
    throw new AppError('Messages can only be deleted within 5 minutes of sending', 400, 'DELETE_WINDOW_EXPIRED');
  }

  await message.destroy();
  return { deleted: true };
}

// ──────────────────────────────────────────────
// APPOINTMENTS
// ──────────────────────────────────────────────

async function confirmAppointment(ticketId, userId, data, models) {
  const { Ticket, Appointment, Notification } = models;

  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  const { selectedDate } = data;

  if (!selectedDate) {
    throw new AppError('A date must be selected', 400, 'DATE_REQUIRED');
  }

  // Verify selected date is one of the proposed dates
  const allDates = [ticket.appointmentDate, ...(ticket.alternativeDates || [])].filter(Boolean);
  const dateMatch = allDates.some((d) => new Date(d).toISOString() === new Date(selectedDate).toISOString());

  if (!dateMatch && allDates.length > 0) {
    throw new AppError('Selected date must be one of the proposed dates', 400, 'INVALID_DATE');
  }

  // Create appointment
  const appointment = await Appointment.create({
    userId: ticket.userId,
    ticketId: ticket.id,
    title: `Service: ${ticket.type}`,
    description: ticket.description,
    type: 'service',
    date: new Date(selectedDate).toISOString().split('T')[0],
    startTime: new Date(selectedDate).toTimeString().split(' ')[0].substring(0, 5),
    status: 'confirmed',
    assignedTo: ticket.assignedTo,
  });

  // Update ticket status
  ticket.status = 'confirmed';
  ticket.appointmentDate = selectedDate;
  await ticket.save();

  // Notify the ticket creator
  await Notification.create({
    userId: ticket.userId,
    title: 'Termin bestätigt',
    message: `Ihr Termin für Ticket ${ticket.ticketNumber} wurde bestätigt.`,
    type: 'appointment_reminder',
    category: 'appointment',
    relatedId: appointment.id,
    relatedType: 'appointment',
    deepLink: `/appointments/${appointment.id}`,
  });

  logger.info('Appointment confirmed', { ticketId, appointmentId: appointment.id });

  return appointment;
}

// Returns true if `staffUserId` is currently assigned to a non-closed ticket
// belonging to `customerId`. Grants read access to that customer's prior tickets
// so recurring problems can be traced — but only while actively handling.
async function hasActiveTicketFromCustomer(staffUserId, customerId, models) {
  const { Ticket } = models;
  const active = await Ticket.count({
    where: {
      userId: customerId,
      assignedTo: staffUserId,
      status: { [Op.notIn]: ['closed', 'completed', 'cancelled'] },
    },
  });
  return active > 0;
}

// Get all tickets for a specific customer (staff only)
async function getCustomerTickets(customerId, staffUserId, query, models) {
  const { Ticket, User, ChatMessage, Repair } = models;
  const { page = 1, limit = 50 } = query;

  const customer = await User.findByPk(customerId, {
    attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'profilePicture', 'role', 'customerNumber', 'phone', 'address', 'createdAt'],
  });
  if (!customer) {
    throw new NotFoundError('Customer');
  }

  // Access gate: admins/super_admins see any customer. Other staff only when
  // they currently handle a ticket from this customer.
  const staff = await User.findByPk(staffUserId, { attributes: ['role'] });
  const isAdmin = staff && (staff.role === 'admin' || staff.role === 'super_admin');
  if (!isAdmin) {
    const allowed = await hasActiveTicketFromCustomer(staffUserId, customerId, models);
    if (!allowed) {
      throw new AppError(
        'Sie können die Kundenhistorie nur einsehen, während Sie ein Ticket dieses Kunden bearbeiten.',
        403,
        'CUSTOMER_HISTORY_DENIED'
      );
    }
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: tickets, count: total } = await Ticket.findAndCountAll({
    where: { userId: customerId },
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'username', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset,
  });

  // Enrich with message counts — one grouped query for the whole page instead
  // of one COUNT per ticket.
  const ticketIds = tickets.map((tk) => tk.id);
  const countMap = {};
  if (ticketIds.length) {
    const countRows = await ChatMessage.findAll({
      where: { ticketId: { [Op.in]: ticketIds } },
      attributes: ['ticketId', [fn('COUNT', col('id')), 'cnt']],
      group: ['ticketId'],
      raw: true,
    });
    countRows.forEach((r) => { countMap[r.ticketId] = parseInt(r.cnt, 10) || 0; });
  }
  const enrichedTickets = tickets.map((ticket) => {
    const data = ticket.toJSON();
    data.messageCount = countMap[ticket.id] || 0;
    return data;
  });

  // Full repair history so staff see what was already worked on for this
  // customer (matched by the user account the repairs are synced to).
  let repairs = [];
  try {
    const repairRows = await Repair.findAll({
      where: { userId: customerId },
      attributes: [
        'id', 'repairNumber', 'deviceName', 'deviceDescription', 'problemDescription',
        'status', 'category', 'cost', 'costEstimate', 'technicianName',
        'estimatedCompletion', 'actualCompletion', 'createdAt',
      ],
      order: [['createdAt', 'DESC']],
    });
    repairs = repairRows.map((r) => r.toJSON());
  } catch (e) { /* repairs are best-effort — never block the profile */ }

  return {
    customer: customer.toJSON(),
    tickets: enrichedTickets,
    repairs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

module.exports = {
  createTicket,
  getUserTickets,
  getAllTickets,
  getAdminTickets,
  getActiveChats,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  closeTicket,
  forwardTicket,
  rateTicket,
  getStaffRatings,
  getAvailableStaff,
  getCustomerTickets,
  sendChatMessage,
  getChatMessages,
  editMessage,
  deleteMessage,
  confirmAppointment,
};
