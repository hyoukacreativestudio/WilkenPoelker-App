const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'video', 'offer'),
    defaultValue: 'text',
  },
  mediaUrl: {
    type: DataTypes.STRING,
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isReported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  reportReason: {
    type: DataTypes.STRING,
  },
  reportedBy: {
    type: DataTypes.UUID,
  },
}, {
  tableName: 'posts',
  timestamps: true,
  underscored: true,
  paranoid: true,
});

module.exports = Post;
