// ============================================================
// BUTUH - PROFILE.JS
// VERSI 5
// Profile + Offers + Projects + Chat + Payment
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
  updateDoc,
  setDoc,
  serverTimestamp
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

let myProjects = [];

let loading = false;


// ============================================================
// HELPER
// ============================================================

const $ =
  id => document.getElementById(id);


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

    showNeedsError(error);

    showOffersError(error);

    showProjectsError(error);

  } finally {

    loading = false;

  }

}


// ============================================================
// LOAD MY NEEDS
// ============================================================

async function loadMyNeeds() {

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
// LOAD MY OFFERS
// ============================================================
//
// Tidak menggunakan collectionGroup.
// Kita membaca setiap needs kemudian hanya mengambil
// offer milik user.
//
// Ini kompatibel dengan struktur Firestore Anda saat ini.
// ============================================================

async function loadMyOffers() {

  myOffers = [];

  const allNeedsSnapshot =
    await getDocs(
      collection(
        db,
        "needs"
      )
    );

  const requests = [];

  allNeedsSnapshot.forEach(
    item => {

      const need = {

        id:
          item.id,

        ...item.data()

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

    const result = [];

    snapshot.forEach(
      item => {

        result.push({

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

          needOwnerId:
            need.ownerId,

          needOwnerName:
            need.ownerName ||
            "Pemilik",

          ...item.data()

        });

      }
    );

    return result;

  } catch (error) {

    console.warn(
      "OFFER READ:",
      need.id,
      error.message
    );

    return [];

  }

}


// ============================================================
// LOAD PROJECTS
// ============================================================
//
// Project = offer dengan status accepted.
//
// Proyek bisa dilihat oleh:
// - pemilik kebutuhan
// - provider yang offer-nya diterima
//
// ============================================================

async function loadMyProjects() {

  myProjects = [];

  // Ambil semua kebutuhan.
  const needsSnapshot =
    await getDocs(
      collection(
        db,
        "needs"
      )
    );

  const requests = [];

  needsSnapshot.forEach(
    item => {

      const need = {

        id:
          item.id,

        ...item.data()

      };

      const isOwner =
        need.ownerId ===
        currentUser.uid;

      // Jika bukan owner, kita hanya perlu
      // mencari offer milik user.
      requests.push(
        loadAcceptedProject(
          need,
          isOwner
        )
      );

    }
  );

  const results =
    await Promise.all(
      requests
    );

  myProjects =
    results
      .filter(Boolean)
      .sort(
        (a, b) =>
          getTime(b.createdAt) -
          getTime(a.createdAt)
      );

}


// ============================================================
// LOAD ACCEPTED PROJECT
// ============================================================

async function loadAcceptedProject(
  need,
  isOwner
) {

  try {

    let snapshot;

    // --------------------------------------------------------
    // OWNER
    // --------------------------------------------------------

    if (isOwner) {

      if (!need.acceptedOfferId) {

        return null;

      }

      const offerRef =
        doc(
          db,
          "needs",
          need.id,
          "offers",
          need.acceptedOfferId
        );

      snapshot =
        await getDoc(
          offerRef
        );

      if (!snapshot.exists()) {

        return null;

      }

      const offer =
        snapshot.data();

      if (
        normalizeOfferStatus(
          offer.status
        ) !==
        "accepted"
      ) {

        return null;

      }

      return {

        id:
          snapshot.id,

        needId:
          need.id,

        needTitle:
          need.title,

        needBudget:
          need.budget,

        role:
          "owner",

        ownerId:
          need.ownerId,

        ownerName:
          need.ownerName,

        providerId:
          offer.providerId,

        providerName:
          offer.providerName,

        price:
          offer.price,

        duration:
          offer.duration,

        offerStatus:
          offer.status,

        needStatus:
          need.status,

        createdAt:
          offer.createdAt,

        updatedAt:
          offer.updatedAt

      };

    }


    // --------------------------------------------------------
    // PROVIDER
    // --------------------------------------------------------

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

    const offersSnapshot =
      await getDocs(q);

    let accepted = null;

    offersSnapshot.forEach(
      item => {

        const offer =
          item.data();

        if (
          normalizeOfferStatus(
            offer.status
          ) ===
          "accepted"
        ) {

          accepted = {

            id:
              item.id,

            ...offer

          };

        }

      }
    );

    if (!accepted) {

      return null;

    }

    return {

      id:
        accepted.id,

      needId:
        need.id,

      needTitle:
        need.title,

      needBudget:
        need.budget,

      role:
        "provider",

      ownerId:
        need.ownerId,

      ownerName:
        need.ownerName,

      providerId:
        accepted.providerId,

      providerName:
        accepted.providerName,

      price:
        accepted.price,

      duration:
        accepted.duration,

      offerStatus:
        accepted.status,

      needStatus:
        need.status,

      createdAt:
        accepted.createdAt,

      updatedAt:
        accepted.updatedAt

    };

  } catch (error) {

    console.warn(
      "PROJECT ERROR:",
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
          onclick="window.viewNeed('${escapeJS(need.id)}')"
        >
          👁️ Lihat Kebutuhan
        </button>

      </div>

    </article>
  `;

}


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
          onclick="window.viewNeed('${escapeJS(offer.needId)}')"
        >
          👁️ Lihat
        </button>

        ${
          status === "accepted"
            ? `
              <button
                type="button"
                class="btn btn-primary"
                style="margin-top:8px"
                onclick="window.openButuhChat('${escapeJS(offer.needId)}','${escapeJS(offer.id)}')"
              >
                💬 Chat
              </button>
            `
            : ""
        }

      </div>

    </article>
  `;

}


// ============================================================
// RENDER PROJECTS
// ============================================================

function renderProjects() {

  const container =
    $("projectsList");

  if (!container) {

    // Tidak error kalau profile.html lama
    // belum memiliki projectsList.
    return;
  }

  if (!myProjects.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          🚀
        </div>

        <strong>
          Belum ada proyek aktif
        </strong>

        <p>
          Proyek akan muncul otomatis setelah
          salah satu penawaran Anda diterima.
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

}


// ============================================================
// PROJECT CARD
// ============================================================

function createProjectCard(
  project
) {

  const completed =
    project.needStatus ===
      "completed" ||
    project.needStatus ===
      "selesai";

  const chatId =
    createChatId(
      project.needId,
      project.id
    );

  return `
    <article class="history-card">

      <div class="history-main">

        <h3>
          🚀 ${escapeHTML(
            project.needTitle ||
            "Proyek"
          )}
        </h3>

        <div class="offer-price">
          Rp ${formatMoney(
            project.price
          )}
        </div>

        <div class="history-meta">

          <span>
            ${
              project.role === "owner"
                ? "👤 Anda Pemilik"
                : "🛠️ Anda Penyedia"
            }
          </span>

          <span>
            ⏱️ ${escapeHTML(
              project.duration ||
              "-"
            )}
          </span>

        </div>

        <div style="
          margin-top:12px;
          line-height:1.8;
        ">

          ${
            project.role === "owner"
              ? `
                🛠️ Penyedia:
                <strong>
                  ${escapeHTML(
                    project.providerName ||
                    "Penyedia"
                  )}
                </strong>
              `
              : `
                👤 Pemilik:
                <strong>
                  ${escapeHTML(
                    project.ownerName ||
                    "Pemilik"
                  )}
                </strong>
              `
          }

        </div>

      </div>

      <div>

        <span class="status ${
          completed
            ? "status-completed"
            : "status-success"
        }">

          ${
            completed
              ? "✓ Selesai"
              : "🔨 Berjalan"
          }

        </span>

        <br>

        <button
          type="button"
          class="btn btn-primary"
          style="margin-top:10px"
          onclick="window.openButuhChat('${escapeJS(project.needId)}','${escapeJS(project.id)}')"
        >
          💬 Chat
        </button>

        <button
          type="button"
          class="btn btn-outline"
          style="margin-top:8px"
          onclick="window.openProjectTransaction('${escapeJS(project.needId)}','${escapeJS(project.id)}')"
        >
          💳 Pembayaran
        </button>

      </div>

    </article>
  `;

}


// ============================================================
// TRANSACTION
// ============================================================

window.openProjectTransaction =
  async function(
    needId,
    offerId
  ) {

    if (!currentUser) return;

    const transactionId =
      createChatId(
        needId,
        offerId
      );

    try {

      const ref =
        doc(
          db,
          "transactions",
          transactionId
        );

      const snapshot =
        await getDoc(ref);

      if (!snapshot.exists()) {

        alert(
          "Transaksi belum dibuat."
        );

        return;
      }

      const transaction =
        snapshot.data();

      renderTransactionModal(
        transaction
      );

    } catch (error) {

      console.error(
        "TRANSACTION ERROR:",
        error
      );

      alert(
        "Gagal memuat transaksi:\n" +
        error.message
      );

    }

  };


// ============================================================
// TRANSACTION MODAL
// ============================================================

function renderTransactionModal(
  transaction
) {

  let modal =
    $("transactionModal");

  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "transactionModal";

    modal.className =
      "modal hidden";

    document.body.appendChild(
      modal
    );

  }

  const isBuyer =
    transaction.buyerId ===
    currentUser.uid;

  const isSeller =
    transaction.sellerId ===
    currentUser.uid;

  const funded =
    transaction.status ===
    "funded";

  const paid =
    transaction.status ===
      "payment_pending_verification" ||
    funded;

  const bothCompleted =
    transaction.providerCompleted &&
    transaction.ownerConfirmedCompletion;

  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="transactionBackdrop"
    ></div>

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            TRANSAKSI
          </span>

          <h2>
            💳 Pembayaran
          </h2>

        </div>

        <button
          id="closeTransaction"
          class="modal-close"
          type="button"
        >
          ×
        </button>

      </div>

      <div style="padding:22px">

        <h3>
          ${escapeHTML(
            transaction.needTitle ||
            "Proyek"
          )}
        </h3>

        <div style="
          font-size:28px;
          font-weight:800;
          margin:15px 0;
          color:#2563eb;
        ">
          Rp ${formatMoney(
            transaction.amount
          )}
        </div>

        <div style="
          background:#f8fafc;
          padding:15px;
          border-radius:12px;
          line-height:2;
        ">

          <div>
            Status:
            <strong>
              ${getTransactionStatusText(
                transaction.status
              )}
            </strong>
          </div>

          <div>
            Pembayaran:
            ${
              transaction.buyerConfirmedPayment
                ? "✓ Sudah dikonfirmasi pembeli"
                : "⏳ Belum dikonfirmasi"
            }
          </div>

          <div>
            Pekerjaan:
            ${
              transaction.providerCompleted
                ? "✓ Penyedia menyatakan selesai"
                : "🔨 Belum selesai"
            }
          </div>

          <div>
            Konfirmasi pemilik:
            ${
              transaction.ownerConfirmedCompletion
                ? "✓ Dikonfirmasi"
                : "⏳ Belum dikonfirmasi"
            }
          </div>

        </div>

        <div style="
          margin-top:20px;
          display:grid;
          gap:10px;
        ">

          ${
            isBuyer &&
            transaction.status ===
              "unpaid"
              ? `
                <button
                  id="btnConfirmPayment"
                  class="btn btn-primary"
                  type="button"
                >
                  💰 Saya Sudah Bayar
                </button>
              `
              : ""
          }

          ${
            isSeller &&
            transaction.status ===
              "payment_pending_verification"
              ? `
                <button
                  id="btnVerifyPayment"
                  class="btn btn-primary"
                  type="button"
                >
                  ✓ Konfirmasi Pembayaran Diterima
                </button>
              `
              : ""
          }

          ${
            isSeller &&
            funded &&
            !transaction.providerCompleted
              ? `
                <button
                  id="btnProviderComplete"
                  class="btn btn-primary"
                  type="button"
                >
                  🏁 Saya Sudah Menyelesaikan Pekerjaan
                </button>
              `
              : ""
          }

          ${
            isBuyer &&
            transaction.providerCompleted &&
            !transaction.ownerConfirmedCompletion
              ? `
                <button
                  id="btnOwnerComplete"
                  class="btn btn-primary"
                  type="button"
                >
                  ✓ Konfirmasi Pekerjaan Selesai
                </button>
              `
              : ""
          }

          ${
            bothCompleted
              ? `
                <div style="
                  background:#dcfce7;
                  color:#166534;
                  padding:15px;
                  border-radius:12px;
                  font-weight:700;
                  text-align:center;
                ">
                  🎉 Transaksi selesai!
                </div>
              `
              : ""
          }

        </div>

        ${
          !funded &&
          isBuyer &&
          transaction.status === "unpaid"
            ? `
              <p style="
                margin-top:20px;
                font-size:13px;
                color:#6b7280;
              ">
                Alur pembayaran saat ini menggunakan
                konfirmasi manual. Belum ada gateway
                pembayaran otomatis yang terhubung.
              </p>
            `
            : ""
        }

      </div>

    </div>
  `;

  modal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );

  $("closeTransaction")
    ?.addEventListener(
      "click",
      () => closeModal(
        "transactionModal"
      )
    );

  $("transactionBackdrop")
    ?.addEventListener(
      "click",
      () => closeModal(
        "transactionModal"
      )
    );

  $("btnConfirmPayment")
    ?.addEventListener(
      "click",
      () =>
        updateTransaction(
          transaction.transactionId,
          {
            buyerConfirmedPayment:
              true,
            status:
              "payment_pending_verification"
          }
        )
    );

  $("btnVerifyPayment")
    ?.addEventListener(
      "click",
      () =>
        updateTransaction(
          transaction.transactionId,
          {
            sellerConfirmedPayment:
              true,
            status:
              "funded"
          }
        )
    );

  $("btnProviderComplete")
    ?.addEventListener(
      "click",
      () =>
        updateTransaction(
          transaction.transactionId,
          {
            providerCompleted:
              true
          }
        )
    );

  $("btnOwnerComplete")
    ?.addEventListener(
      "click",
      () =>
        updateTransaction(
          transaction.transactionId,
          {
            ownerConfirmedCompletion:
              true
          }
        )
    );

}


// ============================================================
// UPDATE TRANSACTION
// ============================================================

async function updateTransaction(
  transactionId,
  changes
) {

  try {

    const ref =
      doc(
        db,
        "transactions",
        transactionId
      );

    const snapshot =
      await getDoc(ref);

    if (!snapshot.exists()) {

      alert(
        "Transaksi tidak ditemukan."
      );

      return;
    }

    const old =
      snapshot.data();

    const next = {
      ...old,
      ...changes
    };

    // Jika kedua pihak sudah selesai
    // maka transaksi menjadi completed.
    if (
      next.providerCompleted &&
      next.ownerConfirmedCompletion
    ) {

      changes.status =
        "completed";

      await updateDoc(
        doc(
          db,
          "needs",
          next.needId
        ),
        {
          status:
            "completed",

          updatedAt:
            serverTimestamp()
        }
      );

      await updateDoc(
        doc(
          db,
          "needs",
          next.needId,
          "offers",
          next.offerId
        ),
        {
          status:
            "completed",

          updatedAt:
            serverTimestamp()
        }
      );

    }

    changes.updatedAt =
      serverTimestamp();

    await updateDoc(
      ref,
      changes
    );

    showToast(
      "✅ Status transaksi diperbarui."
    );

    const latest =
      await getDoc(ref);

    if (latest.exists()) {

      renderTransactionModal(
        latest.data()
      );

    }

  } catch (error) {

    console.error(
      "UPDATE TRANSACTION ERROR:",
      error
    );

    alert(
      "Gagal memperbarui transaksi:\n\n" +
      error.message
    );

  }

}


// ============================================================
// TRANSACTION STATUS
// ============================================================

function getTransactionStatusText(
  status
) {

  switch (status) {

    case "unpaid":
      return "⏳ Menunggu pembayaran";

    case "payment_pending_verification":
      return "🔎 Menunggu verifikasi pembayaran";

    case "funded":
      return "💰 Pembayaran terkonfirmasi";

    case "completed":
      return "🎉 Selesai";

    default:
      return "⏳ " + status;

  }

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
// STATUS OFFER
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
    [
      "accepted",
      "accept",
      "diterima",
      "success"
    ].includes(value)
  ) {
    return "accepted";
  }

  if (
    [
      "completed",
      "complete",
      "selesai"
    ].includes(value)
  ) {
    return "completed";
  }

  if (
    [
      "rejected",
      "ditolak"
    ].includes(value)
  ) {
    return "rejected";
  }

  return "pending";

}


function getOfferStatusClass(
  status
) {

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


function getOfferStatusText(
  status
) {

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
// NEED STATUS
// ============================================================

function getNeedStatusClass(
  status
) {

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


function getNeedStatusText(
  status
) {

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


function showProjectsLoading() {

  const container =
    $("projectsList");

  if (!container) return;

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

  if (!container) return;

  container.innerHTML = `
    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

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

    </div>
  `;

}


function showProjectsError(
  error
) {

  const container =
    $("projectsList");

  if (!container) return;

  container.innerHTML = `
    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

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

    if (loading) return;

    await loadProfile();

  };


// ============================================================
// MODAL
// ============================================================

function closeModal(id) {

  const modal =
    $(id);

  if (!modal) return;

  modal.classList.add(
    "hidden"
  );

  document.body.classList.remove(
    "modal-open"
  );

}


// ============================================================
// CHAT ID
// ============================================================

function createChatId(
  needId,
  offerId
) {

  return (
    String(needId) +
    "_" +
    String(offerId)
  );

}


// ============================================================
// TOAST
// ============================================================

function showToast(
  message
) {

  let toast =
    $("profileToast");

  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "profileToast";

    Object.assign(
      toast.style,
      {

        position:"fixed",
        left:"50%",
        bottom:"25px",
        transform:"translateX(-50%)",
        zIndex:"999999",
        padding:"13px 20px",
        borderRadius:"999px",
        background:"#111827",
        color:"#fff",
        fontWeight:"700"

      }
    );

    document.body.appendChild(
      toast
    );

  }

  toast.textContent =
    message;

  toast.style.display =
    "block";

  clearTimeout(
    toast._timer
  );

  toast._timer =
    setTimeout(
      () => {
        toast.style.display =
          "none";
      },
      3000
    );

}


// ============================================================
// UTILS
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
      day:"2-digit",
      month:"short",
      year:"numeric"
    }
  ).format(
    new Date(time)
  );

}


function formatMoney(
  value
) {

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


function getCategory(
  value
) {

  const categories = {

    design:"🎨 Desain",
    website:"🌐 Website",
    programming:"💻 Programming",
    marketing:"📢 Marketing",
    writing:"✍️ Penulisan",
    video:"🎬 Video",
    translation:"🌍 Terjemahan",
    other:"📦 Lainnya"

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


function escapeHTML(
  value
) {

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


function escapeJS(
  value
) {

  return String(value ?? "")
    .replace(/\\/g,"\\\\")
    .replace(/'/g,"\\'")
    .replace(/\n/g,"\\n")
    .replace(/\r/g,"\\r");

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
  "✅ BUTUH profile.js V5 aktif"
);
