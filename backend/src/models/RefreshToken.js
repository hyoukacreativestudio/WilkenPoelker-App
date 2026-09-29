const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// One row per issued refresh token. All tokens of one login on one device share
// a `family`; rotating a token revokes the old row and adds a new one in the
// same family. Presenting an already-revoked token = reuse → only that family
// (that device's session) is revoked, other devices stay logged in.
// Replaces the single users.refresh_token column, which allowed only one
// session per user: logging in on a second device logged the first one out.
const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // sha256 hex of the JWT — the token itself is never stored
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  family: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  rememberMe: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['family'] },
  ],
});

module.exports = RefreshToken;
