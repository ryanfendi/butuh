// ============================================================
// BUTUH - PROFILE.JS
// VERSI BARU DARI NOL
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",
  authDomain: "butuhin.firebaseapp.com",
  projectId: "butuhin",
  storageBucket: "butuhin.firebasestorage.app",
  messagingSenderId: "331896660506",
  appId: "1:331896660506:web:7a03f433101b81dd74e7a3"
};


const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ============================================================
// STATE
// ============================================================

let currentUser = null;
let myNeeds = [];
let myOffers = [];


// ============================================================
// HELPER
// ============================================================

const $ = id =>
  document.getElementById(id);


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    currentUser = user;

    updateProfile(user);

    await loadAllData();

  }
);


// ============================================================
// PROFILE
// ============================================================

function updateProfile(user) {

  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";

  const email =
    user.email ||
    "";

  const photo =
    user.photoURL ||
    createAvatar(name);


  setText(
    "profileName",
    name
  );

  setText(
    "profileEmail",
    email
  );

  setImage(
    "profilePhoto",
    photo
  );

}


// ============================================================
// LOAD ALL
// ============================================================

async function loadAllData() {

  showNeedsLoading();
  showOffersLoading();


  try {

    await loadMyNeeds();

    renderNeeds();

    updateNeedCounter();


    await loadMyOffers();

    renderOffers();

    updateOfferCounters();

    updateRating();


  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    showNeedsError(error);

    showOffersError(error);

  }

}


// ============================================================
// LOAD MY NEEDS
// ============================================================

async function loadMyNeeds() {

  const q =
    query(
      collection(db, "needs"),
      where(
        "ownerId",
        "==",
        currentUser.uid
      )
    );


  const snapshot =
    await getDocs(q);


  myNeeds = [];


  snapshot.forEach(
    item => {

      myNeeds.push({
        id: item.id,
        ...item.data()
      });

    }
  );


  myNeeds.sort(
    (a, b) =>
      getTime(b.createdAt) -
      getTime(a.createdAt)
  );

}


// ============================================================
// LOAD MY OFFERS
// ============================================================

async function loadMyOffers() {

  myOffers = [];


  /*
    Ambil semua kebutuhan.

    Kemudian baca subcollection offers
    satu per satu.

    Ini tidak membutuhkan
    Collection Group Index.
  */

  const needsSnapshot =
    await getDocs(
      collection(db, "needs")
    );


  const tasks = [];


  needsSnapshot.forEach(
    needDoc => {

      const need =
        needDoc.data();


      tasks.push(

        loadOffersFromNeed(
          needDoc.id,
          need
        )

      );

    }
  );


  await Promise.all(tasks);


  myOffers.sort(
    (a, b) =>
      getTime(b.createdAt) -
      getTime(a.createdAt)
  );

}


// ============================================================
// LOAD OFFERS FROM ONE NEED
// ============================================================

async function loadOffersFromNeed(
  needId,
  need
) {

  try {

    const offersRef =
      collection(
        db,
        "needs",
        needId,
        "offers"
      );


    const q =
      query(
        offersRef,
        where(
          "providerId",
          "==",
          currentUser.uid
        )
      );


    const snapshot =
      await getDocs(q);


    snapshot.forEach(
      offerDoc => {

        myOffers.push({

          id:
            offerDoc.id,

          needId,

          needTitle:
            need.title ||
            "Kebutuhan",

          needBudget:
            need.budget ||
            0,

          ...offerDoc.data()

        });

      }
    );


  } catch (error) {

    /*
      Offer dari kebutuhan lain mungkin
      ditolak Rules.

      Tidak menghentikan profile.
    */

    console.warn(
      "Tidak dapat membaca offers:",
      needId,
      error.code
    );

  }

}


// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds() {

  const container =
    $("needsList");


  if (!container) {
    return;
  }


  if (!myNeeds.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <strong>Belum ada kebutuhan</strong>
        <p>Anda belum pernah memposting kebutuhan.</p>
      </div>
    `;

    return;

  }


  container.innerHTML =
    myNeeds.map(
      need => `

        <article class="history-card">

          <div class="history-main">

            <h3>
              ${escapeHTML(
                need.title || "Tanpa judul"
              )}
            </h3>

            <p>
              ${escapeHTML(
                truncate(
                  need.description || "",
                  150
                )
              )}
            </p>

            <div class="history-meta">

              <span>
                ${escapeHTML(
                  getCategory(need.category)
                )}
              </span>

              <span>
                💰 Rp ${formatMoney(need.budget)}
              </span>

              <span>
                📅 ${formatDate(need.createdAt)}
              </span>

            </div>

          </div>


          <button
            class="btn btn-primary"
            type="button"
            onclick="window.viewNeed('${need.id}')"
          >
            👁️ Lihat Kebutuhan
          </button>

        </article>

      `
    ).join("");

}


// ============================================================
// RENDER OFFERS
// ============================================================

function renderOffers() {

  const container =
    $("offersList");


  if (!container) {
    return;
  }


  if (!myOffers.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <strong>Belum ada penawaran</strong>
        <p>Anda belum pernah mengirim penawaran.</p>
      </div>
    `;

    return;

  }


  container.innerHTML =
    myOffers.map(
      offer => {

        const status =
          String(
            offer.status || "pending"
          ).toLowerCase();


        return `

          <article class="history-card">

            <div class="history-main">

              <h3>
                ${escapeHTML(
                  offer.needTitle
                )}
              </h3>

              <div class="offer-price">
                Rp ${formatMoney(
                  offer.price
                )}
              </div>

              <p>
                ${escapeHTML(
                  truncate(
                    offer.message || "",
                    180
                  )
                )}
              </p>

              <div class="history-meta">

                <span>
                  ⏱️ ${escapeHTML(
                    offer.duration || "-"
                  )}
                </span>

                <span>
                  📅 ${formatDate(
                    offer.createdAt
                  )}
                </span>

              </div>

            </div>


            <div>

              <span
                class="status ${getStatusClass(status)}"
              >
                ${getStatusText(status)}
              </span>

              <br>

              <button
                type="button"
                class="btn btn-outline"
                style="margin-top:12px"
                onclick="window.viewNeed('${offer.needId}')"
              >
                👁️ Lihat Kebutuhan
              </button>

            </div>

          </article>

        `;

      }
    ).join("");

}


