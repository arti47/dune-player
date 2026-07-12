// firebase-config.js — cloud sync configuration.
//
// LOCAL MODE (default): leave FIREBASE_ENABLED = false. The app runs fully
// offline with localStorage — no keys, no account, no network.
//
// CLOUD MODE: create a Firebase project (Realtime Database + Storage +
// Anonymous auth), paste your web app config below, set FIREBASE_ENABLED = true,
// and deploy database.rules.json. NEVER commit real keys to a public repo.

export const FIREBASE_ENABLED = true;

export const firebaseConfig = {
  apiKey: "AIzaSyBciI9cH19KrD4ntKgbZsvembbwAubM2Ko",
  authDomain: "imperium-player.firebaseapp.com",
  projectId: "imperium-player",
  storageBucket: "imperium-player.firebasestorage.app",
  messagingSenderId: "560274847711",
  appId: "1:560274847711:web:5450d7bb47f2cce8c6366a"
};
