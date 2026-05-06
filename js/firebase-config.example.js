// ── Firebase Configuration ────────────────────────────────
// 1. Is file ko copy karke firebase-config.js naam do
// 2. Apne Firebase project ki values yahan fill karo
// 3. firebase-config.js kabhi GitHub pe push mat karo (.gitignore mein hai)

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
