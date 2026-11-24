const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A company PC that may use the PC program (desktop tool).
// A row starts as a one-time pairing code (pairingCodeHash, valid 24 hours).
// Entering the code on a PC turns it into a paired device: the PC gets a
// random device key, only its sha256 is stored here (tokenHash). With
// DESKTOP_DEVICE_PAIRING=on in .env, the department login only works on PCs
// with a valid, not revoked device key (controllers/desktopController.js).
// No IP addresses or other data about the people using the PC are kept.
const DesktopDevice = sequelize.define('DesktopDevice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // What the admin called the PC ("Werkstatt", "Kasse 1")
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  pairingCodeHash: {
    type: DataTypes.STRING(64),
    unique: true,
  },
  pairingExpiresAt: {
    type: DataTypes.DATE,
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    unique: true,
  },
  pairedAt: {
    type: DataTypes.DATE,
  },
  lastSeenAt: {
    type: DataTypes.DATE,
  },
  revokedAt: {
    type: DataTypes.DATE,
  },
  // 'server' (script on the server) or the id of the admin account
  createdBy: {
    type: DataTypes.STRING(64),
  },
}, {
  tableName: 'desktop_devices',
  timestamps: true,
  underscored: true,
});

module.exports = DesktopDevice;
