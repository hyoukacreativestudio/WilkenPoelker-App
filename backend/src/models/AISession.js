const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AISession = sequelize.define('AISession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  category: {
    type: DataTypes.ENUM('bike', 'cleaning', 'motor', 'general'),
    allowNull: false,
  },
  messages: {
    type: DataTypes.JSON,
  },
  status: {
    type: DataTypes.ENUM('active', 'escalated', 'closed'),
    defaultValue: 'active',
  },
  escalatedTicketId: {
    type: DataTypes.UUID,
    field: 'escalated_ticket_id',
    references: {
      model: 'tickets',
      key: 'id',
    },
  },
  totalTokens: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_tokens',
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 0,
    field: 'total_cost',
  },
}, {
  tableName: 'ai_sessions',
  underscored: true,
  timestamps: true,
});

module.exports = AISession;
