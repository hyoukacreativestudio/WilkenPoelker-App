const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceRating = sequelize.define('ServiceRating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  staffId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  ticketId: {
    type: DataTypes.UUID,
  },
  repairId: {
    type: DataTypes.STRING,
  },
  type: {
    type: DataTypes.ENUM('repair', 'service', 'consultation'),
    allowNull: false,
  },
  overallRating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },
  qualityRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5,
    },
  },
  friendlinessRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5,
    },
  },
  waitTimeRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5,
    },
  },
  valueRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5,
    },
  },
  text: {
    type: DataTypes.TEXT,
  },
  photos: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  isAnonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'service_ratings',
  timestamps: true,
  underscored: true,
});

module.exports = ServiceRating;
