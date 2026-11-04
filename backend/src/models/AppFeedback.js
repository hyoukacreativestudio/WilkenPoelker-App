const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Free text from the app ("Mehr" -> "Feedback"). Only admins read it, in the PC program.
const AppFeedback = sequelize.define('AppFeedback', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'app_feedback',
});

module.exports = AppFeedback;
