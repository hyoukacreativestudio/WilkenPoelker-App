const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OpeningHour = sequelize.define('OpeningHour', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'day_of_week',
    validate: {
      min: 0,
      max: 6,
    },
  },
  season: {
    type: DataTypes.ENUM('standard', 'winter'),
    allowNull: false,
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_closed',
  },
  periods: {
    type: DataTypes.JSON,
  },
}, {
  tableName: 'opening_hours',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['day_of_week', 'season'],
    },
  ],
});

module.exports = OpeningHour;
