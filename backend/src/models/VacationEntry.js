const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A vacation / absence entry for an employee (hidden admin tool → Urlaub tab).
const VacationEntry = sequelize.define('VacationEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  personName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // 'urlaub' | 'krank' | 'sonstiges'
    defaultValue: 'urlaub',
  },
  // Requests start 'pending' and only land in the calendar once 'approved'.
  status: {
    type: DataTypes.STRING, // 'pending' | 'approved'
    defaultValue: 'pending',
  },
  note: {
    type: DataTypes.TEXT,
  },
  createdByHandle: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'vacation_entries',
  underscored: true,
  timestamps: true,
});

module.exports = VacationEntry;
