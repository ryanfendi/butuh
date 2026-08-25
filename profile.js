// ============================================================
// PROFILE.JS
// BUTUH - PROFILE & RIWAYAT
// Firebase v12.1.0
// REALTIME VERSION
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
  collectionGroup,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  onSnapshot
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

let unsubscribeNeeds = null;

let unsubscribeOffers = null;

let loadingNeeds = false;

let loadingOffers = false;


// Cache kebutuhan agar tombol detail cepat
const needCache = new Map();


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

      stopRealtime();

      window.location.href =
        "login.html";

      return;

    }

    updateProfileUI(user);

    await loadNeeds();

    startOffersRealtime();

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
// LOAD MY NEEDS
// ============================================================

async function loadNeeds() {

  if (
    !currentUser ||
    loadingNeeds
  ) {

    return;

  }

  loadingNeeds = true;

  showNeedsLoading();

  try {

    const q =
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
      await getDocs(q);

    myNeeds = [];

    snapshot.forEach(
      item => {

        const need = {

          id:
            item.id,

          ...item.data()

        };

        myNeeds.push(
          need
        );

        needCache.set(
          need.id,
          need
        );

      }
    );


    myNeeds.sort(
      (a, b) =>
        getTime(b.createdAt) -
        getTime(a.createdAt)
    );


    renderNeeds();

    setText(
      "totalNeeds",
      myNeeds.length
    );

  } catch (error) {

    console.error(
      "LOAD NEEDS ERROR:",
      error
    );

    showNeedsError(
      error
    );

  } finally {

    loadingNeeds = false;

  }

}


// ============================================================
// REALTIME OFFERS
// ============================================================

function startOffersRealtime() {

  if (!currentUser) {
    return;
  }


  if (unsubscribeOffers) {

    unsubscribeOffers();

    unsubscribeOffers = null;

  }


  showOffersLoading();


  /*
    PENTING:

    Semua offers berada di:

    needs/{needId}/offers/{offerId}

    collectionGroup("offers")
    mencari SEMUA subcollection bernama offers.

    Jadi penawaran yang dikirim ke kebutuhan
    milik orang lain juga ditemukan.
  */

  const offersQuery =
    query(

      collectionGroup(
        db,
        "offers"
      ),

      where(
        "providerId",
        "==",
        currentUser.uid
      )

    );


  unsubscribeOffers =
    onSnapshot(

      offersQuery,

      async snapshot => {

        try {

          const offers = [];

          snapshot.forEach(
            item => {

              /*
                Parent:
                needs/{needId}

                Document:
                offers/{offerId}
              */

              const needRef =
                item.ref.parent.parent;

              const needId =
                needRef
                  ? needRef.id
                  : "";

              const data =
                item.data();


              offers.push({

                id:
                  item.id,

                needId,

                ...data

              });

            }
          );


          /*
            Ambil informasi kebutuhan
            untuk judul / budget.
          */

          await enrichOffers(
            offers
          );


          /*
            Urutkan terbaru.
          */

          offers.sort(
            (a, b) =>
              getTime(
                b.createdAt
              ) -
              getTime(
                a.createdAt
              )
          );


          myOffers =
            offers;


          /*
            LANGSUNG RENDER
          */

          renderOffers();


          updateStatistics();

          calculateRating();


        } catch (error) {

          console.error(
            "PROCESS OFFERS ERROR:",
            error
          );

          showOffersError(
            error
          );

        }

      },

      error => {

        console.error(
          "OFFERS REALTIME ERROR:",
          error
        );

        showOffersError(
          error
        );

      }

    );

}


// ============================================================
// ENRICH OFFERS
// ============================================================

async function enrichOffers(
  offers
) {

  const requests =
    offers.map(
      async offer => {

        if (!offer.needId) {
          return;
        }


        /*
          Gunakan cache terlebih dahulu.
        */

        if (
          needCache.has(
            offer.needId
          )
        ) {

          const need =
            needCache.get(
              offer.needId
            );

          offer.needTitle =
            need.title ||
            "Kebutuhan";

          offer.needBudget =
            need.budget ||
            0;

          return;

        }


        try {

          const reference =
            doc(
              db,
              "needs",
              offer.needId
            );

          const snapshot =
            await getDoc(
              reference
            );


          if (
            snapshot.exists()
          ) {

            const need = {

              id:
                snapshot.id,

              ...snapshot.data()

            };


            needCache.set(
              need.id,
              need
            );


            offer.needTitle =
              need.title ||
              "Kebutuhan";

            offer.needBudget =
              need.budget ||
              0;

          } else {

            offer.needTitle =
              "Kebutuhan";

            offer.needBudget =
              0;

          }

        } catch (error) {

          console.warn(
            "Gagal mengambil kebutuhan:",
            offer.needId,
            error
          );

          offer.needTitle =
            "Kebutuhan";

          offer.needBudget =
            0;

        }

      }
    );


  await Promise.all(
    requests
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

        <span
          class="status ${getStatusClass(
            status
          )}"
        >

          ${getStatusText(
            status
          )}

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
  function(
    needId
  ) {

    if (!needId) {

      alert(
        "ID kebutuhan tidak ditemukan."
      );

      return;

    }


    /*
      Gunakan parameter yang sama
      dengan script.js.
    */

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
          Anda belum pernah mengirim penawaran.
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

        <span
          class="status ${getStatusClass(
            status
          )}"
        >

          ${getStatusText(
            status
          )}

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
// ERROR NEEDS
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


// ============================================================
// ERROR OFFERS
// ============================================================

function showOffersError(
  error
) {

  const container =
    $("offersList");

  if (!container) {
    return;
  }


  let message =
    error?.message ||
    "Terjadi kesalahan.";


  /*
    Pesan khusus jika Collection Group
    membutuhkan index.
  */

  if (
    String(
      message
    ).toLowerCase()
      .includes("index")
  ) {

    message =
      "Firestore membutuhkan Collection Group Index untuk offers. Buat index yang diminta Firebase Console.";

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
          message
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

    if (!currentUser) {
      return;
    }


    await loadNeeds();

    startOffersRealtime();

  };


// ============================================================
// STOP REALTIME
// ============================================================

function stopRealtime() {

  if (unsubscribeNeeds) {

    unsubscribeNeeds();

    unsubscribeNeeds =
      null;

  }


  if (unsubscribeOffers) {

    unsubscribeOffers();

    unsubscribeOffers =
      null;

  }

}


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

  } catch {

    return 0;

  }

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


// ============================================================
// DEBUG
// ============================================================

window.butuhProfile = {

  getUser() {

    return currentUser;

  },

  getNeeds() {

    return myNeeds;

  },

  getOffers() {

    return myOffers;

  },

  reload() {

    window.reloadProfile();

  }

};


console.log(
  "✅ BUTUH profile.js REALTIME aktif"
);
