// Read all Firebase configuration strictly from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app = null;
let messaging = null;

/**
 * Runtime dynamic import helper that completely bypasses Vite's static AST import-analysis.
 * Prevents Vite from failing during dev server startup when the package is installing or missing.
 */
const runtimeImport = (moduleSpecifier) => {
  try {
    return new Function('m', 'return import(m)')(moduleSpecifier);
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * Dynamically load Firebase App with graceful fallback if package is installing/unavailable
 */
const loadFirebaseApp = async () => {
  if (app) return app;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;

  try {
    const { initializeApp, getApps, getApp } = await runtimeImport('firebase/app');
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return app;
  } catch (err) {
    console.warn('Firebase App SDK not installed or unavailable:', err.message);
    return null;
  }
};

/**
 * Dynamically load Firebase Messaging with graceful fallback
 */
const loadFirebaseMessaging = async () => {
  if (messaging) return messaging;
  const firebaseApp = await loadFirebaseApp();
  if (!firebaseApp) return null;

  try {
    const { getMessaging, isSupported } = await runtimeImport('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Cloud Messaging is not supported in this browser environment.');
      return null;
    }
    messaging = getMessaging(firebaseApp);
    return messaging;
  } catch (err) {
    console.warn('Firebase Messaging SDK not installed or unavailable:', err.message);
    return null;
  }
};

/**
 * Request notification permission and retrieve the FCM device token
 * @returns {Promise<string|null>} FCM registration token or null
 */
export const requestNotificationPermission = async () => {
  try {
    const msg = await loadFirebaseMessaging();
    if (!msg) {
      return null;
    }

    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied by user.');
      return null;
    }

    let swRegistration = undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (swErr) {
        console.warn('FCM Service worker registration note:', swErr.message);
      }
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const tokenOptions = {
      ...(vapidKey ? { vapidKey } : {}),
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {})
    };

    const { getToken } = await runtimeImport('firebase/messaging');
    const currentToken = await getToken(msg, tokenOptions);
    if (currentToken) {
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (error) {
    console.error('Error retrieving FCM registration token:', error);
    return null;
  }
};

/**
 * Listen for incoming messages when the web app is in the foreground
 * @param {Function} callback - Handles incoming payload
 * @returns {Function} Unsubscribe function
 */
export const onForegroundMessage = (callback) => {
  let unsubscribeFn = null;

  loadFirebaseMessaging().then(async (msg) => {
    if (!msg) return;
    try {
      const { onMessage } = await runtimeImport('firebase/messaging');
      unsubscribeFn = onMessage(msg, (payload) => {
        callback(payload);
      });
    } catch (err) {
      console.warn('Unable to attach foreground message listener:', err.message);
    }
  });

  return () => {
    if (typeof unsubscribeFn === 'function') {
      unsubscribeFn();
    }
  };
};

export { app };
