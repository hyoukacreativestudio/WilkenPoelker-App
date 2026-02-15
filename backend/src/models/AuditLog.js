const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entityType: {
    type: DataTypes.STRING,
    field: 'entity_type',
  },
  entityId: {
    type: DataTypes.UUID,
    field: 'entity_id',
  },
  previousValues: {
    type: DataTypes.JSON,
    field: 'previous_values',
  },
  newValues: {
    type: DataTypes.JSON,
    field: 'new_values',
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.STRING,
    field: 'user_agent',
  },
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false,
});

module.exports = AuditLog;
