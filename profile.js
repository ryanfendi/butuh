// ============================================================
// BUTUH - PROFILE.JS
// VERSI TRANSAKSI
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
  doc,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ============================================================
// CONFIG
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

let currentUser =
  null;

let myNeeds =
  [];

let myOffers =
  [];

let myProjects =
  [];

let loading =
  false;


// ============================================================
// HELPER
// ============================================================

const $ =
  id =>
    document.getElementById(id);


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    currentUser =
      user;


    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    updateProfileUI(
      user
    );


    await loadProfile();

  }
);


// ============================================================
// PROFILE UI
// ============================================================

function updateProfileUI(
  user
) {

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
    user.email ||
    ""
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


  loading =
    true;


  showNeedsLoading();

  showOffersLoading();

  showProjectsLoading();


  try {

    await loadMyNeeds();

    renderNeeds();


    await loadMyOffers();

    renderOffers();


    await loadMyProjects();

    renderProjects();


    updateStatistics();

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


    showProjectsError(
      error
    );


  } finally {

    loading =
      false;

  }

}


// ============================================================
// LOAD NEEDS
// ============================================================

async function loadMyNeeds() {

  myNeeds =
    [];


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


  snapshot.forEach(
    item => {

      myNeeds.push({

        id:
          item.id,

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
// LOAD OFFERS
// ============================================================

async function loadMyOffers() {

  myOffers =
    [];


  // Ambil semua kebutuhan.
  const needsSnapshot =
    await getDocs(
      collection(
        db,
        "needs"
      )
    );


  const requests =
    [];


  needsSnapshot.forEach(
    needDoc => {

      const need =
        {
          id:
            needDoc.id,

          ...needDoc.data()
        };


      requests.push(
        loadOffersForNeed(
          need
        )
      );

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

}


// ============================================================
// LOAD OFFERS ONE NEED
// ============================================================

async function loadOffersForNeed(
  need
) {

  try {

    const offersRef =
      collection(
        db,
        "needs",
        need.id,
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


    const offers =
      [];


    snapshot.forEach(
      item => {

        offers.push({

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

          ...item.data()

        });

      }
    );


    return offers;


  } catch (error) {

    console.warn(
      "OFFER LOAD ERROR:",
      need.id,
      error.message
    );


    return [];

  }

}


// ============================================================
// LOAD PROJECTS
// ============================================================

async function loadMyProjects() {

  myProjects =
    [];


  const needsSnapshot =
    await getDocs(
      collection(
        db,
        "needs"
      )
    );


  const requests =
    [];


  needsSnapshot.forEach(
    needDoc => {

      const need =
        {
          id:
            needDoc.id,

          ...needDoc.data()
        };


      // Hanya kebutuhan yang sudah mempunyai
      // accepted provider.

      if (
        !need.acceptedOfferId ||
        !need.acceptedProviderId
      ) {

        return;

      }


      if (
        need.ownerId !==
          currentUser.uid &&
        need.acceptedProviderId !==
          currentUser.uid
      ) {

        return;

      }


      requests.push(
        loadProjectTransaction(
          need
        )
      );

    }
  );


  const results =
    await Promise.all(
      requests
    );


  myProjects =
    results.filter(
      Boolean
    );


  myProjects.sort(
    (a, b) =>
      getTime(
        b.updatedAt
      ) -
      getTime(
        a.updatedAt
      )
  );

}


// ============================================================
// LOAD TRANSACTION
// ============================================================

async function loadProjectTransaction(
  need
) {

  try {

    const transactionsRef =
      collection(
        db,
        "needs",
        need.id,
        "transactions"
      );


    const q =
      query(
        transactionsRef,
        where(
          "offerId",
          "==",
          need.acceptedOfferId
        ),
        limit(1)
      );


    const snapshot =
      await getDocs(q);


    if (
      snapshot.empty
    ) {

      return null;

    }


    const item =
      snapshot.docs[0];


    return {

      id:
        item.id,

      needId:
        need.id,

      ...item.data(),

      needStatus:
        need.status

    };


  } catch (error) {

    console.warn(
      "PROJECT LOAD ERROR:",
      need.id,
      error.message
    );


    return null;

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

        <span class="status ${
          getNeedStatusClass(
            status
          )
        }">

          ${getNeedStatusText(
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

        <span class="status ${
          getOfferStatusClass(
            status
          )
        }">

          ${getOfferStatusText(
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
// RENDER PROJECTS
// ============================================================

function renderProjects() {

  const container =
    $("projectsList") ||
    $("myProjectsList");


  if (!container) {

    console.warn(
      "Container proyek tidak ditemukan."
    );

    return;

  }


  if (!myProjects.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          🚀
        </div>

        <strong>
          Belum ada proyek
        </strong>

        <p>
          Proyek akan muncul setelah penawaran diterima.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =
    myProjects
      .map(
        createProjectCard
      )
      .join("");


  container
    .querySelectorAll(
      "[data-project-action]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const needId =
              button.dataset.needId;


            const transactionId =
              button.dataset.transactionId;


            window.openProjectTransaction(
              needId,
              transactionId
            );

          }
        );

      }
    );

}


// ============================================================
// PROJECT CARD
// ============================================================

function createProjectCard(
  project
) {

  const isOwner =
    project.ownerId ===
    currentUser.uid;


  const status =
    project.status ||
    "in_progress";


  return `

    <article class="history-card">

      <div class="history-main">

        <h3>
          🚀 ${escapeHTML(
            project.title ||
            "Proyek"
          )}
        </h3>


        <div class="offer-price">

          Rp ${formatMoney(
            project.price
          )}

        </div>


        <p>

          ${
            isOwner
              ? `
                👨‍💻 Penyedia:
                ${escapeHTML(
                  project.providerName ||
                  "Penyedia"
                )}
              `
              : `
                👤 Pemilik:
                ${escapeHTML(
                  project.ownerName ||
                  "Pemilik"
                )}
              `
          }

        </p>


        <div class="history-meta">

          <span>
            ${getProjectStatusText(
              project
            )}
          </span>


          <span>
            💳 ${getPaymentStatusText(
              project.paymentStatus
            )}
          </span>

        </div>

      </div>


      <div>

        <span class="status ${
          getProjectStatusClass(
            project
          )
        }">

          ${getProjectStatusText(
            project
          )}

        </span>


        <br>


        <button
          type="button"
          class="btn btn-primary"
          style="margin-top:12px"
          data-project-action="open"
          data-need-id="${escapeHTML(
            project.needId
          )}"
          data-transaction-id="${escapeHTML(
            project.id
          )}"
        >
          💬 Buka Proyek
        </button>

      </div>

    </article>

  `;

}


// ============================================================
// OPEN PROJECT
// ============================================================

window.openProjectTransaction =
  async function(
    needId,
    transactionId
  ) {

    if (!needId) {
      return;
    }


    window.location.href =
      "index.html?transaction=" +
      encodeURIComponent(
        transactionId
      ) +
      "&need=" +
      encodeURIComponent(
        needId
      );

  };


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
        ) ===
        "accepted"
    ).length;


  const completed =
    myOffers.filter(
      offer =>
        normalizeOfferStatus(
          offer.status
        ) ===
        "completed"
    ).length;


  setText(
    "acceptedOffers",
    accepted
  );


  setText(
    "completedOffers",
    completed
  );


  setText(
    "totalProjects",
    myProjects.length
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
// OFFER STATUS
// ============================================================

function normalizeOfferStatus(
  status
) {

  const value =
    String(
      status ||
      "pending"
    ).toLowerCase();


  if (
    value === "accepted" ||
    value === "accept" ||
    value === "diterima"
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


// ============================================================
// OFFER STATUS CLASS
// ============================================================

function getOfferStatusClass(
  status
) {

  switch (
    status
  ) {

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


// ============================================================
// OFFER STATUS TEXT
// ============================================================

function getOfferStatusText(
  status
) {

  switch (
    status
  ) {

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
// NEED STATUS
// ============================================================

function getNeedStatusClass(
  status
) {

  switch (
    status
  ) {

    case "completed":
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


// ============================================================
// NEED STATUS TEXT
// ============================================================

function getNeedStatusText(
  status
) {

  switch (
    status
  ) {

    case "completed":
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
// PROJECT STATUS
// ============================================================

function getProjectStatusClass(
  project
) {

  if (
    project.paymentStatus ===
      "paid" &&
    project.providerCompleted &&
    project.ownerConfirmed
  ) {

    return "status-completed";

  }


  if (
    project.providerCompleted
  ) {

    return "status-success";

  }


  return "status-pending";

}


function getProjectStatusText(
  project
) {

  if (
    project.paymentStatus ===
      "paid" &&
    project.providerCompleted &&
    project.ownerConfirmed
  ) {

    return "✓ Transaksi Selesai";

  }


  if (
    project.ownerConfirmed
  ) {

    return "💳 Menunggu Pembayaran";

  }


  if (
    project.providerCompleted
  ) {

    return "⏳ Menunggu Konfirmasi";

  }


  return "🔨 Dalam Pengerjaan";

}


// ============================================================
// PAYMENT STATUS
// ============================================================

function getPaymentStatusText(
  status
) {

  switch (
    status
  ) {

    case "paid":
      return "✓ Dibayar";

    case "pending":
      return "⏳ Pending";

    default:
      return "Belum Dibayar";

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


function showProjectsLoading() {

  const container =
    $("projectsList") ||
    $("myProjectsList");


  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="loading-state">

      <div class="spinner"></div>

      Memuat proyek...

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

      ⚠️

      <strong>
        Gagal memuat kebutuhan
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

      ⚠️

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


function showProjectsError(
  error
) {

  const container =
    $("projectsList") ||
    $("myProjectsList");


  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="error-state">

      ⚠️

      <strong>
        Gagal memuat proyek
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

      return value.seconds *
        1000;

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


  return value.length >
    length

    ? value.substring(
        0,
        length
      ) + "..."

    : value;

}


// ============================================================
// ESCAPE
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


  if (element) {

    element.src =
      src ||
      createAvatar(
        "U"
      );

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
      value ??
      "";

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
    encodeURIComponent(
      letter
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


console.log(
  "✅ BUTUH profile.js TRANSACTION VERSION aktif"
);
