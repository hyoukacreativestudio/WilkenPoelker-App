const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Repair = sequelize.define('Repair', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  taifunRepairId: {
    type: DataTypes.STRING,
  },
  repairNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  deviceDescription: {
    type: DataTypes.TEXT,
  },
  devicePhoto: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM(
      'in_repair',
      'quote_created',
      'parts_ordered',
      'repair_done',
      'ready',
      'completed'
    ),
    defaultValue: 'in_repair',
  },
  statusHistory: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  estimatedCompletion: {
    type: DataTypes.DATEONLY,
  },
  actualCompletion: {
    type: DataTypes.DATEONLY,
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
  },
  costEstimate: {
    type: DataTypes.DECIMAL(10, 2),
  },
  technicianId: {
    type: DataTypes.UUID,
  },
  technicianName: {
    type: DataTypes.STRING,
  },
  problemDescription: {
    type: DataTypes.TEXT,
  },
  repairNotes: {
    type: DataTypes.TEXT,
  },
  invoiceUrl: {
    type: DataTypes.STRING,
  },
  warrantyStatus: {
    type: DataTypes.STRING,
  },
  warrantyExpires: {
    type: DataTypes.DATEONLY,
  },
  isRated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Customer acknowledges "ready for pickup"
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Weekly archive: acknowledged repairs move here at end of week
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'repairs',
  timestamps: true,
  underscored: true,
});

module.exports = Repair;
