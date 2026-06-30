const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Mirror of Taifun customer data. Fed by the periodic XML sync from Bruno.
// Key field: KdGUID (Taifun's stable unique customer identifier).
// We DO NOT write back to Taifun — this is read-only mirror data.
const TaifunCustomer = sequelize.define('TaifunCustomer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Stable Taifun identifier — primary natural key for upserts
  kdGuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // Human-readable customer number (used as join key against our User.customerNumber)
  kdNr: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  kdRec: {
    type: DataTypes.STRING,
  },
  kdMatch: {
    type: DataTypes.STRING,
  },
  // Anrede + Name as two separate fields the way Taifun ships them
  name1: {
    type: DataTypes.STRING, // e.g. "Herr" / "Frau" / "Firma XY"
  },
  name2: {
    type: DataTypes.STRING, // e.g. "Martin Blache"
  },
  anrede: {
    type: DataTypes.STRING, // e.g. "Sehr geehrte Damen und Herren"
  },
  // Address
  street: {
    type: DataTypes.STRING,
  },
  houseNumber: {
    type: DataTypes.STRING,
  },
  zip: {
    type: DataTypes.STRING,
  },
  city: {
    type: DataTypes.STRING,
  },
  countryIso: {
    type: DataTypes.STRING(2),
  },
  // Contact — Taifun gives both raw + normalized international format
  email: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  phoneNorm: {
    type: DataTypes.STRING, // e.g. 00491772508521
  },
  mobile: {
    type: DataTypes.STRING,
  },
  mobileNorm: {
    type: DataTypes.STRING,
  },
  // Geo (Taifun-side; can stay 0 if not geocoded)
  geoLat: {
    type: DataTypes.DECIMAL(10, 6),
  },
  geoLong: {
    type: DataTypes.DECIMAL(10, 6),
  },
  // Bookkeeping
  lastSyncedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'taifun_customers',
  // kd_guid uniqueness comes from the column definition (`unique: true`);
  // declaring it again here triggers a duplicate ON CONFLICT target on SQLite.
  indexes: [
    { fields: ['kd_nr'] },
  ],
});

module.exports = TaifunCustomer;
