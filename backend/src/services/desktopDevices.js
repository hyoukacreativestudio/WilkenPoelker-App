const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const config = require('../config/env');

// Protection of the PC program (desktop tool), see models/DesktopDevice.js.
//
// .env on the server (set by /root/pc-schutz-einrichten.sh):
//   DESKTOP_DEVICE_PAIRING=on          only paired PCs may log in
//   ADMIN_DESKTOP_PASSWORD_HASH=...    scrypt hash of the Admin password
// Without DESKTOP_DEVICE_PAIRING every PC may log in as before; PCs can be
// paired anyway, so the switch can be turned on once all of them are.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const CODE_LENGTH = 8; // 40 bits, valid 24 hours, single use, rate-limited
const CODE_VALID_MS = 24 * 60 * 60 * 1000;
const ADMIN_TICKET_HOURS = 12; // the Admin types the password once per working day
const TOUCH_EVERY_MS = 10 * 60 * 1000;

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

function pairingRequired() {
  return /^(1|true|on|ja|yes)$/i.test(String(process.env.DESKTOP_DEVICE_PAIRING || '').trim());
}

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function randomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

const formatCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

function cleanName(name) {
  return String(name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
}

function models() {
  return require('../models');
}

// Creates a pairing code for a new PC. The code itself is shown once and never
// stored (only its hash).
async function createPairingCode(name, createdBy) {
  const { DesktopDevice } = models();
  const label = cleanName(name) || 'PC';
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      const device = await DesktopDevice.create({
        name: label,
        pairingCodeHash: sha256(code),
        pairingExpiresAt: new Date(Date.now() + CODE_VALID_MS),
        createdBy: createdBy ? String(createdBy).slice(0, 64) : null,
      });
      return { code: formatCode(code), device };
    } catch (e) {
      if (e.name !== 'SequelizeUniqueConstraintError') throw e;
    }
  }
  throw new Error('Kein freier Kopplungscode gefunden');
}

// A PC enters its code: it becomes a paired device and gets its device key.
async function pair(code, name) {
  const { DesktopDevice } = models();
  const normalized = normalizeCode(code);
  if (normalized.length !== CODE_LENGTH) return null;
  const device = await DesktopDevice.findOne({
    where: {
      pairingCodeHash: sha256(normalized),
      pairingExpiresAt: { [Op.gt]: new Date() },
      tokenHash: null,
      revokedAt: null,
    },
  });
  if (!device) return null;
  const deviceToken = crypto.randomBytes(32).toString('base64url');
  // Compare-and-set: two PCs entering the same code at once - only one wins
  const [updated] = await DesktopDevice.update({
    tokenHash: sha256(deviceToken),
    pairingCodeHash: null,
    pairingExpiresAt: null,
    pairedAt: new Date(),
    lastSeenAt: new Date(),
    ...(cleanName(name) ? { name: cleanName(name) } : {}),
  }, { where: { id: device.id, tokenHash: null } });
  if (updated !== 1) return null;
  return { deviceToken, device: await device.reload() };
}

// The paired, not revoked device of this key, or null.
async function findDevice(deviceToken) {
  const token = String(deviceToken || '');
  if (token.length < 20 || token.length > 100) return null;
  const { DesktopDevice } = models();
  const device = await DesktopDevice.findOne({ where: { tokenHash: sha256(token), revokedAt: null } });
  if (device && (!device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() > TOUCH_EVERY_MS)) {
    device.update({ lastSeenAt: new Date() }).catch(() => {});
  }
  return device;
}

async function listDevices() {
  const { DesktopDevice } = models();
  const rows = await DesktopDevice.findAll({ order: [['createdAt', 'DESC']] });
  const now = Date.now();
  return rows
    // Expired, never used codes are just clutter
    .filter((d) => d.tokenHash || d.revokedAt || (d.pairingExpiresAt && d.pairingExpiresAt.getTime() > now))
    .map((d) => ({
      id: d.id,
      name: d.name,
      status: d.revokedAt ? 'revoked' : d.tokenHash ? 'paired' : 'code',
      codeValidUntil: d.tokenHash ? null : d.pairingExpiresAt,
      pairedAt: d.pairedAt,
      lastSeenAt: d.lastSeenAt,
      revokedAt: d.revokedAt,
      createdAt: d.createdAt,
    }));
}

async function revokeDevice(id) {
  const { DesktopDevice } = models();
  const [n] = await DesktopDevice.update(
    { revokedAt: new Date(), pairingCodeHash: null, pairingExpiresAt: null },
    { where: { id, revokedAt: null } },
  );
  return n === 1;
}

// ── Admin password ──
// Stored as "scrypt$<salt>$<hash>" (base64url) in ADMIN_DESKTOP_PASSWORD_HASH.
function hashAdminPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function sameBytes(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Until the setup script has run, the old built-in Admin password still works,
// but only while the device protection is off. Only its hash is kept here.
const LEGACY_ADMIN_SHA256 = '587cfeb0372783f284a7cacb9f712e5cc766d571ea27c32def9bab44250fe7d6';

function adminPasswordConfigured() {
  return !!(process.env.ADMIN_DESKTOP_PASSWORD_HASH || process.env.ADMIN_DESKTOP_PASSWORD);
}

function checkAdminPassword(password) {
  const given = String(password || '');
  if (!given) return false;
  const stored = String(process.env.ADMIN_DESKTOP_PASSWORD_HASH || '').trim();
  if (stored) {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const want = Buffer.from(hash, 'base64url');
    return sameBytes(crypto.scryptSync(given, Buffer.from(salt, 'base64url'), want.length), want);
  }
  if (process.env.ADMIN_DESKTOP_PASSWORD) {
    return sameBytes(Buffer.from(sha256(given)), Buffer.from(sha256(process.env.ADMIN_DESKTOP_PASSWORD)));
  }
  if (pairingRequired()) return false;
  return sameBytes(Buffer.from(sha256(given)), Buffer.from(LEGACY_ADMIN_SHA256));
}

// After the Admin typed the password, the PC gets a ticket for the silent
// re-login (instead of keeping the password in the browser). It is bound to
// the device (if paired) and ends after ADMIN_TICKET_HOURS or when the device
// is revoked or the Admin password is changed.
function passwordStamp() {
  return sha256(process.env.ADMIN_DESKTOP_PASSWORD_HASH || process.env.ADMIN_DESKTOP_PASSWORD || 'legacy').slice(0, 16);
}

function issueAdminTicket(user, device) {
  return jwt.sign(
    { type: 'desktop-admin', id: user.id, dev: device ? device.id : null, pw: passwordStamp() },
    config.jwt.secret,
    { expiresIn: `${ADMIN_TICKET_HOURS}h` },
  );
}

function checkAdminTicket(ticket, user, device) {
  try {
    const t = jwt.verify(String(ticket || ''), config.jwt.secret);
    if (t.type !== 'desktop-admin' || t.id !== user.id || t.pw !== passwordStamp()) return false;
    if (t.dev && (!device || device.id !== t.dev)) return false;
    if (pairingRequired() && !t.dev) return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  pairingRequired,
  createPairingCode,
  pair,
  findDevice,
  listDevices,
  revokeDevice,
  hashAdminPassword,
  adminPasswordConfigured,
  checkAdminPassword,
  issueAdminTicket,
  checkAdminTicket,
  normalizeCode,
};