// ============================================================
// VIEW NEED
// ============================================================

window.viewNeed =
  function(needId) {

    window.location.href =
      "index.html?need=" +
      encodeURIComponent(needId);

  };


// ============================================================
// COUNTERS
// ============================================================

function updateNeedCounter() {

  setText(
    "totalNeeds",
    myNeeds.length
  );

}


function updateOfferCounters() {

  setText(
    "totalOffers",
    myOffers.length
  );


  const accepted =
    myOffers.filter(
      offer =>
        [
          "accepted",
          "diterima",
          "success"
        ].includes(
          String(
            offer.status || ""
          ).toLowerCase()
        )
    ).length;


  const completed =
    myOffers.filter(
      offer =>
        [
          "completed",
          "complete",
          "selesai"
        ].includes(
          String(
            offer.status || ""
          ).toLowerCase()
        )
    ).length;


  setText(
    "acceptedOffers",
    accepted
  );

  setText(
    "completedOffers",
    completed
  );

}


// ============================================================
// RATING
// ============================================================

function updateRating() {

  setText(
    "ratingStars",
    "☆☆☆☆☆"
  );

  setText(
    "ratingValue",
    "Belum ada rating"
  );

}


// ============================================================
// LOADING
// ============================================================

function showNeedsLoading() {

  const el =
    $("needsList");

  if (el) {

    el.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        Memuat kebutuhan...
      </div>
    `;

  }

}


function showOffersLoading() {

  const el =
    $("offersList");

  if (el) {

    el.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        Memuat penawaran...
      </div>
    `;

  }

}


// ============================================================
// ERROR
// ============================================================

function showNeedsError(error) {

  const el =
    $("needsList");

  if (el) {

    el.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <strong>Gagal memuat kebutuhan</strong>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;

  }

}


function showOffersError(error) {

  const el =
    $("offersList");

  if (el) {

    el.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <strong>Gagal memuat penawaran</strong>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;

  }

}


// ============================================================
// STATUS
// ============================================================

function getStatusClass(status) {

  if (
    [
      "accepted",
      "diterima",
      "success"
    ].includes(status)
  ) {
    return "status-success";
  }


  if (
    [
      "completed",
      "complete",
      "selesai"
    ].includes(status)
  ) {
    return "status-completed";
  }


  if (
    [
      "rejected",
      "ditolak",
      "cancelled"
    ].includes(status)
  ) {
    return "status-danger";
  }


  return "status-pending";

}


function getStatusText(status) {

  if (
    [
      "accepted",
      "diterima",
      "success"
    ].includes(status)
  ) {
    return "✓ Diterima";
  }


  if (
    [
      "completed",
      "complete",
      "selesai"
    ].includes(status)
  ) {
    return "✓ Selesai";
  }


  if (
    [
      "rejected",
      "ditolak",
      "cancelled"
    ].includes(status)
  ) {
    return "✕ Ditolak";
  }


  return "⏳ Menunggu";

}


// ============================================================
// UTILITIES
// ============================================================

function getTime(value) {

  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;

}


function formatDate(value) {

  const time =
    getTime(value);

  if (!time) {
    return "Baru saja";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(new Date(time));

}


function formatMoney(value) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat(
        "id-ID"
      ).format(number)
    : "0";

}


function getCategory(value) {

  const categories = {
    design: "🎨 Desain",
    website: "🌐 Website",
    programming: "💻 Programming",
    marketing: "📢 Marketing",
    writing: "✍️ Penulisan",
    video: "🎬 Video",
    translation: "🌍 Terjemahan",
    other: "📦 Lainnya"
  };

  return (
    categories[value] ||
    categories.other
  );

}


function truncate(text, length) {

  const value =
    String(text || "");

  return value.length > length
    ? value.substring(0, length) + "..."
    : value;

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function setText(id, value) {

  const el = $(id);

  if (el) {
    el.textContent = value ?? "";
  }

}


function setImage(id, src) {

  const el = $(id);

  if (el && src) {
    el.src = src;
  }

}


function createAvatar(name) {

  const letter =
    String(name || "U")
      .trim()
      .charAt(0)
      .toUpperCase();

  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(letter) +
    "&background=2563eb" +
    "&color=ffffff&size=256"
  );

}


console.log(
  "✅ BUTUH profile.js baru aktif"
);
