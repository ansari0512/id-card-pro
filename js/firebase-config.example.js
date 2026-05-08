// ── Firebase Configuration ────────────────────────────────
// 1. Copy this file and rename it to firebase-config.js.
// 2. Fill in the values from your Firebase project.
// 3. Never commit firebase-config.js to GitHub. It is listed in .gitignore.

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
