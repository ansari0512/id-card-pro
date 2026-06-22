/**
 * Firebase Configuration - Centralized
 * RK Choice ID Card System
 * 
 * Ye file sabhi pages mein Firebase ko initialize karti hai
 * Ek hi file hai, sab jagah same config use karta hai
 */

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyUuz7QVLswGTs9RwdDNy1RSDYUKEyfIw",
  authDomain: "my-id-card-app-b2bbc.firebaseapp.com",
  projectId: "my-id-card-app-b2bbc",
  storageBucket: "my-id-card-app-b2bbc.firebasestorage.app",
  messagingSenderId: "335385118535",
  appId: "1:335385118535:web:14033f686c0216a771ae62"
};

// Firebase Initialize - Sirf ek baar karein
if (!window.firebase) {
  console.error('Firebase SDK not loaded! Please include Firebase scripts first.');
} else if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} else {
  console.log('Firebase already initialized');
}

// Global Firebase instances ko available karein
window.db = firebase.firestore();
window.auth = firebase.auth();
window.storage = firebase.storage();

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
}
