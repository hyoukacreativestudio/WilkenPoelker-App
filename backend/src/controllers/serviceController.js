const serviceService = require('../services/serviceService');
const emailService = require('../services/emailService');
const pushService = require('../services/pushService');
const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const { Ticket, ChatMessage, User, Product, ProductReview, Favorite, Repair, Notification, ShareTracking, Appointment, ServiceRating } = require('../models');

const models = { Ticket, ChatMessage, User, Notification, Appointment, ServiceRating };

// ──────────────────────────────────────────────
// TICKETS
// ──────────────────────────────────────────────

// POST /tickets
const createTicket = asyncHandler(async (req, res) => {
  const { title, type, category, description, urgency, appointmentDate, alternativeDates } = req.body;

  // Process file attachments
  const { uploadFile } = require('../services/uploadService');
  const attachments = await Promise.all(
    (req.files || []).map(async (file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: await uploadFile(file, 'tickets'),
    }))
  );

  const ticket = await serviceService.createTicket(
    { title, type, category, description, urgency, appointmentDate, alternativeDates, attachments },
    req.user.id,
    models
  );

  // Send email confirmation (non-blocking)
  const user = await User.findByPk(req.user.id, { attributes: ['email', 'firstName', 'username'] });
  if (user) {
    emailService
      .sendTicketConfirmation(user.email, user.firstName || user.username, ticket)
      .catch(() => {});
  }

  // Send push notification to category-relevant managers (non-blocking)
  const categoryRoleMap = {
    bike: ['bike_manager'],
    cleaning: ['cleaning_manager'],
    motor: ['motor_manager'],
    service: ['service_manager'],
  };
  const categoryRoles = categoryRoleMap[category || 'service'] || ['service_manager'];
  const allRoles = ['admin', 'super_admin', ...categoryRoles];

  const managerIds = await User.findAll({
    where: { role: allRoles, isActive: true },
    attributes: ['id'],
  });
  if (managerIds.length > 0) {
    pushService
      .sendToMultiple(
        managerIds.map((m) => m.id),
        {
          title: 'Neues Service-Ticket',
          body: `Ticket ${ticket.ticketNumber} – ${title || type}`,
          data: { type: 'new_ticket', ticketId: ticket.id },
        }
      )
      .catch(() => {});
  }

  res.status(201).json({
    success: true,
    data: { ticket },
  });
});

// GET /tickets
const getUserTickets = asyncHandler(async (req, res) => {
  const result = await serviceService.getUserTickets(req.user.id, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /tickets/all
const getAllTickets = asyncHandler(async (req, res) => {
  const result = await serviceService.getAllTickets(req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /tickets/admin - Tickets filtered by staff's category permissions
const getAdminTickets = asyncHandler(async (req, res) => {
  const result = await serviceService.getAdminTickets(req.user, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /tickets/active-chats - Active chats for current user
const getActiveChats = asyncHandler(async (req, res) => {
  const result = await serviceService.getActiveChats(req.user.id, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /tickets/:id
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await serviceService.getTicketById(req.params.id, req.user.id, models);

  res.json({
    success: true,
    data: { ticket },
  });
});

// PUT /tickets/:id/status
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new AppError('Status is required', 400, 'STATUS_REQUIRED');
  }

  const ticket = await serviceService.updateTicketStatus(req.params.id, status, req.user.id, models);

  // Send push notification to ticket owner (non-blocking)
  pushService
    .sendToUser(ticket.userId, {
      title: 'Ticket-Status aktualisiert',
      body: `Ticket ${ticket.ticketNumber}: ${status}`,
      data: { type: 'ticket_status', ticketId: ticket.id },
    })
    .catch(() => {});

  res.json({
    success: true,
    data: { ticket },
  });
});

// PUT /tickets/:id/assign
const assignTicket = asyncHandler(async (req, res) => {
  const { staffId } = req.body;

  if (!staffId) {
    throw new AppError('Staff ID is required', 400, 'STAFF_ID_REQUIRED');
  }

  const ticket = await serviceService.assignTicket(req.params.id, staffId, models);

  // Send push notification to assigned staff (non-blocking)
  pushService
    .sendToUser(staffId, {
      title: 'Ticket zugewiesen',
      body: `Ticket ${ticket.ticketNumber} wurde Ihnen zugewiesen.`,
      data: { type: 'ticket_assigned', ticketId: ticket.id },
    })
    .catch(() => {});

  res.json({
    success: true,
    data: { ticket },
  });
});

// PUT /tickets/:id/close - Close a ticket (staff only)
const closeTicket = asyncHandler(async (req, res) => {
  const ticket = await serviceService.closeTicket(req.params.id, req.user.id, models);

  // Emit socket event for real-time update
  const io = req.app.get('io');
  if (io) {
    io.to(`ticket:${ticket.id}`).emit('ticketClosed', {
      ticketId: ticket.id,
      closedBy: req.user.id,
    });
  }

  // Notify customer that the ticket was closed
  pushService
    .sendToUser(ticket.userId, {
      title: 'Chat geschlossen',
      body: `Ihr Ticket ${ticket.ticketNumber} wurde geschlossen. Bitte bewerten Sie den Service.`,
      data: { type: 'ticket_closed', ticketId: ticket.id },
    })
    .catch(() => {});

  res.json({
    success: true,
    data: { ticket },
  });
});

// PUT /tickets/:id/forward - Forward a ticket to another staff member
const forwardTicket = asyncHandler(async (req, res) => {
  const { targetStaffId } = req.body;

  if (!targetStaffId) {
    throw new AppError('Target staff ID is required', 400, 'TARGET_STAFF_REQUIRED');
  }

  const ticket = await serviceService.forwardTicket(req.params.id, req.user.id, targetStaffId, models);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`ticket:${ticket.id}`).emit('ticketForwarded', {
      ticketId: ticket.id,
      forwardedBy: req.user.id,
      forwardedTo: targetStaffId,
    });
  }

  // Notify new assignee
  pushService
    .sendToUser(targetStaffId, {
      title: 'Ticket weitergeleitet',
      body: `Ticket ${ticket.ticketNumber} wurde an Sie weitergeleitet.`,
      data: { type: 'ticket_forwarded', ticketId: ticket.id },
    })
    .catch(() => {});

  res.json({
    success: true,
    data: { ticket },
  });
});

// POST /tickets/:id/rate - Rate a closed ticket
const rateTicket = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
  }

  const serviceRating = await serviceService.rateTicket(
    req.params.id,
    req.user.id,
    { rating, comment },
    models
  );

  res.status(201).json({
    success: true,
    data: { rating: serviceRating },
  });
});

// GET /staff/:id/ratings - Get ratings for a staff member
const getStaffRatings = asyncHandler(async (req, res) => {
  const result = await serviceService.getStaffRatings(req.params.id, models);

  res.json({
    success: true,
    data: result,
  });
});

// GET /staff/available - Get available staff for forwarding
const getAvailableStaff = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const result = await serviceService.getAvailableStaff(category, models);

  res.json({
    success: true,
    data: result,
  });
});

