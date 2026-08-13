const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  ticketId: {
    type: DataTypes.UUID,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  type: {
    type: DataTypes.ENUM('service', 'pickup', 'delivery', 'inspection', 'consultation', 'other', 'repair', 'property_viewing'),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  endTime: {
    type: DataTypes.TIME,
  },
  status: {
    type: DataTypes.ENUM('pending', 'proposed', 'confirmed', 'cancelled', 'completed', 'rescheduled'),
    defaultValue: 'pending',
  },
  location: {
    type: DataTypes.JSON,
    defaultValue: {
      name: 'WilkenPoelker',
      address: 'Musterstra\u00dfe 1, 49000 Osnabr\u00fcck',
      lat: 52.2799,
      lng: 8.0472,
    },
  },
  assignedTo: {
    type: DataTypes.UUID,
  },
  reminderSent24h: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  reminderSent1h: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  cancelledAt: {
    type: DataTypes.DATE,
  },
  cancelReason: {
    type: DataTypes.TEXT,
  },
  rescheduledFrom: {
    type: DataTypes.UUID,
  },
  proposedText: {
    type: DataTypes.TEXT,
  },
  customerNote: {
    type: DataTypes.TEXT,
  },
  // Registration tracking – staff confirms appointment is entered in calendar
  registeredBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  registeredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Staff follow-up question to customer
  staffQuestion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  staffQuestionAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  staffQuestionBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // ── Desktop/company-tool: appointments staff create by hand ──
  // For these, userId points at the staff account; the customer is stored as
  // free text (number/name/phone) since they may not have an app account.
  createdByStaff: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  customerNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Personal initials ("Kürzel") of the staff member who entered it (shared login)
  handle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'appointments',
  timestamps: true,
  underscored: true,
});

module.exports = Appointment;
