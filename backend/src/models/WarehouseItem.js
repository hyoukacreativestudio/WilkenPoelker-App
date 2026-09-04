const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A "bring this to the front" request for the warehouse ("Lager"). Sales staff
// write which items should be fetched (brand, color, article no, what it is);
// the warehouse worker sees the list and ticks items off as brought.
const WarehouseItem = sequelize.define('WarehouseItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  brand: {
    type: DataTypes.STRING,
  },
  color: {
    type: DataTypes.STRING,
  },
  articleNumber: {
    type: DataTypes.STRING,
  },
  description: {
    type: DataTypes.STRING, // legacy "was es ist" — optional now
    allowNull: true,
  },
  frameSize: {
    type: DataTypes.STRING, // Rahmengröße
  },
  model: {
    type: DataTypes.STRING, // Modell
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('requested', 'in_progress', 'brought'),
    defaultValue: 'requested',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  createdBy: {
    type: DataTypes.UUID,
  },
  createdByName: {
    type: DataTypes.STRING,
  },
  // Personal initials ("Kürzel") of the staff member — required, since the
  // department login is shared, this is who actually wrote the request.
  handle: {
    type: DataTypes.STRING,
  },
  broughtBy: {
    type: DataTypes.UUID,
  },
  broughtAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'warehouse_items',
  indexes: [
    { fields: ['status'] },
  ],
});

module.exports = WarehouseItem;
