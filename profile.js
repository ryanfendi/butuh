// ============================================================
// BUTUH - PROFILE.JS V2
// Profil + Kebutuhan + Penawaran + Transaksi
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
  orderBy
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
let myTransactions = [];

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
    user.photoURL ||
    createAvatar(name)
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
  showTransactionsLoading();

  try {

    await loadMyNeeds();

    renderNeeds();

    await loadMyOffers();

    renderOffers();

    await loadMyTransactions();

    renderTransactions();

    updateStatistics();

    calculateRating();

  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    showNeedsError(error);
    showOffersError(error);
    showTransactionsError(error);

  } finally {

    loading = false;
  }
}

// ============================================================
// LOAD NEEDS
// ============================================================

async function loadMyNeeds() {

  myNeeds = [];

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

  snapshot.forEach(item => {

    myNeeds.push({
      id: item.id,
      ...item.data()
    });

  });

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

  myOffers = [];

  const needsSnapshot =
    await getDocs(
      collection(db, "needs")
    );

  const allNeeds = [];

  needsSnapshot.forEach(item => {

    allNeeds.push({
      id: item.id,
      ...item.data()
    });

  });

  const requests =
    allNeeds.map(
      async need => {

        try {

          const q =
            query(
              collection(
                db,
                "needs",
                need.id,
                "offers"
              ),
              where(
                "providerId",
                "==",
                currentUser.uid
              )
            );

          const snapshot =
            await getDocs(q);

          const offers = [];

          snapshot.forEach(item => {

            offers.push({

              id: item.id,

              needId:
                need.id,

              needTitle:
                need.title ||
                "Kebutuhan",

              needBudget:
                need.budget ||
                0,

              ownerId:
                need.ownerId,

              ownerName:
                need.ownerName ||
                "Pemilik",

              ...item.data()

            });

          });

          return offers;

        } catch (error) {

          console.warn(
            "Offer error:",
            need.id,
            error.message
          );

          return [];
        }
      }
    );

  const results =
    await Promise.all(requests);

  myOffers =
    results.flat();

  myOffers.sort(
    (a, b) =>
      getTime(b.createdAt) -
      getTime(a.createdAt)
  );
}

// ============================================================
// LOAD TRANSACTIONS
// ============================================================

async function loadMyTransactions() {

  myTransactions = [];

  // ----------------------------------------------------------
  // Cari dari kebutuhan milik user
  // ----------------------------------------------------------

  const ownerNeedsSnapshot =
    await getDocs(
      query(
        collection(db, "needs"),
        where(
          "ownerId",
          "==",
          currentUser.uid
        )
      )
    );

  for (
    const needDoc
    of ownerNeedsSnapshot.docs
  ) {

    try {

      const transactionsSnapshot =
        await getDocs(
          collection(
            db,
            "needs",
            needDoc.id,
            "transactions"
          )
        );

      transactionsSnapshot.forEach(
        transactionDoc => {

          myTransactions.push({

            id:
              transactionDoc.id,

            needId:
              needDoc.id,

            ...transactionDoc.data()

          });

        }
      );

    } catch (error) {

      console.warn(
        "Owner transaction error:",
        error.message
      );
    }
  }

  // ----------------------------------------------------------
  // Cari transaksi provider
  // ----------------------------------------------------------

  const allNeedsSnapshot =
    await getDocs(
      collection(db, "needs")
    );

  for (
    const needDoc
    of allNeedsSnapshot.docs
  ) {

    const need =
      needDoc.data();

    if (
      need.ownerId ===
      currentUser.uid
    ) {
      continue;
    }

    try {

      const transactionsSnapshot =
        await getDocs(
          collection(
            db,
            "needs",
            needDoc.id,
            "transactions"
          )
        );

      transactionsSnapshot.forEach(
        transactionDoc => {

          const transaction =
            transactionDoc.data();

          if (
            transaction.providerId ===
            currentUser.uid
          ) {

            myTransactions.push({

              id:
                transactionDoc.id,

              needId:
                needDoc.id,

              ...transaction

            });

          }

        }
      );

    } catch (error) {

      console.warn(
        "Provider transaction error:",
        error.message
      );
    }
  }

  // ----------------------------------------------------------
  // Hilangkan duplikat
  // ----------------------------------------------------------

  const map =
    new Map();

  myTransactions.forEach(
    transaction => {

      map.set(
        `${transaction.needId}_${transaction.id}`,
        transaction
      );

    }
  );

  myTransactions =
    Array.from(
      map.values()
    );

  myTransactions.sort(
    (a, b) =>
      getTime(b.createdAt) -
      getTime(a.createdAt)
  );
}

// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds() {

  const container =
    $("needsList");

  if (!container) return;

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

function createNeedCard(need) {

  const status =
    normalizeNeedStatus(
      need.status
    );

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
              need.description || "",
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
          getNeedStatusClass(status)
        }">

          ${getNeedStatusText(status)}

        </span>

        <br>

        <button
          type="button"
          class="btn btn-primary"
          style="margin-top:12px"
          onclick="
            window.viewNeed(
              '${escapeJS(need.id)}'
            )
          "
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

    if (!needId) return;

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

  if (!container) return;

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
    normalizeOfferStatus(
      offer.status
    );

  const transaction =
    myTransactions.find(
      t =>
        t.needId ===
          offer.needId &&
        t.offerId ===
          offer.id
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

        <span class="status ${
          getOfferStatusClass(status)
        }">

          ${getOfferStatusText(status)}

        </span>

        <br>

        ${
          transaction
            ? `
              <button
                type="button"
                class="btn btn-primary"
                style="margin-top:12px"
                data-transaction-id="${escapeHTML(
                  transaction.id
                )}"
                data-need-id="${escapeHTML(
                  transaction.needId
                )}"
              >
                🤝 Buka Transaksi
              </button>
            `
            : `
              <button
                type="button"
                class="btn btn-outline"
                style="margin-top:12px"
                onclick="
                  window.viewNeed(
                    '${escapeJS(
                      offer.needId
                    )}'
                  )
                "
              >
                👁️ Lihat Kebutuhan
              </button>
            `
        }

      </div>

    </article>
  `;
}

// ============================================================
// RENDER TRANSACTIONS
// ============================================================

function renderTransactions() {

  let container =
    $("transactionsList");

  // Jika HTML lama belum punya container,
  // kita buat otomatis.

  if (!container) {

    const offersContainer =
      $("offersList");

    if (!offersContainer) {
      return;
    }

    const section =
      document.createElement("div");

    section.style.marginTop =
      "30px";

    section.innerHTML = `
      <h2>
        🤝 Transaksi Saya
      </h2>

      <p style="color:#6b7280">
        Semua pekerjaan yang sedang berjalan
        dan telah selesai.
      </p>

      <div
        id="transactionsList"
        style="margin-top:15px"
      ></div>
    `;

    offersContainer.parentNode
      ?.insertBefore(
        section,
        offersContainer.nextSibling
      );

    container =
      $("transactionsList");
  }

  if (!container) return;

  if (!myTransactions.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          🤝
        </div>

        <strong>
          Belum ada transaksi
        </strong>

        <p>
          Transaksi akan muncul setelah
          penawaran diterima.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    myTransactions
      .map(
        transaction =>
          createTransactionCard(
            transaction
          )
      )
      .join("");
}

// ============================================================
// TRANSACTION CARD
// ============================================================

function createTransactionCard(
  transaction
) {

  const isOwner =
    transaction.ownerId ===
    currentUser.uid;

  const status =
    transaction.status ||
    "in_progress";

  let actionText =
    "🤝 Buka Transaksi";

  if (
    status ===
    "completed"
  ) {
    actionText =
      "📄 Lihat Transaksi";
  }

  return `
    <article class="history-card">

      <div class="history-main">

        <h3>
          ${escapeHTML(
            transaction.needTitle ||
            "Transaksi"
          )}
        </h3>

        <div class="offer-price">
          Rp ${formatMoney(
            transaction.amount
          )}
        </div>

        <div class="history-meta">

          <span>
            ${
              isOwner
                ? "👤 Anda = Pemilik"
                : "🛠️ Anda = Penyedia"
            }
          </span>

          <span>
            ${
              isOwner
                ? "🛠️ " +
                  escapeHTML(
                    transaction.providerName ||
                    "-"
                  )
                : "👤 " +
                  escapeHTML(
                    transaction.ownerName ||
                    "-"
                  )
            }
          </span>

        </div>

        <div style="
          margin-top:8px;
          color:#4b5563;
        ">

          💳 Pembayaran:
          ${escapeHTML(
            transaction.paymentStatus ||
            "unpaid"
          )}

          <br>

          🔨 Pekerjaan:
          ${escapeHTML(
            transaction.workStatus ||
            "in_progress"
          )}

        </div>

      </div>

      <div>

        <span class="status ${
          getTransactionStatusClass(
            status
          )
        }">

          ${getTransactionStatusText(
            status
          )}

        </span>

        <br>

        <button
          type="button"
          class="btn btn-primary"
          style="margin-top:12px"
          data-transaction-id="${escapeHTML(
            transaction.id
          )}"
          data-need-id="${escapeHTML(
            transaction.needId
          )}"
        >
          ${actionText}
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

  // Tambahan jika HTML memilikinya

  setText(
    "totalTransactions",
    myTransactions.length
  );

  setText(
    "activeTransactions",
    myTransactions.filter(
      t =>
        t.status !==
        "completed"
    ).length
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
// STATUS
// ============================================================

function normalizeNeedStatus(
  status
) {

  const value =
    String(
      status || "open"
    ).toLowerCase();

  if (
    value === "completed" ||
    value === "complete" ||
    value === "selesai"
  ) {
    return "completed";
  }

  if (
    value === "in_progress" ||
    value === "in-progress"
  ) {
    return "in_progress";
  }

  if (
    value === "cancelled" ||
    value === "canceled"
  ) {
    return "cancelled";
  }

  return "open";
}

function normalizeOfferStatus(
  status
) {

  const value =
    String(
      status || "pending"
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
    value === "rejected" ||
    value === "ditolak"
  ) {
    return "rejected";
  }

  if (
    value === "completed" ||
    value === "complete" ||
    value === "selesai"
  ) {
    return "completed";
  }

  return "pending";
}

function getNeedStatusClass(
  status
) {

  switch (
    normalizeNeedStatus(status)
  ) {

    case "completed":
      return "status-completed";

    case "in_progress":
      return "status-success";

    case "cancelled":
      return "status-danger";

    default:
      return "status-pending";
  }
}

function getNeedStatusText(
  status
) {

  switch (
    normalizeNeedStatus(status)
  ) {

    case "completed":
      return "✓ Selesai";

    case "in_progress":
      return "🔨 Dalam Pengerjaan";

    case "cancelled":
      return "✕ Dibatalkan";

    default:
      return "🟢 Dibuka";
  }
}

function getOfferStatusClass(
  status
) {

  switch (
    normalizeOfferStatus(status)
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

function getOfferStatusText(
  status
) {

  switch (
    normalizeOfferStatus(status)
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

function getTransactionStatusClass(
  status
) {

  if (
    status ===
    "completed"
  ) {
    return "status-completed";
  }

  return "status-success";
}

function getTransactionStatusText(
  status
) {

  if (
    status ===
    "completed"
  ) {
    return "✓ Selesai";
  }

  return "🔨 Dalam Pengerjaan";
}

// ============================================================
// LOADING
// ============================================================

function showNeedsLoading() {

  const container =
    $("needsList");

  if (!container) return;

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

  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      Memuat penawaran...
    </div>
  `;
}

function showTransactionsLoading() {

  const container =
    $("transactionsList");

  if (!container) return;
}

// ============================================================
// ERROR
// ============================================================

function showNeedsError(
  error
) {

  const container =
    $("needsList");

  if (!container) return;

  container.innerHTML = `
    <div class="error-state">

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

  if (!container) return;

  container.innerHTML = `
    <div class="error-state">

      <strong>
        Gagal memuat penawaran
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

function showTransactionsError(
  error
) {

  const container =
    $("transactionsList");

  if (!container) return;

  container.innerHTML = `
    <div class="error-state">

      <strong>
        Gagal memuat transaksi
      </strong>

      <p>
        ${escapeHTML(
          error?.message ||
          "Terjadi kesalahan."
        )}
      </p>

    </div>
  `;
}

// ============================================================
// RETRY
// ============================================================

window.reloadProfile =
  async function() {

    if (loading) return;

    await loadProfile();
  };

// ============================================================
// UTILITIES
// ============================================================

function getTime(value) {

  if (!value) return 0;

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
      return value.toDate().getTime();
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

function truncate(
  text,
  length
) {

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

function escapeJS(value) {

  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

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

function setImage(
  id,
  src
) {

  const element =
    $(id);

  if (element) {
    element.src =
      src ||
      createAvatar("U");
  }
}

function createAvatar(
  name
) {

  const letter =
    String(
      name || "U"
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
  "✅ BUTUH profile.js V2 transaksi aktif"
);
