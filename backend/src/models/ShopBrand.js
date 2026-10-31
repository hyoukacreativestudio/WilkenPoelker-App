const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Manufacturers for the product pages. A product gets the brand whose keyword
// appears in its Taifun name (Text1); the article-number prefix (e.g. STI-) is
// only a fallback. Editable in the PC tool.
const ShopBrand = sequelize.define('ShopBrand', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // ["stihl"] - matched as whole words, case-insensitive
  keywords: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  // ["STI", "JSTI"]
  prefixes: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  // Lower = checked first (STIHL before "AS", which is also a STIHL battery system)
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },
}, {
  tableName: 'shop_brands',
});

module.exports = ShopBrand;
