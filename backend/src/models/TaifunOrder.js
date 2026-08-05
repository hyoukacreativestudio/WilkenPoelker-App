const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Mirror of a Taifun work order (Auftragshinweis / "Ah"). Read-only on our side.
// Key field: nr (Taifun's order number, unique).
const TaifunOrder = sequelize.define('TaifunOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Stable order number from Taifun — used as natural key for upserts
  nr: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // Scheduled date + time (Taifun ships them as separate fields)
  date: {
    type: DataTypes.DATEONLY,
  },
  time: {
    type: DataTypes.TIME,
  },
  // Short label, e.g. "abholen FA", "V 506" — currently a free-text shortcode
  info: {
    type: DataTypes.STRING,
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Status flags as Taifun ships them. We expose "status" (derived) on the API layer.
  erledigt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  storno: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  offen: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  dspDel: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  mobile: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  technicianState: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Taifun status GUID (AhStandGUID). Resolved to an app status at import time
  // via services/taifunStatusMap.js (source: Bruno's AU-Stand3.xml).
  ahStandGuid: {
    type: DataTypes.STRING,
  },
  // --- Derived app status (computed from ahStandGuid on every import) ---
  // Stable code the frontend switches on, e.g. 'REP_IN_ARBEIT'. Null when the
  // order has no Taifun status yet or the status is hidden (5xx etc.).
  appStatus: {
    type: DataTypes.STRING,
  },
  // Human-readable German label, e.g. 'Reparatur in Arbeit'.
  appStatusLabel: {
    type: DataTypes.STRING,
  },
  // Grouping for the app views: 'reparatur' | 'leasing' | 'neu' | null.
  appCategory: {
    type: DataTypes.STRING,
  },
  // True = do not show in the app (hidden/unknown Taifun stand).
  appHidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Link to the customer (by Taifun's GUID, not our internal UUID,
  // so the order survives even if we re-import the customer)
  kdGuid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  kdNr: {
    type: DataTypes.STRING,
  },
  // Bookkeeping
  lastSyncedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  // True when the order was in our DB but disappeared from a later import —
  // we keep history instead of deleting outright.
  vanishedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'taifun_orders',
  // `nr` uniqueness lives on the column; secondary indexes only here.
  indexes: [
    { fields: ['kd_guid'] },
    { fields: ['kd_nr'] },
    { fields: ['date'] },
    { fields: ['offen'] },
    { fields: ['app_category'] },
    { fields: ['app_hidden'] },
  ],
});

module.exports = TaifunOrder;
