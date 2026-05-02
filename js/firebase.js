// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2kYXi_VerDxZv1wKsLwEf7lf4BHRH0IM",
  authDomain: "rk-choice-id.firebaseapp.com",
  projectId: "rk-choice-id",
  storageBucket: "rk-choice-id.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (singleton)
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

// Get user role from Firestore
export async function getUserRole(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) return doc.data().role || 'school';
    return 'school';
  } catch (e) {
    return 'school';
  }
}

// Re-export for compatibility
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;