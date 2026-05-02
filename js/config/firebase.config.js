/**
 * Firebase Configuration
 * Contains Firebase project credentials
 * IMPORTANT: Replace with your actual Firebase project credentials
 */

export const firebaseConfig = {
  // Real Firebase credentials go here
  // Currently using mock mode - no real config needed
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Helper to check if config is valid
export function isFirebaseConfigured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}
