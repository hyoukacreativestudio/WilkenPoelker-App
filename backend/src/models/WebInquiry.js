const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Product inquiry sent through the form on the website (no customer account, so
// the customer is reached by e-mail or phone). Inquiries from the app are tickets
// with a chat instead, see Ticket.productTitle.
const WebInquiry = sequelize.define('WebInquiry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
  },
  productTitle: {
    type: DataTypes.STRING,
  },
  productSlug: {
    type: DataTypes.STRING,
  },
  artNr: {
    type: DataTypes.STRING,
  },
  // new | in_progress | done
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'new',
  },
  handledBy: {
    type: DataTypes.UUID,
  },
}, {
  tableName: 'web_inquiries',
  indexes: [
    { fields: ['status'] },
    { fields: ['created_at'] },
  ],
});

module.exports = WebInquiry;
