/**
 * Firebase Service
 * Initializes and provides Firebase services
 */

import { firebaseConfig } from '../config/firebase.config.js';

// Firebase app singleton
let firebaseApp = null;
let authInstance = null;
let dbInstance = null;
let storageInstance = null;

/**
 * Initialize Firebase
 */
function initializeFirebase() {
  if (firebaseApp) return;

  if (!firebaseConfig.apiKey) {
    console.warn('Firebase not configured. Using mock mode.');
    return null;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  firebaseApp = firebase.app();
  authInstance = firebase.auth();
  dbInstance = firebase.firestore();
  storageInstance = firebase.storage();

  return {
    app: firebaseApp,
    auth: authInstance,
    db: dbInstance,
    storage: storageInstance
  };
}

/**
 * Get Firebase services
 */
export function getFirebaseServices() {
  if (!firebaseApp) {
    const services = initializeFirebase();
    if (!services) return null;
  }

  return {
    app: firebaseApp,
    auth: authInstance,
    db: dbInstance,
    storage: storageInstance
  };
}

/**
 * Get user role from Firestore
 */
export async function getUserRole(uid) {
  const services = getFirebaseServices();
  if (!services) return 'school';

  try {
    const doc = await services.db.collection('users').doc(uid).get();
    return doc.exists ? doc.data().role || 'school' : 'school';
  } catch (e) {
    console.error('Error getting user role:', e);
    return 'school';
  }
}

/**
 * Check if Firebase is available
 */
export function isFirebaseAvailable() {
  return !!firebaseApp;
}

// Export firebase namespace for compatibility
export { firebase } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
