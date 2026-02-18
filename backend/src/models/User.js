const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerNumber: {
    type: DataTypes.STRING,
    unique: true,
  },
  role: {
    type: DataTypes.ENUM(
      'super_admin',
      'admin',
      'bike_manager',
      'cleaning_manager',
      'motor_manager',
      'service_manager',
      'robby_manager',
      'customer'
    ),
    defaultValue: 'customer',
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  firstName: {
    type: DataTypes.STRING,
  },
  lastName: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  address: {
    type: DataTypes.JSON,
    defaultValue: {
      street: null,
      zip: null,
      city: null,
      country: 'Deutschland',
    },
  },
  profilePicture: {
    type: DataTypes.STRING,
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
  },
  passwordResetToken: {
    type: DataTypes.STRING,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
  },
  refreshToken: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      darkMode: false,
      textSize: 'medium',
      language: 'de',
      accentColor: '#2E7D32',
      notifications: {
        push: true,
        repairs: true,
        appointments: true,
        chat: true,
        feed: false,
        offers: true,
        system: true,
      },
    },
  },
  dsgvoAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  dsgvoAcceptedAt: {
    type: DataTypes.DATE,
  },
  agbAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  agbAcceptedAt: {
    type: DataTypes.DATE,
  },
  pinCode: {
    type: DataTypes.STRING,
  },
  biometricEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: true,
});

module.exports = User;
