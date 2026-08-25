// ============================================================
// FIREBASE.JS
// Marketplace Kebutuhan
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
// GANTI dengan konfigurasi Web App Firebase Anda.
// Firebase Console
// → Project Settings
// → Your apps
// → Web app
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",
  authDomain: "butuhin.firebaseapp.com",
  projectId: "butuhin",
  storageBucket: "butuhin.firebasestorage.app",
  messagingSenderId: "331896660506",
  appId: "1:331896660506:web:7a03f433101b81dd74e7a3"
};

// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);

// ============================================================
// AUTH
// ============================================================

const auth = getAuth(app);

// ============================================================
// FIRESTORE
// ============================================================

const db = getFirestore(app);

// ============================================================
// EXPORT
// ============================================================

export {
  app,
  auth,
  db
};
