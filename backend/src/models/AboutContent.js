const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AboutContent = sequelize.define('AboutContent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  section: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [['team', 'store', 'qmf', 'kaercher']],
    },
  },
  contentKey: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'about_contents',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['section', 'content_key'],
    },
  ],
});

module.exports = AboutContent;
