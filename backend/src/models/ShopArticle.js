const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// One Taifun article ("Art") from the stock export in the SFTP folder /Bestand.
// Articles are never deleted in Taifun; several articles (sizes, sets, bar
// lengths) can belong to one ShopProduct page as variants.
const ShopArticle = sequelize.define('ShopArticle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Which Taifun account the article comes from: main | kaercher. Kaercher is a
  // separate account, so its numbers are only unique within that account.
  catalog: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'main',
  },
  // Taifun article GUID (without braces). Missing for some articles - then the
  // article number is the key.
  guid: {
    type: DataTypes.STRING,
  },
  artNr: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Warengruppe (WHG), e.g. 100
  whg: {
    type: DataTypes.INTEGER,
  },
  text1: {
    type: DataTypes.TEXT,
  },
  text2: {
    type: DataTypes.TEXT,
  },
  kurztext: {
    type: DataTypes.TEXT,
  },
  // Prices as delivered: Liste = list price WITHOUT VAT, Ladenpreis = our
  // price WITH VAT (0 = none). See services/shop/prices.js
  listNet: {
    type: DataTypes.DECIMAL(10, 2),
  },
  listGrossRaw: {
    type: DataTypes.DECIMAL(10, 2),
  },
  shopPrice: {
    type: DataTypes.DECIMAL(10, 2),
  },
  // Stock (sum of ArtBestand/Ist) and open reservations (art-res file)
  stock: {
    type: DataTypes.DECIMAL(10, 2),
  },
  reserved: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  datePut: {
    type: DataTypes.DATEONLY,
  },
  productId: {
    type: DataTypes.UUID,
  },
  // Admin moved this article to its own page / another product
  manualGroupKey: {
    type: DataTypes.STRING,
  },
  lastImportedAt: {
    type: DataTypes.DATE,
  },
  lastSourceFile: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'shop_articles',
  indexes: [
    { unique: true, fields: ['catalog', 'art_nr'] },
    { unique: true, fields: ['catalog', 'guid'] },
    { fields: ['product_id'] },
    { fields: ['whg'] },
  ],
});

module.exports = ShopArticle;
