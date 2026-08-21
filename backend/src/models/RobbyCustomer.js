const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A customer who bought a Robby (lawn robot). Maintained by the Robby department
// in the desktop tool. Searchable by every field.
const RobbyCustomer = sequelize.define('RobbyCustomer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerNumber: {
    type: DataTypes.STRING,
  },
  street: {
    type: DataTypes.STRING,
  },
  zip: {
    type: DataTypes.STRING,
  },
  city: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  device: {
    type: DataTypes.STRING, // which Robby model
  },
  pin: {
    type: DataTypes.STRING, // device PIN from the old customer list
  },
  purchaseDate: {
    type: DataTypes.DATEONLY,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  createdByHandle: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'robby_customers',
  timestamps: true,
  underscored: true,
});

module.exports = RobbyCustomer;
