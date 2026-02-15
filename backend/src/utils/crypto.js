const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/env');

async function hashPassword(password) {
  return bcrypt.hash(password, config.security.bcryptRounds);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateTicketNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `WP-${year}-${random}`;
}

function generateRepairNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `REP-${year}-${random}`;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  hashToken,
  generateTicketNumber,
  generateRepairNumber,
};
