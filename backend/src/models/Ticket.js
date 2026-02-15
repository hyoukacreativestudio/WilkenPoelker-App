const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ticketNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Allgemeine Anfrage',
  },
  type: {
    type: DataTypes.ENUM(
      'inspection',
      'repair',
      'consultation',
      'maintenance',
      'bike_question',
      'cleaning_question',
      'motor_question',
      'other'
    ),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('service', 'bike', 'cleaning', 'motor'),
    defaultValue: 'service',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  urgency: {
    type: DataTypes.ENUM('normal', 'urgent'),
    defaultValue: 'normal',
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'confirmed', 'completed', 'cancelled', 'closed'),
    defaultValue: 'open',
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  appointmentDate: {
    type: DataTypes.DATE,
  },
  alternativeDates: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  assignedTo: {
    type: DataTypes.UUID,
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  closedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  forwardedFrom: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  aiSessionId: {
    type: DataTypes.UUID,
  },
  aiConversation: {
    type: DataTypes.JSON,
  },
}, {
  tableName: 'tickets',
  timestamps: true,
  underscored: true,
});

module.exports = Ticket;
