const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A single clock-in / clock-out session for a person (home-office time clock in
// the hidden admin tool). Daily hours = sum of (clockOut - clockIn) that day.
const TimeClock = sequelize.define('TimeClock', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  personName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  clockIn: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  clockOut: {
    type: DataTypes.DATE,
    allowNull: true, // null = still running
  },
  activity: {
    type: DataTypes.STRING,
    defaultValue: 'App-Entwicklung',
  },
  // When a day is checked off ("erledigt") it moves out of the active list.
  // Can be undone for a week; after that it is auto-deleted.
  doneAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'time_clocks',
  underscored: true,
  timestamps: true,
});

module.exports = TimeClock;
