const admin = require('firebase-admin');
const path = require('path');
const config = require('./env');
const logger = require('../utils/logger');

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const serviceAccountValue = config.firebase.serviceAccount;

    if (!serviceAccountValue) {
      logger.warn('Firebase service account not configured, push notifications disabled');
      return;
    }

    let serviceAccount;

    // Support JSON string directly (for cloud deployments like Render)
    if (serviceAccountValue.trim().startsWith('{')) {
      serviceAccount = JSON.parse(serviceAccountValue);
      logger.info('Firebase: Using service account from JSON env variable');
    } else {
      // Treat as file path (for local development)
      const fs = require('fs');
      const resolvedPath = path.resolve(__dirname, '../../', serviceAccountValue);
      if (fs.existsSync(resolvedPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        logger.info('Firebase: Using service account from file');
      } else {
        logger.warn(`Firebase service account file not found at ${resolvedPath}, push notifications disabled`);
        return;
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized');
  } catch (error) {
    logger.warn('Firebase initialization failed:', error.message);
  }
}

function getMessaging() {
  if (!firebaseInitialized) return null;
  return admin.messaging();
}

module.exports = { initializeFirebase, getMessaging, admin };
