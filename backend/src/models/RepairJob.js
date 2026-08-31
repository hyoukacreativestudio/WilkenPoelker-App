const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A bike-workshop repair job the Service account assigns (by number) to a single
// mechanic for a given day. Mechanics tick it off or flag a warning; unfinished
// jobs roll over to the current day automatically (see repairJobController).
const RepairJob = sequelize.define('RepairJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  repairNumber: {
    type: DataTypes.STRING,
  },
  customerName: {
    type: DataTypes.STRING,
  },
  customerNumber: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  device: {
    type: DataTypes.STRING,
  },
  assignedTo: {
    type: DataTypes.STRING, // mechanic's full name
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  done: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  doneAt: {
    type: DataTypes.DATE,
  },
  warnNote: {
    type: DataTypes.TEXT,
  },
  note: {
    type: DataTypes.TEXT,
  },
  createdByHandle: {
    type: DataTypes.STRING,
  },
  // Set when this job was auto-created from a Fahrrad appointment (dedupe key).
  sourceAppointmentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'repair_jobs',
  underscored: true,
  timestamps: true,
});

module.exports = RepairJob;
