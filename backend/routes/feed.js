const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const authMiddleware = require('../middleware/auth');  // Neu: Import von middleware

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).populate('userId', 'username');
  res.json(posts);
});

router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.permissions.some(p => ['full_access_grant', 'full_access'].includes(p))) {
    return res.status(403).json({ msg: 'Keine Berechtigung' });
  }
  const newPost = new Post({
    content: req.body.content,
    type: req.body.type,
    mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
    userId: req.user.id
  });
  await newPost.save();
  res.json(newPost);
});

module.exports = router;  // Einfacher Export