const config = require('./env');
const { sequelize, taifunDb, connectDatabase } = require('./database');
const { initializeFirebase, getMessaging } = require('./firebase');

module.exports = {
  config,
  sequelize,
  taifunDb,
  connectDatabase,
  initializeFirebase,
  getMessaging,
};
