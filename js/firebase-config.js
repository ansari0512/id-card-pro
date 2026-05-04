// ── Firebase Configuration ────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCyUuz7QVLswGTs9RwdDNy1RSDYUKEyfIw",
  authDomain:        "my-id-card-app-b2bbc.firebaseapp.com",
  projectId:         "my-id-card-app-b2bbc",
  storageBucket:     "my-id-card-app-b2bbc.firebasestorage.app",
  messagingSenderId: "335385118535",
  appId:             "1:335385118535:web:14033f686c0216a771ae62"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
// DB helpers helpers.js mein hain
