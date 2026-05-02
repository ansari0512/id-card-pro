// Firebase Configuration - Provided by user
const firebaseConfig = {
  apiKey: "AIzaSyCyUuz7QVLswGTs9RwdDNy1RSDYUKEyfIw",
  authDomain: "my-id-card-app-b2bbc.firebaseapp.com",
  projectId: "my-id-card-app-b2bbc",
  storageBucket: "my-id-card-app-b2bbc.firebasestorage.app",
  messagingSenderId: "335385118535",
  appId: "1:335385118535:web:14033f686c0216a771ae62"
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