// ============================================================
// PROFILE.JS
// BUTUH - Profile & History
// Firebase v12.1.0
// VERSI TERBARU - FIX OFFER PERMISSION
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
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",

  authDomain:
    "butuhin.firebaseapp.com",

  projectId:
    "butuhin",

  storageBucket:
    "butuhin.firebasestorage.app",

  messagingSenderId:
    "331896660506",

  appId:
    "1:331896660506:web:7a03f433101b81dd74e7a3"

};


// ============================================================
// FIREBASE INIT
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

    // ========================================================
    // LOAD NEEDS MILIK USER
    // ========================================================

    const needsRef =
      collection(
        db,
        "needs"
      );

    const needsQuery =
      query(
        needsRef,
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

          id:
            item.id,

          ...item.data()

        });

      }
    );


    // ========================================================
    // SORT NEEDS
    // ========================================================

    myNeeds.sort(
      (a, b) => {

        return (
          getTime(b.createdAt) -
          getTime(a.createdAt)
        );

      }
    );


    // ========================================================
    // TAMPILKAN NEEDS SECEPATNYA
    // ========================================================

    renderNeeds();

    setText(
      "totalNeeds",
      myNeeds.length
    );


    // ========================================================
    // LOAD OFFERS
    // ========================================================

    await loadOffers();


    // ========================================================
    // RENDER OFFERS
    // ========================================================

    renderOffers();


    // ========================================================
    // UPDATE STATISTICS
    // ========================================================

    updateStatistics();


    // ========================================================
    // RATING
    // ========================================================

    calculateRating();

  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    showNeedsError(
      error
    );

    showOffersError(
      error
    );

  } finally {

    loading = false;

  }

}


// ============================================================
// LOAD OFFERS - FIXED
// ============================================================

