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

  apiKey: "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",

  authDomain: "butuhin.firebaseapp.com",

  projectId: "butuhin",

  storageBucket: "butuhin.firebasestorage.app",

  messagingSenderId: "331896660506",

  appId: "1:331896660506:web:7a03f433101b81dd74e7a3"

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
