// ============================================================
// BUTUH - PROFILE.JS
// VERSI TERBARU
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
  query,
  where,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
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
// INIT
// ============================================================

const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let myNeeds = [];

let myOffers = [];

let loading = false;


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

    currentUser = user;


    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    updateProfileUI(user);

    await loadProfile();

  }
);


// ============================================================
// PROFILE UI
// ============================================================

function updateProfileUI(user) {

  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";


  const photo =
    user.photoURL ||
    createAvatar(name);


  setText(
    "profileName",
    name
  );

  setText(
    "profileEmail",
    user.email || ""
  );

  setImage(
    "profilePhoto",
    photo
  );

}


// ============================================================
// LOAD PROFILE
// ============================================================

async function loadProfile() {

  if (
    !currentUser ||
    loading
  ) {
    return;
  }


  loading = true;

  showNeedsLoading();
  showOffersLoading();


  try {

    // --------------------------------------------------------
    // LOAD KEBUTUHAN MILIK USER
    // --------------------------------------------------------

    const needsQuery =
      query(
        collection(db, "needs"),
        where(
          "ownerId",
          "==",
          currentUser.uid
        )
      );


    const needsSnapshot =
      await getDocs(
        needsQuery
      );


    myNeeds = [];


    needsSnapshot.forEach(
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


    // --------------------------------------------------------
    // RENDER KEBUTUHAN LANGSUNG
    // --------------------------------------------------------

    renderNeeds();


    // --------------------------------------------------------
    // LOAD RIWAYAT PENAWARAN
    // --------------------------------------------------------

    await loadMyOffers();


    renderOffers();

    updateStatistics();

    calculateRating();


  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );


    showNeedsError(error);

    showOffersError(error);

  } finally {

    loading = false;

  }

}


// ============================================================
// LOAD MY OFFERS
// ============================================================

