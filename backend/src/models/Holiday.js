const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Holiday = sequelize.define('Holiday', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_closed',
  },
  specialHours: {
    type: DataTypes.JSON,
    field: 'special_hours',
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_recurring',
  },
}, {
  tableName: 'holidays',
  underscored: true,
  timestamps: true,
});

module.exports = Holiday;
