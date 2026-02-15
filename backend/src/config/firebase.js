const admin = require('firebase-admin');
const path = require('path');
const config = require('./env');
const logger = require('../utils/logger');

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    if (config.firebase.serviceAccount) {
      const fs = require('fs');
      // Resolve path relative to backend root (2 levels up from config/)
      const resolvedPath = path.resolve(__dirname, '../../', config.firebase.serviceAccount);
      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firebaseInitialized = true;
        logger.info('Firebase Admin SDK initialized');
      } else {
        logger.warn(`Firebase service account file not found at ${resolvedPath}, push notifications disabled`);
      }
    } else {
      logger.warn('Firebase service account not configured, push notifications disabled');
    }
  } catch (error) {
    logger.warn('Firebase initialization failed:', error.message);
  }
}

function getMessaging() {
  if (!firebaseInitialized) return null;
  return admin.messaging();
}

module.exports = { initializeFirebase, getMessaging, admin };