// ──────────────────────────────────────────────
// CHAT MESSAGES
// ──────────────────────────────────────────────

// POST /tickets/:id/chat
const sendChatMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const ticketId = req.params.id;
  const hasFiles = req.files && req.files.length > 0;

  if ((!message || !message.trim()) && !hasFiles) {
    throw new AppError('Message or attachment is required', 400, 'MESSAGE_REQUIRED');
  }

  // Process attachment if present
  const { uploadFile: uploadToCloud } = require('../services/uploadService');
  const attachments = await Promise.all(
    (req.files || []).map(async (file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: await uploadToCloud(file, 'chat'),
    }))
  );

  const chatMessage = await serviceService.sendChatMessage(
    ticketId,
    req.user.id,
    { message: message ? message.trim() : '', attachments },
    models
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`ticket:${ticketId}`).emit('newMessage', chatMessage);
  }

  // Send push notification to the other party (non-blocking)
  const ticket = await Ticket.findByPk(ticketId);
  if (ticket) {
    const recipientId = req.user.id === ticket.userId ? ticket.assignedTo : ticket.userId;
    if (recipientId) {
      pushService
        .sendToUser(recipientId, {
          title: 'Neue Chat-Nachricht',
          body: message ? message.substring(0, 100) : 'Bild gesendet',
          data: { type: 'chat_message', ticketId },
        })
        .catch(() => {});
    }
  }

  res.status(201).json({
    success: true,
    data: { message: chatMessage },
  });
});

// GET /tickets/:id/chat
const getChatMessages = asyncHandler(async (req, res) => {
  const result = await serviceService.getChatMessages(req.params.id, req.user.id, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

// PUT /messages/:id
const editMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new AppError('Message is required', 400, 'MESSAGE_REQUIRED');
  }

  const updatedMessage = await serviceService.editMessage(req.params.id, req.user.id, message.trim(), models);

  res.json({
    success: true,
    data: { message: updatedMessage },
  });
});

// DELETE /messages/:id
const deleteMessage = asyncHandler(async (req, res) => {
  await serviceService.deleteMessage(req.params.id, req.user.id, models);

  res.json({
    success: true,
    message: 'Message deleted successfully',
  });
});

// ──────────────────────────────────────────────
// APPOINTMENTS
// ──────────────────────────────────────────────

// POST /tickets/:id/confirm-appointment
const confirmAppointment = asyncHandler(async (req, res) => {
  const appointment = await serviceService.confirmAppointment(
    req.params.id,
    req.user.id,
    req.body,
    models
  );

  res.status(201).json({
    success: true,
    data: { appointment },
  });
});

// GET /customers/:id/tickets - Get all tickets for a specific customer (staff only)
const getCustomerTickets = asyncHandler(async (req, res) => {
  const result = await serviceService.getCustomerTickets(req.params.id, req.query, models);

  res.json({
    success: true,
    data: result,
  });
});

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