async function loadMyOffers() {

  myOffers = [];


  try {

    // Ambil semua kebutuhan
    // agar kita bisa memeriksa subcollection offers.

    const allNeedsSnapshot =
      await getDocs(
        collection(
          db,
          "needs"
        )
      );


    const allNeeds = [];


    allNeedsSnapshot.forEach(
      item => {

        allNeeds.push({

          id: item.id,

          ...item.data()

        });

      }
    );


    // Jalankan paralel agar lebih cepat.

    const requests =
      allNeeds.map(
        async need => {

          try {

            const offersRef =
              collection(
                db,
                "needs",
                need.id,
                "offers"
              );


            // Query providerId.
            // Provider hanya mengambil
            // penawarannya sendiri.

            const offerQuery =
              query(
                offersRef,
                where(
                  "providerId",
                  "==",
                  currentUser.uid
                )
              );


            const snapshot =
              await getDocs(
                offerQuery
              );


            const offers = [];


            snapshot.forEach(
              item => {

                offers.push({

                  id: item.id,

                  needId: need.id,

                  needTitle:
                    need.title ||
                    "Kebutuhan",

                  needBudget:
                    need.budget ||
                    0,

                  ...item.data()

                });

              }
            );


            return offers;

          } catch (error) {

            console.warn(
              "Tidak dapat membaca offer:",
              need.id,
              error.message
            );


            return [];

          }

        }
      );


    const results =
      await Promise.all(
        requests
      );


    myOffers =
      results.flat();


    myOffers.sort(
      (a, b) =>
        getTime(b.createdAt) -
        getTime(a.createdAt)
    );


  } catch (error) {

    console.error(
      "LOAD MY OFFERS ERROR:",
      error
    );


    throw error;

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

        <div class="empty-icon">
          📭
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <p>
          Anda belum pernah memposting kebutuhan.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =
    myNeeds
      .map(
        need =>
          createNeedCard(need)
      )
      .join("");

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedCard(need) {

  const status =
    String(
      need.status ||
      "open"
    ).toLowerCase();


  return `

    <article class="history-card">

      <div class="history-main">

        <h3>
          ${escapeHTML(
            need.title ||
            "Tanpa judul"
          )}
        </h3>


        <p>
          ${escapeHTML(
            truncate(
              need.description ||
              "",
              150
            )
          )}
        </p>


        <div class="history-meta">

          <span>
            ${escapeHTML(
              getCategory(
                need.category
              )
            )}
          </span>

          <span>
            💰 Rp ${formatMoney(
              need.budget
            )}
          </span>

          <span>
            📅 ${formatDate(
              need.createdAt
            )}
          </span>

        </div>

      </div>


      <div>

        <span class="status ${getNeedStatusClass(status)}">

          ${getNeedStatusText(status)}

        </span>


        <br>


        <button
          type="button"
          class="btn btn-primary"
          style="margin-top:12px"
          onclick="window.viewNeed('${escapeJS(need.id)}')"
        >
          👁️ Lihat Kebutuhan
        </button>

      </div>

    </article>

  `;

}


// ============================================================
// VIEW NEED
// ============================================================

window.viewNeed =
  function(needId) {

    if (!needId) {
      return;
    }


    window.location.href =
      "index.html?need=" +
      encodeURIComponent(
        needId
      );

  };


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

        <div class="empty-icon">
          💰
        </div>

        <strong>
          Belum ada penawaran
        </strong>

        <p>
          Anda belum pernah mengirim penawaran.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =
    myOffers
      .map(
        offer =>
          createOfferCard(offer)
      )
      .join("");

}


// ============================================================
// OFFER CARD
// ============================================================

function createOfferCard(offer) {

  const status =
    normalizeOfferStatus(
      offer.status
    );


  return `

    <article class="history-card">

      <div class="history-main">

        <h3>
          ${escapeHTML(
            offer.needTitle ||
            "Kebutuhan"
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
              offer.message ||
              "",
              180
            )
          )}
        </p>


        <div class="history-meta">

          <span>
            ⏱️ ${escapeHTML(
              offer.duration ||
              "-"
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

        <span class="status ${getOfferStatusClass(status)}">

          ${getOfferStatusText(status)}

        </span>


        <br>


        <button
          type="button"
          class="btn btn-outline"
          style="margin-top:12px"
          onclick="window.viewNeed('${escapeJS(offer.needId)}')"
        >
          👁️ Lihat Kebutuhan
        </button>

      </div>

    </article>

  `;

}


// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {

  setText(
    "totalNeeds",
    myNeeds.length
  );


  setText(
    "totalOffers",
    myOffers.length
  );


  const accepted =
    myOffers.filter(
      offer =>
        normalizeOfferStatus(
          offer.status
        ) === "accepted"
    ).length;


  const completed =
    myOffers.filter(
      offer =>
        normalizeOfferStatus(
          offer.status
        ) === "completed"
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

function calculateRating() {

  setText(
    "ratingValue",
    "Belum ada rating"
  );


  setText(
    "ratingStars",
    "☆☆☆☆☆"
  );

}


// ============================================================
// STATUS OFFER
// ============================================================

function normalizeOfferStatus(status) {

  const value =
    String(
      status ||
      "pending"
    ).toLowerCase();


  if (
    value === "accepted" ||
    value === "accept" ||
    value === "diterima" ||
    value === "success"
  ) {
    return "accepted";
  }


  if (
    value === "completed" ||
    value === "complete" ||
    value === "selesai"
  ) {
    return "completed";
  }


  if (
    value === "rejected" ||
    value === "ditolak"
  ) {
    return "rejected";
  }


  return "pending";

}


function getOfferStatusClass(status) {

  switch (status) {

    case "accepted":
      return "status-success";

    case "completed":
      return "status-completed";

    case "rejected":
      return "status-danger";

    default:
      return "status-pending";

  }

}


function getOfferStatusText(status) {

  switch (status) {

    case "accepted":
      return "✓ Diterima";

    case "completed":
      return "✓ Selesai";

    case "rejected":
      return "✕ Ditolak";

    default:
      return "⏳ Menunggu";

  }

}


// ============================================================
// STATUS NEED
// ============================================================

function getNeedStatusClass(status) {

  switch (status) {

    case "completed":
    case "selesai":
      return "status-completed";

    case "in_progress":
      return "status-success";

    case "cancelled":
    case "canceled":
      return "status-danger";

    default:
      return "status-pending";

  }

}


function getNeedStatusText(status) {

  switch (status) {

    case "completed":
    case "selesai":
      return "✓ Selesai";

    case "in_progress":
      return "🔨 Dalam Pengerjaan";

    case "cancelled":
    case "canceled":
      return "✕ Dibatalkan";

    default:
      return "🟢 Dibuka";

  }

}


// ============================================================
// LOADING
// ============================================================

function showNeedsLoading() {

  const container =
    $("needsList");

  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="loading-state">

      <div class="spinner"></div>

      Memuat kebutuhan...

    </div>

  `;

}


function showOffersLoading() {

  const container =
    $("offersList");

  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="loading-state">

      <div class="spinner"></div>

      Memuat penawaran...

    </div>

  `;

}


// ============================================================
// ERROR
// ============================================================

function showNeedsError(error) {

  const container =
    $("needsList");

  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

      <strong>
        Gagal memuat riwayat kebutuhan
      </strong>

      <p>
        ${escapeHTML(
          error?.message ||
          "Terjadi kesalahan."
        )}
      </p>

      <button
        class="btn btn-primary"
        onclick="window.reloadProfile()"
      >
        🔄 Coba Lagi
      </button>

    </div>

  `;

}


function showOffersError(error) {

  const container =
    $("offersList");

  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

      <strong>
        Gagal memuat riwayat penawaran
      </strong>

      <p>
        ${escapeHTML(
          error?.message ||
          "Terjadi kesalahan."
        )}
      </p>

      <button
        class="btn btn-primary"
        onclick="window.reloadProfile()"
      >
        🔄 Coba Lagi
      </button>

    </div>

  `;

}


// ============================================================
// RETRY
// ============================================================

window.reloadProfile =
  async function() {

    if (loading) {
      return;
    }


    await loadProfile();

  };


// ============================================================
// TIME
// ============================================================

function getTime(value) {

  if (!value) {
    return 0;
  }


  try {

    if (
      typeof value.toMillis ===
      "function"
    ) {

      return value.toMillis();

    }


    if (
      typeof value.toDate ===
      "function"
    ) {

      return value
        .toDate()
        .getTime();

    }


    if (
      typeof value.seconds ===
      "number"
    ) {

      return value.seconds * 1000;

    }


    const time =
      new Date(value).getTime();


    return Number.isFinite(time)
      ? time
      : 0;

  } catch {

    return 0;

  }

}


// ============================================================
// DATE
// ============================================================

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
  ).format(
    new Date(time)
  );

}


// ============================================================
// MONEY
// ============================================================

function formatMoney(value) {

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "0";
  }


  return new Intl.NumberFormat(
    "id-ID"
  ).format(number);

}


// ============================================================
// CATEGORY
// ============================================================

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


// ============================================================
// TRUNCATE
// ============================================================

function truncate(text, length) {

  const value =
    String(text || "");

  return value.length > length
    ? value.substring(0, length) + "..."
    : value;

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

  return String(value ?? "")

    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ============================================================
// ESCAPE JS
// ============================================================

function escapeJS(value) {

  return String(value ?? "")

    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");

}


// ============================================================
// IMAGE
// ============================================================

function setImage(id, src) {

  const element =
    $(id);

  if (element) {

    element.src =
      src ||
      createAvatar("U");

  }

}


// ============================================================
// TEXT
// ============================================================

function setText(id, value) {

  const element =
    $(id);

  if (element) {

    element.textContent =
      value ?? "";

  }

}


// ============================================================
// AVATAR
// ============================================================

function createAvatar(name) {

  const letter =
    String(
      name ||
      "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();


  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(letter) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


console.log(
  "✅ BUTUH profile.js terbaru aktif"
);
