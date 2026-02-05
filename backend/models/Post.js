const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: String,
  type: String,
  mediaUrl: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);