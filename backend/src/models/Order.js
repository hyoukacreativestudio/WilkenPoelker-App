const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A purchase request ("Bestellung") written by a department in the desktop tool.
// Everything is collected here; the orders_manager (Bestellungen) reviews the
// list and actually places the orders, then marks them "ordered". Amazon items
// are the same but carry a link and source='amazon'.
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Which department wrote it (e.g. 'fahrrad', 'reinigung', 'service',
  // 'rasenmaeher', 'robby', 'verkauf', 'admin'). Drives the folder/list split.
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Legacy fixed source (kept for old rows); free-text source is sourceText.
  source: {
    type: DataTypes.ENUM('shop', 'amazon'),
    defaultValue: 'shop',
  },
  // Free-text source ("Shop", "Amazon", "Bosch", …) — what the user types
  sourceText: {
    type: DataTypes.STRING,
    defaultValue: 'Shop',
  },
  // Optional link for ANY order (not just Amazon)
  link: {
    type: DataTypes.STRING,
  },
  articleNumber: {
    type: DataTypes.STRING,
  },
  description: {
    type: DataTypes.STRING, // "was es ist"
    allowNull: false,
  },
  customerName: {
    type: DataTypes.STRING,
  },
  customerNumber: {
    type: DataTypes.STRING,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  // How many of the quantity are for stock ("fürs Lager")
  quantityForStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  amazonLink: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('open', 'ordered', 'cancelled'),
    defaultValue: 'open',
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
  // department login is shared, this is who actually wrote the order.
  handle: {
    type: DataTypes.STRING,
  },
  orderedBy: {
    type: DataTypes.UUID,
  },
  orderedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'orders',
  indexes: [
    { fields: ['department'] },
    { fields: ['status'] },
    { fields: ['source'] },
  ],
});

module.exports = Order;