async function loadOffers() {

  myOffers = [];


  if (
    !myNeeds.length
  ) {

    renderOffers();

    return;

  }


  /*
    PENTING:

    Jangan lagi:

      getDocs(offersRef)

    karena itu mengambil SEMUA offer.

    Kita langsung query:

      providerId == currentUser.uid

    sehingga Firestore hanya diminta
    mengirim offer milik user ini.

    Ini cocok dengan Firestore Rules.
  */


  const requests =
    myNeeds.map(
      async need => {

        try {

          const offersRef =
            collection(
              db,
              "needs",
              need.id,
              "offers"
            );


          const offersQuery =
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
              offersQuery
            );


          const results = [];


          snapshot.forEach(
            item => {

              const offer =
                item.data();


              results.push({

                id:
                  item.id,

                needId:
                  need.id,

                needTitle:
                  need.title ||
                  "Kebutuhan",

                needBudget:
                  need.budget ||
                  0,

                ...offer

              });

            }
          );


          return results;

        } catch (error) {

          console.error(
            "Offer gagal:",
            need.id,
            error
          );


          /*
            Jangan membuat seluruh profile
            gagal hanya karena satu kebutuhan.
          */

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


  // ========================================================
  // SORT TERBARU
  // ========================================================

  myOffers.sort(
    (a, b) => {

      return (
        getTime(b.createdAt) -
        getTime(a.createdAt)
      );

    }
  );

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


  if (
    myNeeds.length === 0
  ) {

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
        createNeedCard
      )
      .join("");

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedCard(
  need
) {

  const title =
    escapeHTML(
      need.title ||
      "Tanpa judul"
    );

  const description =
    escapeHTML(
      truncate(
        need.description ||
        "",
        150
      )
    );

  const category =
    escapeHTML(
      getCategory(
        need.category
      )
    );

  const budget =
    formatMoney(
      need.budget
    );

  const status =
    String(
      need.status ||
      "open"
    ).toLowerCase();


  return `

    <article class="history-card">

      <div class="history-main">

        <h3>
          ${title}
        </h3>

        <p>
          ${description}
        </p>

        <div class="history-meta">

          <span>
            ${category}
          </span>

          <span>
            💰 Rp ${budget}
          </span>

          <span>
            📅 ${formatDate(
              need.createdAt
            )}
          </span>

        </div>

      </div>


      <div>

        <span class="status ${getStatusClass(status)}">

          ${getStatusText(status)}

        </span>


        <br>


        <button
          type="button"
          class="btn btn-primary"
          style="margin-top:12px"
          onclick="window.viewNeed('${escapeJS(
            need.id
          )}')"
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

      alert(
        "ID kebutuhan tidak ditemukan."
      );

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


  if (
    myOffers.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          💰
        </div>

        <strong>
          Belum ada penawaran
        </strong>

        <p>
          Anda belum mengirim penawaran.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =
    myOffers
      .map(
        createOfferCard
      )
      .join("");

}


// ============================================================
// OFFER CARD
// ============================================================

function createOfferCard(
  offer
) {

  const title =
    escapeHTML(
      offer.needTitle ||
      "Kebutuhan"
    );

  const message =
    escapeHTML(
      truncate(
        offer.message ||
        "",
        180
      )
    );

  const price =
    formatMoney(
      offer.price
    );

  const duration =
    escapeHTML(
      offer.duration ||
      "-"
    );

  const status =
    String(
      offer.status ||
      "pending"
    ).toLowerCase();


  return `

    <article class="history-card">

      <div class="history-main">

        <h3>
          ${title}
        </h3>

        <div class="offer-price">
          Rp ${price}
        </div>

        <p>
          ${message}
        </p>

        <div class="history-meta">

          <span>
            ⏱️ ${duration}
          </span>

          <span>
            📅 ${formatDate(
              offer.createdAt
            )}
          </span>

        </div>

      </div>


      <div>

        <span class="status ${getStatusClass(status)}">

          ${getStatusText(status)}

        </span>


        <br>


        <button
          type="button"
          class="btn btn-outline"
          style="margin-top:12px"
          onclick="window.viewNeed('${escapeJS(
            offer.needId
          )}')"
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
      offer => {

        const status =
          String(
            offer.status ||
            ""
          ).toLowerCase();

        return (
          status === "accepted" ||
          status === "accept" ||
          status === "diterima" ||
          status === "success"
        );

      }
    ).length;


  const completed =
    myOffers.filter(
      offer => {

        const status =
          String(
            offer.status ||
            ""
          ).toLowerCase();

        return (
          status === "completed" ||
          status === "complete" ||
          status === "selesai"
        );

      }
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

function showNeedsError(
  error
) {

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


function showOffersError(
  error
) {

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
// STATUS CLASS
// ============================================================

function getStatusClass(
  status
) {

  switch (
    String(
      status ||
      ""
    ).toLowerCase()
  ) {

    case "accepted":
    case "accept":
    case "diterima":
    case "success":

      return "status-success";


    case "completed":
    case "complete":
    case "selesai":

      return "status-completed";


    case "rejected":
    case "cancelled":
    case "canceled":
    case "ditolak":

      return "status-danger";


    default:

      return "status-pending";

  }

}


// ============================================================
// STATUS TEXT
// ============================================================

function getStatusText(
  status
) {

  switch (
    String(
      status ||
      ""
    ).toLowerCase()
  ) {

    case "accepted":
    case "accept":
    case "diterima":
    case "success":

      return "✓ Diterima";


    case "completed":
    case "complete":
    case "selesai":

      return "✓ Selesai";


    case "rejected":
    case "cancelled":
    case "canceled":
    case "ditolak":

      return "✕ Ditolak";


    default:

      return "⏳ Menunggu";

  }

}


// ============================================================
// CATEGORY
// ============================================================

function getCategory(
  value
) {

  const categories = {

    design:
      "🎨 Desain",

    website:
      "🌐 Website",

    programming:
      "💻 Programming",

    marketing:
      "📢 Marketing",

    writing:
      "✍️ Penulisan",

    video:
      "🎬 Video",

    translation:
      "🌍 Terjemahan",

    other:
      "📦 Lainnya"

  };


  return (
    categories[value] ||
    categories.other
  );

}


// ============================================================
// TIME
// ============================================================

function getTime(
  value
) {

  if (!value) {
    return 0;
  }


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

    return (
      value.seconds *
      1000
    );

  }


  const time =
    new Date(
      value
    ).getTime();


  return Number.isFinite(
    time
  )
    ? time
    : 0;

}


// ============================================================
// DATE
// ============================================================

function formatDate(
  value
) {

  const time =
    getTime(
      value
    );


  if (!time) {

    return "Baru saja";

  }


  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric"
    }
  ).format(
    new Date(
      time
    )
  );

}


// ============================================================
// MONEY
// ============================================================

function formatMoney(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return "0";

  }


  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    number
  );

}


// ============================================================
// TRUNCATE
// ============================================================

function truncate(
  text,
  length
) {

  const value =
    String(
      text ||
      ""
    );


  if (
    value.length <=
    length
  ) {

    return value;

  }


  return (
    value.substring(
      0,
      length
    ) +
    "..."
  );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
  value
) {

  return String(
    value ??
    ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


// ============================================================
// ESCAPE JS
// ============================================================

function escapeJS(
  value
) {

  return String(
    value ??
    ""
  )

    .replace(
      /\\/g,
      "\\\\"
    )

    .replace(
      /'/g,
      "\\'"
    )

    .replace(
      /"/g,
      '\\"'
    )

    .replace(
      /\n/g,
      "\\n"
    )

    .replace(
      /\r/g,
      "\\r"
    );

}


// ============================================================
// IMAGE
// ============================================================

function setImage(
  id,
  src
) {

  const element =
    $(id);

  if (!element) {
    return;
  }


  element.src =
    src ||
    createAvatar(
      "U"
    );

}


// ============================================================
// TEXT
// ============================================================

function setText(
  id,
  value
) {

  const element =
    $(id);

  if (!element) {
    return;
  }


  element.textContent =
    value ??
    "";

}


// ============================================================
// AVATAR
// ============================================================

function createAvatar(
  name
) {

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
    encodeURIComponent(
      letter
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


console.log(
  "✅ BUTUH profile.js VERSI TERBARU aktif"
);
