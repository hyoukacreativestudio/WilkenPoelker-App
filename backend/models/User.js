const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  customerNumber: String,
  role: { type: String, default: 'customer' },
  permissions: [String],
  profilePicture: String,
  deviceToken: String,
  settings: {
    darkMode: { type: Boolean, default: false },
    textSize: { type: String, default: 'medium' },
    notifications: { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('User', userSchema);