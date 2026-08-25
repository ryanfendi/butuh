// ============================================================
// FIREBASE.JS
// Konfigurasi Firebase Marketplace
// ============================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// FIREBASE CONFIG
// ============================================================
//
// GANTI bagian di bawah dengan konfigurasi Firebase Anda.
//
// Firebase Console
// → Project Settings
// → Your apps
// → Web app
// → SDK setup and configuration
// ============================================================

const firebaseConfig = {

  apiKey: "GANTI_API_KEY",

  authDomain: "GANTI_PROJECT_ID.firebaseapp.com",

  projectId: "GANTI_PROJECT_ID",

  storageBucket: "GANTI_PROJECT_ID.firebasestorage.app",

  messagingSenderId: "GANTI_SENDER_ID",

  appId: "GANTI_APP_ID"

};

// ============================================================
// INITIALIZE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

// ============================================================
// EXPORT
// ============================================================

export {
  app,
  auth,
  db
};
