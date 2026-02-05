const express = require('express');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const notifs = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(notifs);
});

router.post('/markRead', authMiddleware, async (req, res) => {
  const { id } = req.body;
  await Notification.findByIdAndUpdate(id, { read: true });
  res.json({ msg: 'Gelesen' });
});

module.exports = router;