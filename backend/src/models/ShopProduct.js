const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// One product page in the app and on the website. Built from one or more
// ShopArticles (variants) that share manufacturer + model. Computed fields are
// refreshed by services/shop/shopCatalog.js after every import / admin change.
const ShopProduct = sequelize.define('ShopProduct', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // brand|model key the variants are grouped by (or art|<ArtNr> without model)
  groupKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING,
  },
  brand: {
    type: DataTypes.STRING,
  },
  model: {
    type: DataTypes.STRING,
  },
  category: {
    type: DataTypes.STRING,
  },
  categoryKey: {
    type: DataTypes.STRING,
  },
  whg: {
    type: DataTypes.INTEGER,
  },
  drive: {
    type: DataTypes.STRING, // akku | benzin | elektro | diesel
  },
  batterySystem: {
    type: DataTypes.STRING, // AK | AP | AS | AI | ALLPRO ...
  },
  // auto = shown (an automatic hiding rule is not decided yet), show / hide = admin
  visibility: {
    type: DataTypes.STRING,
    defaultValue: 'auto',
  },
  // Computed from the variants
  price: {
    type: DataTypes.DECIMAL(10, 2),
  },
  uvp: {
    type: DataTypes.DECIMAL(10, 2),
  },
  hasOffer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  available: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  variantCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  searchText: {
    type: DataTypes.TEXT,
  },
  // Official manufacturer data (automatic, see services/shop/enrich)
  // images: [{ url, thumb, source }]
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  // officialSpecs: [[label, value], ...]
  officialSpecs: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  officialUrl: {
    type: DataTypes.STRING,
  },
  officialName: {
    type: DataTypes.STRING,
  },
  // null = not tried yet, found | found_model | not_found | error | manual,
  // review = monthly check: the manufacturer no longer has it, pictures removed
  enrichStatus: {
    type: DataTypes.STRING,
  },
  enrichedAt: {
    type: DataTypes.DATE,
  },
  firstSeenAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'shop_products',
  indexes: [
    { fields: ['brand'] },
    { fields: ['whg'] },
  ],
});

module.exports = ShopProduct;
