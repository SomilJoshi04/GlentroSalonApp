const admin = require('firebase-admin');
const { 
  FIREBASE_PROJECT_ID, 
  FIREBASE_CLIENT_EMAIL, 
  FIREBASE_PRIVATE_KEY, 
  FIREBASE_DATABASE_URL 
} = require('../config/env');

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  try {
    const certConfig = {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    const options = {
      credential: admin.credential.cert(certConfig),
    };

    if (FIREBASE_DATABASE_URL) {
      options.databaseURL = FIREBASE_DATABASE_URL;
    }

    if (!admin.apps.length) {
      admin.initializeApp(options);
    }
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
  }
} else {
  console.warn('Firebase credentials not found in environment variables. Push notifications will not work.');
}

module.exports = admin;
