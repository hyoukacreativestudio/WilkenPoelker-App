const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIUsage = sequelize.define('AIUsage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'session_id',
    references: {
      model: 'ai_sessions',
      key: 'id',
    },
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
  promptTokens: {
    type: DataTypes.INTEGER,
    field: 'prompt_tokens',
  },
  completionTokens: {
    type: DataTypes.INTEGER,
    field: 'completion_tokens',
  },
  totalTokens: {
    type: DataTypes.INTEGER,
    field: 'total_tokens',
  },
  cost: {
    type: DataTypes.DECIMAL(10, 6),
  },
  model: {
    type: DataTypes.STRING,
    defaultValue: 'gpt-3.5-turbo',
  },
}, {
  tableName: 'ai_usages',
  underscored: true,
  timestamps: true,
});

module.exports = AIUsage;
