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
      'system',
      'ticket_closed'
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

// Central push: EVERY notification also goes out as a push with sound. This
// guarantees "push + Ton" everywhere a notification is created, without having
// to remember it at each call site. pushService is required lazily to avoid a
// circular dependency, and failures never block the create.
function pushForNotification(n) {
  if (!n || !n.userId) return;
  try {
    const pushService = require('../services/pushService');
    pushService.sendToUser(n.userId, {
      title: n.title,
      body: n.message,
      data: {
        notificationId: n.id,
        type: n.type,
        category: n.category,
        deepLink: n.deepLink || '',
        relatedId: n.relatedId || '',
        relatedType: n.relatedType || '',
      },
    }).catch(() => {});
  } catch (e) { /* best-effort */ }
}

Notification.addHook('afterCreate', (n) => pushForNotification(n));
Notification.addHook('afterBulkCreate', (rows) => {
  (rows || []).forEach((n) => pushForNotification(n));
});

module.exports = Notification;
