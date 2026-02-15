const appointmentService = require('../services/appointmentService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { ROLES } = require('../middlewares/roles');

const getAppointmentRequests = asyncHandler(async (req, res) => {
  const { status, type, page, limit } = req.query;

  const result = await appointmentService.getAppointmentRequests(req.user.role, {
    status,
    type,
    page: page || 1,
    limit: limit || 20,
  });

  res.json({
    success: true,
    data: result.appointments,
    pagination: result.pagination,
  });
});

const getOngoingAppointments = asyncHandler(async (req, res) => {
  const { type, page, limit } = req.query;

  const result = await appointmentService.getOngoingAppointments(req.user.role, {
    type,
    page: page || 1,
    limit: limit || 20,
  });

  res.json({
    success: true,
    data: result.appointments,
    pagination: result.pagination,
  });
});

const getAppointments = asyncHandler(async (req, res) => {
  const { from, to, status, type, page, limit } = req.query;

  const result = await appointmentService.getUserAppointments(req.user.id, {
    from,
    to,
    status,
    type,
    page: page || 1,
    limit: limit || 20,
  });

  res.json({
    success: true,
    data: result.appointments,
    pagination: result.pagination,
  });
});

const createAppointment = asyncHandler(async (req, res) => {
  const { title, description, type, date, startTime, endTime, ticketId } = req.body;

  const isAdminUser =
    req.user.role === ROLES.ADMIN || req.user.role === ROLES.SUPER_ADMIN;

  const appointment = await appointmentService.createAppointment(
    req.user.id,
    { title, description, type, date, startTime, endTime, ticketId },
    isAdminUser
  );

  res.status(201).json({
    success: true,
    message: 'Termin erfolgreich erstellt',
    data: appointment,
  });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(req.params.id);

  res.json({
    success: true,
    data: appointment,
  });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const isAdminUser =
    req.user.role === ROLES.ADMIN || req.user.role === ROLES.SUPER_ADMIN;

  const newAppointment = await appointmentService.rescheduleAppointment(
    req.params.id,
    req.user.id,
    req.body,
    isAdminUser
  );

  res.json({
    success: true,
    message: 'Termin erfolgreich umgebucht',
    data: newAppointment,
  });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const { cancelReason } = req.body;

  const appointment = await appointmentService.cancelAppointment(
    req.params.id,
    req.user.id,
    cancelReason
  );

  res.json({
    success: true,
    message: 'Termin erfolgreich storniert',
    data: appointment,
  });
});

const confirmAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.confirmAppointment(
    req.params.id,
    req.user.id
  );

  res.json({
    success: true,
    message: 'Termin erfolgreich bestaetigt',
    data: appointment,
  });
});

const getICalFile = asyncHandler(async (req, res) => {
  const icalContent = await appointmentService.generateICalContent(req.params.id);

  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="termin-${req.params.id}.ics"`,
  });

  res.send(icalContent);
});

const proposeTime = asyncHandler(async (req, res) => {
  const { date, proposedText } = req.body;

  const appointment = await appointmentService.proposeTime(
    req.params.id,
    req.user.id,
    { date, proposedText }
  );

  res.json({
    success: true,
    message: 'Terminvorschlag erfolgreich gesendet',
    data: appointment,
  });
});

const respondToProposal = asyncHandler(async (req, res) => {
  const { accept, message } = req.body;

  const appointment = await appointmentService.respondToProposal(
    req.params.id,
    req.user.id,
    { accept, message }
  );

  res.json({
    success: true,
    message: accept ? 'Termin bestaetigt' : 'Terminvorschlag abgelehnt',
    data: appointment,
  });
});

const getUnregisteredAppointments = asyncHandler(async (req, res) => {
  const { type, page, limit } = req.query;

  const result = await appointmentService.getUnregisteredAppointments(req.user.role, {
    type,
    page: page || 1,
    limit: limit || 20,
  });

  res.json({
    success: true,
    data: result.appointments,
    pagination: result.pagination,
  });
});

const registerAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.registerAppointment(
    req.params.id,
    req.user.id
  );

  res.json({
    success: true,
    message: 'Termin als eingetragen markiert',
    data: appointment,
  });
});

const askQuestion = asyncHandler(async (req, res) => {
  const { question } = req.body;

  const appointment = await appointmentService.askQuestion(
    req.params.id,
    req.user.id,
    question
  );

  res.json({
    success: true,
    message: 'Rueckfrage gesendet',
    data: appointment,
  });
});

const answerQuestion = asyncHandler(async (req, res) => {
  const { answer } = req.body;

  const appointment = await appointmentService.answerQuestion(
    req.params.id,
    req.user.id,
    answer
  );

  res.json({
    success: true,
    message: 'Antwort gesendet',
    data: appointment,
  });
});

module.exports = {
  getAppointments,
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
  getICalFile,
};
