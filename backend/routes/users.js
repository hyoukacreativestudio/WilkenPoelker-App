const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.put('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  const updates = req.body;
  if (req.file) updates.profilePicture = `/uploads/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.id, updates);
  res.json({ msg: 'Profil aktualisiert' });
});

router.put('/permissions', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.permissions.includes('full_access_grant')) return res.status(403).json({ msg: 'Keine Berechtigung' });
  const { targetUserId, permissions } = req.body;
  await User.findByIdAndUpdate(targetUserId, { permissions });
  res.json({ msg: 'Berechtigungen aktualisiert' });
});

router.put('/settings', authMiddleware, async (req, res) => {
  const { darkMode, textSize, notifications } = req.body;
  await User.findByIdAndUpdate(req.user.id, { 'settings.darkMode': darkMode, 'settings.textSize': textSize, 'settings.notifications': notifications });
  res.json({ msg: 'Einstellungen gespeichert' });
});

router.post('/deviceToken', authMiddleware, async (req, res) => {
  const { token } = req.body;
  await User.findByIdAndUpdate(req.user.id, { deviceToken: token });
  res.json({ msg: 'Token gespeichert' });
});

// Admin-Only: Suche nach Users und Rechte ändern
router.get('/admin/search', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.permissions.includes('full_access_grant')) return res.status(403).json({ msg: 'Keine Berechtigung' });

  const { query } = req.query;  // Suche nach username oder email
  const users = await User.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ],
  }).select('-password');  // Ohne Passwort

  res.json(users);
});

router.put('/admin/updatePermissions', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.permissions.includes('full_access_grant')) return res.status(403).json({ msg: 'Keine Berechtigung' });

  const { userId, permissions } = req.body;  // permissions: Array, z.B. ['bike', 'service']
  await User.findByIdAndUpdate(userId, { permissions });
  res.json({ msg: 'Berechtigungen aktualisiert' });
});

module.exports = router;