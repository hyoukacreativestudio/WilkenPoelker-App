const { Op } = require('sequelize');
const { asyncHandler, NotFoundError } = require('../middlewares/errorHandler');
const { AppFeedback, User, Notification } = require('../models');
const logger = require('../utils/logger');

// POST /api/feedback (logged-in app user). Goes to the admins and nobody else.
const createFeedback = asyncHandler(async (req, res) => {
  const message = String(req.body.message).trim();
  await AppFeedback.create({ userId: req.user.id, message });

  try {
    const admins = await User.findAll({
      where: { role: { [Op.in]: ['admin', 'super_admin'] }, isActive: true },
      attributes: ['id'],
    });
    await Notification.bulkCreate(admins.map((a) => ({
      userId: a.id,
      title: 'Neues Feedback aus der App',
      message: message.slice(0, 80),
      type: 'system',
      category: 'system',
      relatedType: 'app_feedback',
    })));
  } catch (e) {
    logger.warn('Feedback notification failed', { error: e.message });
  }
  res.status(201).json({ success: true });
});

// ── PC program, admins only ──

const listFeedback = asyncHandler(async (req, res) => {
  const feedback = await AppFeedback.findAll({
    include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'customerNumber', 'email', 'phone'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: { feedback } });
});

const markFeedback = asyncHandler(async (req, res) => {
  const item = await AppFeedback.findByPk(req.params.id);
  if (!item) throw new NotFoundError('Feedback');
  await item.update({ read: req.body.read !== false });
  res.json({ success: true, data: { feedback: item } });
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const item = await AppFeedback.findByPk(req.params.id);
  if (!item) throw new NotFoundError('Feedback');
  await item.destroy();
  res.json({ success: true });
});

module.exports = { createFeedback, listFeedback, markFeedback, deleteFeedback };
