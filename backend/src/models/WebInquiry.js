const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Inquiry sent through a form on the website (no customer account, so the
// customer is reached by e-mail or phone). Inquiries from the app are tickets
// with a chat instead, see Ticket.productTitle.
const WebInquiry = sequelize.define('WebInquiry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // What the customer asks about (see TOPICS in inquiryController):
  // produkt | allgemein | werkstatt | ersatzteile | fahrrad | kaercher | maehroboter | rueckruf
  topic: {
    type: DataTypes.STRING,
    defaultValue: 'produkt',
  },
  // Department that answers it: verkauf | service | fahrrad | motor | kaercher | robby
  department: {
    type: DataTypes.STRING,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Optional only for a callback request (phone is enough there)
  email: {
    type: DataTypes.STRING,
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
  // Website page the form was sent from (path only, e.g. /werkstatt.html)
  pageUrl: {
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
