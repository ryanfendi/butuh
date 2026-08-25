// ============================================================
// PROFILE.JS
// BUTUH - Profile & Riwayat
// Firebase v12.1.0
// VERSI STABIL + CEPAT
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
// FIREBASE
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

function $(id) {
  return document.getElementById(id);
}


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

  if (!currentUser || loading) {
    return;
  }

  loading = true;

  showNeedsLoading();

  showOffersLoading();


  try {

    // ========================================================
    // AMBIL KEBUTUHAN MILIK USER
    // ========================================================

    const needsQuery =
      query(
        collection(
          db,
          "needs"
        ),
        where(
          "ownerId",
          "==",
          currentUser.uid
        )
      );


    const snapshot =
      await getDocs(
        needsQuery
      );


    myNeeds = [];


    snapshot.forEach(
      item => {

        myNeeds.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );


    // terbaru di atas
    myNeeds.sort(
      (a, b) =>
        getTime(b.createdAt) -
        getTime(a.createdAt)
    );


    // ========================================================
    // TAMPILKAN KEBUTUHAN SECEPATNYA
    // ========================================================

    renderNeeds();


    setText(
      "totalNeeds",
      myNeeds.length
    );


    // ========================================================
    // AMBIL PENAWARAN
    // ========================================================

    await loadMyOffers();


    // ========================================================
    // RENDER
    // ========================================================

    renderOffers();

    updateStatistics();

    calculateRating();


  } catch (error) {

    console.error(
      "PROFILE LOAD ERROR:",
      error
    );


    showNeedsError(error);

    showOffersError(error);

  } finally {

    loading = false;

  }

}


// ============================================================
// LOAD OFFERS
// ============================================================

async function loadMyOffers() {

  myOffers = [];


  if (!myNeeds.length) {

    renderOffers();

    return;

  }


  /*
    Penting:

    Kita TIDAK menggunakan collectionGroup.

    Kita membaca:

    needs/{needId}/offers

    satu per satu.

    Query hanya providerId milik user.
  */


  const jobs =
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


          const offerQuery =
            query(
              offersRef,
              where(
                "providerId",
                "==",
                currentUser.uid
              )
            );


          const offerSnapshot =
            await getDocs(
              offerQuery
            );


          offerSnapshot.forEach(
            item => {

              const data =
                item.data();


              myOffers.push({

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

                ...data

              });

            }
          );


        } catch (error) {

          /*
            Jangan menghentikan seluruh proses
            hanya karena satu kebutuhan gagal.
          */

          console.warn(
            "Gagal membaca offers:",
            need.id,
            error
          );

        }

      }
    );


  await Promise.all(
    jobs
  );


  // terbaru di atas

  myOffers.sort(
    (a, b) =>
      getTime(b.createdAt) -
      getTime(a.createdAt)
  );


  console.log(
    "MY OFFERS:",
    myOffers
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
      .map(createNeedCard)
      .join("");

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedCard(
  need
) {

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
              160
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

        <span
          class="status ${getStatusClass(status)}"
        >
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
      .map(createOfferCard)
      .join("");

}


// ============================================================
// OFFER CARD
// ============================================================

function createOfferCard(
  offer
) {

  const status =
    String(
      offer.status ||
      "pending"
    ).toLowerCase();


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
// STATUS
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
// DATE
// ============================================================

function getTime(
  value
) {

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
      new Date(
        value
      ).getTime();


    return Number.isFinite(time)
      ? time
      : 0;

  } catch {

    return 0;

  }

}


function formatDate(
  value
) {

  const time =
    getTime(value);


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
    new Date(time)
  );

}


// ============================================================
// MONEY
// ============================================================

function formatMoney(
  value
) {

  const number =
    Number(value);


  if (!Number.isFinite(number)) {
    return "0";
  }


  return new Intl.NumberFormat(
    "id-ID"
  ).format(number);

}


// ============================================================
// TEXT
// ============================================================

function truncate(
  text,
  length
) {

  const value =
    String(
      text || ""
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
// SECURITY
// ============================================================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
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


function escapeJS(
  value
) {

  return String(
    value ?? ""
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


  if (
    element &&
    src
  ) {

    element.src =
      src;

  }

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


  if (element) {

    element.textContent =
      value ?? "";

  }

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
    encodeURIComponent(letter) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


console.log(
  "✅ BUTUH profile.js terbaru aktif"
);
