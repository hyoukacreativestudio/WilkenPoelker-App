const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomerNumberRequest = sequelize.define('CustomerNumberRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  isExistingCustomer: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  assignedCustomerNumber: {
    type: DataTypes.STRING,
  },
  reviewedBy: {
    type: DataTypes.UUID,
  },
  reviewedAt: {
    type: DataTypes.DATE,
  },
  reviewNote: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'customer_number_requests',
  timestamps: true,
  underscored: true,
});

module.exports = CustomerNumberRequest;
