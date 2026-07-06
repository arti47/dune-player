// firebase-config.js — cloud sync configuration.
//
// LOCAL MODE (default): leave FIREBASE_ENABLED = false. The app runs fully
// offline with localStorage — no keys, no account, no network.
//
// CLOUD MODE: create a Firebase project (Realtime Database + Storage +
// Anonymous auth), paste your web app config below, set FIREBASE_ENABLED = true,
// and deploy database.rules.json. NEVER commit real keys to a public repo.

export const FIREBASE_ENABLED = false;

export const firebaseConfig = {
  apiKey:            'PASTE_API_KEY',
  authDomain:        'PASTE_PROJECT.firebaseapp.com',
  databaseURL:       'https://PASTE_PROJECT-default-rtdb.firebaseio.com',
  projectId:         'PASTE_PROJECT',
  storageBucket:     'PASTE_PROJECT.appspot.com',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId:             'PASTE_APP_ID',
};
