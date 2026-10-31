const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Taifun Warengruppen (WHG) - names for the filters in app and website.
const ShopGroup = sequelize.define('ShopGroup', {
  nr: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Main area for the top filter: motor | fahrrad | elektromobil
  area: {
    type: DataTypes.STRING,
  },
  // Drive implied by the group (akku | benzin | elektro), if any
  drive: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'shop_groups',
});

module.exports = ShopGroup;
