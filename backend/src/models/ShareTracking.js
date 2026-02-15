const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShareTracking = sequelize.define('ShareTracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  entityType: {
    type: DataTypes.ENUM('product', 'post', 'offer'),
    allowNull: false,
    field: 'entity_type',
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'entity_id',
  },
  channel: {
    type: DataTypes.STRING,
  },
  sharedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'shared_at',
  },
}, {
  tableName: 'share_trackings',
  underscored: true,
  timestamps: true,
});

module.exports = ShareTracking;
