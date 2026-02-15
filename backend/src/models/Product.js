const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.ENUM('bike', 'cleaning', 'motor'),
    allowNull: false,
  },
  subcategory: {
    type: DataTypes.STRING,
  },
  brand: {
    type: DataTypes.STRING,
  },
  model: {
    type: DataTypes.STRING,
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  salePrice: {
    type: DataTypes.DECIMAL(10, 2),
  },
  saleEndsAt: {
    type: DataTypes.DATE,
  },
  discountPercentage: {
    type: DataTypes.INTEGER,
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
  },
  specifications: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  features: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isNew: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  leasingAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  leasingMonthlyRate: {
    type: DataTypes.DECIMAL(10, 2),
  },
  color: {
    type: DataTypes.STRING,
  },
  weight: {
    type: DataTypes.STRING,
  },
  dimensions: {
    type: DataTypes.STRING,
  },
  warranty: {
    type: DataTypes.STRING,
  },
  shareCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  taifunProductId: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
  paranoid: true,
});

module.exports = Product;
