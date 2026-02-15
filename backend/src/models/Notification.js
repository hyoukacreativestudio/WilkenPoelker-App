const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      'repair_status',
      'repair_ready',
      'appointment_reminder',
      'chat_message',
      'feed_post',
      'offer',
      'system'
    ),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('repair', 'appointment', 'chat', 'feed', 'offer', 'system'),
    allowNull: false,
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deepLink: {
    type: DataTypes.STRING,
  },
  relatedId: {
    type: DataTypes.UUID,
  },
  relatedType: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
});

module.exports = Notification;
