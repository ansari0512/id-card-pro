// Firebase Configuration - Replace with your own project credentials
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
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