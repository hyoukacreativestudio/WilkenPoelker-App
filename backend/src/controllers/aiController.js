const aiService = require('../services/aiService');
const { asyncHandler } = require('../middlewares/errorHandler');

const chat = asyncHandler(async (req, res) => {
  const { category, message, sessionId } = req.body;

  // Process uploaded images for vision
  const images = [];
  if (req.files && req.files.length > 0) {
    const fs = require('fs');
    const path = require('path');
    for (const file of req.files) {
      const filePath = path.resolve(file.path);
      const base64 = fs.readFileSync(filePath).toString('base64');
      images.push({
        base64,
        mimeType: file.mimetype,
        url: `/uploads/${file.filename}`,
      });
    }
  }

  const result = await aiService.chat(req.user.id, {
    category,
    message,
    sessionId,
    images,
  });

  res.json({
    success: true,
    data: {
      reply: result.reply,
      sessionId: result.sessionId,
      needsHuman: result.needsHuman,
    },
  });
});

const getSessions = asyncHandler(async (req, res) => {
  const sessions = await aiService.getUserSessions(req.user.id);

  res.json({
    success: true,
    data: sessions,
  });
});

const getSessionById = asyncHandler(async (req, res) => {
  const session = await aiService.getSessionById(req.params.id, req.user.id);

  res.json({
    success: true,
    data: session,
  });
});

const escalateSession = asyncHandler(async (req, res) => {
  const result = await aiService.escalateSession(req.params.id, req.user.id);

  res.json({
    success: true,
    message: 'Sitzung wurde an einen Mitarbeiter weitergeleitet',
    data: {
      ticketId: result.ticketId,
      ticketNumber: result.ticketNumber,
    },
  });
});

module.exports = {
  chat,
  getSessions,
  getSessionById,
  escalateSession,
};
