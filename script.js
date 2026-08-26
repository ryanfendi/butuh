// ============================================================
// BUTUH - SCRIPT.JS
// VERSI TERBARU
//
// ALUR:
// Kebutuhan
//   ↓
// Penawaran
//   ↓
// Terima / Tolak
//   ↓
// Transaksi otomatis
//   ↓
// Chat
//   ↓
// Pembayaran
//   ↓
// Pengerjaan
//   ↓
// Penyedia menyelesaikan
//   ↓
// Konfirmasi Pemilik
//   ↓
// Konfirmasi Penyedia
//   ↓
// TRANSAKSI SELESAI
// ============================================================


// ============================================================
// FIREBASE APP
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


// ============================================================
// FIREBASE AUTH
// ============================================================

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// ============================================================
// FIRESTORE
// ============================================================

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  orderBy,
  limit
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

let authReady = false;

let needsCache = [];

let unsubscribeNeeds = null;

let currentDetailNeed = null;

let currentTransaction = null;

let unsubscribeTransaction = null;

let unsubscribeMessages = null;

let isSubmittingNeed = false;

let isSubmittingOffer = false;

let isUpdatingOffer = false;

let isCreatingTransaction = false;

let isSendingMessage = false;

let isUpdatingTransaction = false;


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

    currentUser =
      user;

    authReady =
      true;


    updateUserUI(
      user
    );


    if (user) {

      loadNeeds();

      openNeedFromURL();

    } else {

      if (unsubscribeNeeds) {

        unsubscribeNeeds();

        unsubscribeNeeds = null;

      }


      if (unsubscribeTransaction) {

        unsubscribeTransaction();

        unsubscribeTransaction = null;

      }


      if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages = null;

      }


      needsCache = [];

      showLoggedOut();

    }

  }
);


// ============================================================
// USER UI
// ============================================================

function updateUserUI(user) {

  if (!user) {

    setText(
      "userName",
      "Pengguna"
    );

    setText(
      "menuUserName",
      "Pengguna"
    );

    setText(
      "userEmail",
      ""
    );

    setText(
      "menuUserEmail",
      ""
    );

    return;

  }


  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";


  const email =
    user.email ||
    "";


  const photo =
    user.photoURL ||
    avatar(name);


  setText(
    "userName",
    name
  );

  setText(
    "menuUserName",
    name
  );

  setText(
    "userEmail",
    email
  );

  setText(
    "menuUserEmail",
    email
  );


  setImage(
    "userPhoto",
    photo
  );

  setImage(
    "menuUserPhoto",
    photo
  );

}


// ============================================================
// LOAD NEEDS
// ============================================================

function loadNeeds() {

  const container =
    $("needsList");


  if (!container) {
    return;
  }


  if (unsubscribeNeeds) {

    unsubscribeNeeds();

    unsubscribeNeeds = null;

  }


  container.innerHTML = `

    <div class="loading-box">

      <div class="loading-spinner"></div>

      <strong>
        Memuat kebutuhan...
      </strong>

      <small>
        Menghubungkan ke Firestore
      </small>

    </div>

  `;


  const needsRef =
    collection(
      db,
      "needs"
    );


  unsubscribeNeeds =
    onSnapshot(

      needsRef,

      snapshot => {

        const needs = [];


        snapshot.forEach(
          item => {

            needs.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        needs.sort(
          (a, b) =>
            getTime(
              b.createdAt
            ) -
            getTime(
              a.createdAt
            )
        );


        needsCache =
          needs;


        renderNeeds(
          needs
        );


        updateBasicCounters(
          needs
        );


        loadMyOfferCountFast(
          needs
        );

      },

      error => {

        console.error(
          "LOAD NEEDS ERROR:",
          error
        );


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
                error.message ||
                "Terjadi kesalahan."
              )}
            </p>

            <button
              id="retryNeedsBtn"
              class="btn btn-primary"
              type="button"
            >
              🔄 Coba Lagi
            </button>

          </div>

        `;


        $("retryNeedsBtn")
          ?.addEventListener(
            "click",
            loadNeeds
          );

      }

    );

}


// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds(
  needs
) {

  const container =
    $("needsList");


  if (!container) {
    return;
  }


  if (!needs.length) {

    container.innerHTML = `

      <div class="loading-box">

        <div class="empty-icon">
          📭
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <small>
          Jadilah yang pertama memposting kebutuhan.
        </small>

      </div>

    `;

    return;

  }


  container.innerHTML =
    needs
      .map(
        need =>
          createNeedCard(
            need
          )
      )
      .join("");

}


// ============================================================
// CREATE NEED CARD
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
        160
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


  const owner =
    need.ownerId ===
    currentUser?.uid;


  const status =
    normalizeNeedStatus(
      need.status
    );


  const isOpen =
    status === "open";


  return `

    <article
      class="need-card"
      data-id="${escapeHTML(need.id)}"
    >

      <div class="need-card-top">

        <div>

          <span class="need-category">
            ${category}
          </span>

          <h3>
            ${title}
          </h3>

        </div>


        ${
          owner
            ? `
              <span class="status-badge status-open">
                👤 Milik Anda
              </span>
            `
            : ""
        }

      </div>


      <p class="need-description">
        ${description}
      </p>


      <div class="need-footer">

        <div>

          <div class="need-budget">
            Rp ${budget}
          </div>

          <div class="need-date">
            📅 ${formatDate(
              need.createdAt
            )}
          </div>

        </div>


        <button
          class="btn ${
            owner
              ? "btn-outline"
              : isOpen
                ? "btn-primary"
                : "btn-outline"
          }"
          type="button"
          data-action="detail"
          data-id="${escapeHTML(need.id)}"
        >

          ${
            owner
              ? "👁️ Lihat"
              : isOpen
                ? "💰 Tawarkan"
                : "👁️ Lihat"
          }

        </button>

      </div>

    </article>

  `;

}


// ============================================================
// COUNTERS
// ============================================================

function updateBasicCounters(
  needs
) {

  const active =
    needs.filter(
      need =>
        normalizeNeedStatus(
          need.status
        ) === "open"
    ).length;


  const mine =
    needs.filter(
      need =>
        need.ownerId ===
        currentUser?.uid
    ).length;


  setText(
    "activeNeedsCount",
    active
  );


  setText(
    "userNeedsCount",
    mine
  );

}


// ============================================================
// COUNT MY OFFERS
// ============================================================

async function loadMyOfferCountFast(
  needs
) {

  if (!currentUser) {

    setText(
      "userOffersCount",
      "0"
    );

    return;

  }


  if (!needs.length) {

    setText(
      "userOffersCount",
      "0"
    );

    return;

  }


  try {

    const requests =
      needs.map(
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


            const snapshot =
              await getDocs(
                offerQuery
              );


            return snapshot.size;

          } catch {

            return 0;

          }

        }
      );


    const results =
      await Promise.all(
        requests
      );


    const total =
      results.reduce(
        (sum, value) =>
          sum + value,
        0
      );


    setText(
      "userOffersCount",
      total
    );

  } catch (error) {

    console.warn(
      "COUNT OFFERS ERROR:",
      error
    );

  }

}


// ============================================================
// SUBMIT NEED
// ============================================================

async function submitNeed(
  event
) {

  event.preventDefault();


  if (isSubmittingNeed) {
    return;
  }


  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  const form =
    event.target;


  const title =
    String(
      form.title?.value ||
      ""
    ).trim();


  const description =
    String(
      form.description?.value ||
      ""
    ).trim();


  const category =
    form.category?.value ||
    "other";


  const rawBudget =
    String(
      form.budget?.value ||
      ""
    ).trim();


  const budget =
    Number(
      rawBudget
    );


  const deadline =
    form.deadline?.value ||
    "";


  if (!title) {

    alert(
      "Judul kebutuhan wajib diisi."
    );

    return;

  }


  if (!description) {

    alert(
      "Deskripsi kebutuhan wajib diisi."
    );

    return;

  }


  if (
    !Number.isFinite(
      budget
    ) ||
    budget <= 0
  ) {

    alert(
      "Masukkan budget yang valid."
    );

    return;

  }


  isSubmittingNeed =
    true;


  const button =
    $("submitNeed");


  const original =
    button?.innerHTML ||
    "🚀 Posting Kebutuhan";


  if (button) {

    button.disabled =
      true;

    button.innerHTML =
      "⏳ Menyimpan...";

  }


  try {

    await addDoc(

      collection(
        db,
        "needs"
      ),

      {

        title,

        description,

        category,

        budget,

        deadline,

        ownerId:
          currentUser.uid,

        ownerName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Pengguna",

        ownerEmail:
          currentUser.email ||
          "",

        ownerPhoto:
          currentUser.photoURL ||
          "",

        status:
          "open",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }

    );


    form.reset();

    closeNeedModal();


    showToast(
      "✅ Kebutuhan berhasil diposting!"
    );


  } catch (error) {

    console.error(
      "SUBMIT NEED ERROR:",
      error
    );


    alert(
      "Gagal menyimpan kebutuhan:\n\n" +
      error.message
    );

  } finally {

    isSubmittingNeed =
      false;


    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        original;

    }

  }

}


// ============================================================
// OPEN NEED DETAIL
// ============================================================

window.openNeedDetail =
  async function(
    needId
  ) {

    if (!needId) {
      return;
    }


    const cachedNeed =
      needsCache.find(
        need =>
          need.id ===
          needId
      );


    if (cachedNeed) {

      showNeedDetail(
        cachedNeed
      );

      return;

    }


    try {

      const needRef =
        doc(
          db,
          "needs",
          needId
        );


      const snapshot =
        await getDoc(
          needRef
        );


      if (!snapshot.exists()) {

        alert(
          "Kebutuhan tidak ditemukan."
        );

        return;

      }


      showNeedDetail({

        id:
          snapshot.id,

        ...snapshot.data()

      });


    } catch (error) {

      console.error(
        "DETAIL ERROR:",
        error
      );


      alert(
        "Gagal membuka kebutuhan:\n\n" +
        error.message
      );

    }

  };


// ============================================================
// SHOW NEED DETAIL
// ============================================================

async function showNeedDetail(
  need
) {

  currentDetailNeed =
    need;


  let modal =
    $("detailModal");


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "detailModal";

    modal.className =
      "modal hidden";

    document.body.appendChild(
      modal
    );

  }


  const isOwner =
    need.ownerId ===
    currentUser?.uid;


  const needStatus =
    normalizeNeedStatus(
      need.status
    );


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="detailBackdrop"
    ></div>


    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            DETAIL KEBUTUHAN
          </span>

          <h2>
            ${escapeHTML(
              need.title ||
              "Kebutuhan"
            )}
          </h2>

        </div>


        <button
          id="closeDetail"
          class="modal-close"
          type="button"
        >
          ×
        </button>

      </div>


      <div style="padding:22px">

        <p style="
          line-height:1.7;
          color:#374151;
        ">
          ${escapeHTML(
            need.description ||
            ""
          )}
        </p>


        <div style="
          background:#eff6ff;
          padding:16px;
          border-radius:12px;
          margin:20px 0;
        ">

          <small>
            Budget
          </small>

          <div style="
            font-size:24px;
            font-weight:800;
            color:#2563eb;
          ">
            Rp ${formatMoney(
              need.budget
            )}
          </div>

        </div>


        <div style="
          line-height:1.9;
          color:#4b5563;
        ">

          👤 ${escapeHTML(
            need.ownerName ||
            "Pengguna"
          )}

          <br>

          📂 ${escapeHTML(
            getCategory(
              need.category
            )
          )}

          <br>

          📅 ${formatDate(
            need.createdAt
          )}

          ${
            need.deadline
              ? `
                <br>
                ⏰ Deadline:
                ${escapeHTML(
                  need.deadline
                )}
              `
              : ""
          }

          <br>

          📌 Status:
          ${getNeedStatusText(
            needStatus
          )}

        </div>


        ${
          isOwner
            ? `

              <div style="margin-top:25px">

                <h3>
                  💰 Penawaran Masuk
                </h3>

                <div id="incomingOffersList">

                  <div class="loading-state">
                    Memuat penawaran...
                  </div>

                </div>

              </div>

            `
            : needStatus === "open"
              ? `

                <button
                  id="detailOfferButton"
                  class="btn btn-primary btn-large"
                  type="button"
                  style="
                    width:100%;
                    margin-top:25px;
                  "
                >
                  💰 Ajukan Penawaran
                </button>

              `
              : `

                <div style="
                  margin-top:25px;
                  padding:16px;
                  border-radius:12px;
                  background:#f3f4f6;
                ">

                  🔒 Kebutuhan sudah tidak menerima
                  penawaran baru.

                </div>

              `
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


  $("closeDetail")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "detailModal"
        )
    );


  $("detailBackdrop")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "detailModal"
        )
    );


  if (isOwner) {

    loadIncomingOffers(
      need
    );

  } else if (
    needStatus === "open"
  ) {

    $("detailOfferButton")
      ?.addEventListener(
        "click",
        () => {

          closeModal(
            "detailModal"
          );


          openOfferForm(
            need
          );

        }
      );

  }

}


// ============================================================
// LOAD INCOMING OFFERS
// ============================================================

async function loadIncomingOffers(
  need
) {

  const container =
    $("incomingOffersList");


  if (!container) {
    return;
  }


  try {

    const offersRef =
      collection(
        db,
        "needs",
        need.id,
        "offers"
      );


    const snapshot =
      await getDocs(
        offersRef
      );


    const offers = [];


    snapshot.forEach(
      item => {

        offers.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );


    offers.sort(
      (a, b) =>
        getTime(
          b.createdAt
        ) -
        getTime(
          a.createdAt
        )
    );


    if (!offers.length) {

      container.innerHTML = `

        <div class="empty-state">

          <div class="empty-icon">
            💰
          </div>

          <strong>
            Belum ada penawaran
          </strong>

          <p>
            Belum ada penyedia yang mengajukan penawaran.
          </p>

        </div>

      `;

      return;

    }


    container.innerHTML =
      offers
        .map(
          offer =>
            createIncomingOfferCard(
              need,
              offer
            )
        )
        .join("");


    container
      .querySelectorAll(
        "[data-offer-action]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async () => {

              const action =
                button.dataset.offerAction;


              const offerId =
                button.dataset.offerId;


              if (
                !action ||
                !offerId
              ) {
                return;
              }


              await updateOfferStatus(
                need,
                offerId,
                action
              );

            }
          );

        }
      );


  } catch (error) {

    console.error(
      "LOAD INCOMING OFFERS ERROR:",
      error
    );


    container.innerHTML = `

      <div class="error-state">

        <div class="error-icon">
          ⚠️
        </div>

        <strong>
          Gagal memuat penawaran
        </strong>

        <p>
          ${escapeHTML(
            error.message ||
            "Terjadi kesalahan."
          )}
        </p>

      </div>

    `;

  }

}


// ============================================================
// CREATE INCOMING OFFER CARD
// ============================================================

function createIncomingOfferCard(
  need,
  offer
) {

  const status =
    normalizeOfferStatus(
      offer.status
    );


  let actions = "";


  if (
    status === "pending" &&
    normalizeNeedStatus(
      need.status
    ) === "open"
  ) {

    actions = `

      <div style="
        display:flex;
        gap:8px;
        margin-top:12px;
        flex-wrap:wrap;
      ">

        <button
          type="button"
          class="btn btn-primary"
          data-offer-action="accepted"
          data-offer-id="${escapeHTML(
            offer.id
          )}"
        >
          ✓ Terima
        </button>


        <button
          type="button"
          class="btn btn-outline"
          data-offer-action="rejected"
          data-offer-id="${escapeHTML(
            offer.id
          )}"
        >
          ✕ Tolak
        </button>

      </div>

    `;

  }


  if (
    status === "accepted"
  ) {

    actions = `

      <button
        type="button"
        class="btn btn-primary"
        style="margin-top:12px"
        data-open-transaction="${escapeHTML(
          need.id
        )}"
        data-offer-id="${escapeHTML(
          offer.id
        )}"
      >
        🤝 Buka Transaksi
      </button>

    `;

  }


  return `

    <div class="history-card">

      <div class="history-main">

        <h3>
          👤 ${escapeHTML(
            offer.providerName ||
            "Penyedia"
          )}
        </h3>


        <div class="offer-price">
          Rp ${formatMoney(
            offer.price
          )}
        </div>


        <p>
          ${escapeHTML(
            offer.message ||
            ""
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


        ${actions}

      </div>


      <span class="status ${
        getOfferStatusClass(
          status
        )
      }">

        ${getOfferStatusText(
          status
        )}

      </span>

    </div>

  `;

}


// ============================================================
// UPDATE OFFER STATUS
//
// PENTING:
// Menggunakan writeBatch agar:
// offers/{offerId}
// dan
// needs/{needId}
// berhasil dalam SATU operasi.
// ============================================================

async function updateOfferStatus(
  need,
  offerId,
  newStatus
) {

  if (
    isUpdatingOffer ||
    !currentUser
  ) {
    return;
  }


  if (
    need.ownerId !==
    currentUser.uid
  ) {

    alert(
      "Anda tidak memiliki izin untuk mengubah penawaran ini."
    );

    return;

  }


  if (
    !need?.id ||
    !offerId
  ) {

    alert(
      "Data kebutuhan atau penawaran tidak ditemukan."
    );

    return;

  }


  isUpdatingOffer =
    true;


  try {

    // --------------------------------------------------------
    // REF
    // --------------------------------------------------------

    const needRef =
      doc(
        db,
        "needs",
        need.id
      );


    const offerRef =
      doc(
        db,
        "needs",
        need.id,
        "offers",
        offerId
      );


    // --------------------------------------------------------
    // AMBIL OFFER TERBARU
    // --------------------------------------------------------

    const offerSnapshot =
      await getDoc(
        offerRef
      );


    if (
      !offerSnapshot.exists()
    ) {

      throw new Error(
        "Penawaran tidak ditemukan."
      );

    }


    const offer =
      offerSnapshot.data();


    // --------------------------------------------------------
    // BATCH
    // --------------------------------------------------------

    const batch =
      writeBatch(
        db
      );


    // ========================================================
    // ACCEPTED
    // ========================================================

    if (
      newStatus === "accepted"
    ) {

      // Offer
      batch.update(
        offerRef,
        {

          status:
            "accepted",

          updatedAt:
            serverTimestamp()

        }
      );


      // Need
      batch.update(
        needRef,
        {

          status:
            "in_progress",

          acceptedOfferId:
            offerId,

          acceptedProviderId:
            offer.providerId ||
            "",

          acceptedPrice:
            Number(
              offer.price ||
              0
            ),

          updatedAt:
            serverTimestamp()

        }
      );


      // ------------------------------------------------------
      // TRANSACTION
      // ------------------------------------------------------

      const transactionId =
        createTransactionId(
          need.id,
          offerId
        );


      const transactionRef =
        doc(
          db,
          "transactions",
          transactionId
        );


      batch.set(
        transactionRef,
        {

          transactionId,

          needId:
            need.id,

          offerId,

          needTitle:
            need.title ||
            "Kebutuhan",

          ownerId:
            need.ownerId,

          providerId:
            offer.providerId ||
            "",

          ownerName:
            need.ownerName ||
            "Pemilik",

          providerName:
            offer.providerName ||
            "Penyedia",

          ownerEmail:
            need.ownerEmail ||
            "",

          providerEmail:
            offer.providerEmail ||
            "",

          price:
            Number(
              offer.price ||
              0
            ),

          duration:
            offer.duration ||
            "",

          status:
            "active",

          paymentStatus:
            "unpaid",

          workStatus:
            "waiting_payment",

          workCompleted:
            false,

          ownerConfirmed:
            false,

          providerConfirmed:
            false,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        },

        {
          merge: true
        }

      );

    }


    // ========================================================
    // REJECTED
    // ========================================================

    else if (
      newStatus === "rejected"
    ) {

      batch.update(
        offerRef,
        {

          status:
            "rejected",

          updatedAt:
            serverTimestamp()

        }
      );

    }


    // ========================================================
    // STATUS LAIN
    // ========================================================

    else {

      batch.update(
        offerRef,
        {

          status:
            newStatus,

          updatedAt:
            serverTimestamp()

        }
      );

    }


    // ========================================================
    // COMMIT
    // ========================================================

    await batch.commit();


    // ========================================================
    // SUCCESS
    // ========================================================

    if (
      newStatus === "accepted"
    ) {

      showToast(
        "🎉 Penawaran diterima dan transaksi dibuat!"
      );

    } else if (
      newStatus === "rejected"
    ) {

      showToast(
        "✕ Penawaran ditolak."
      );

    } else {

      showToast(
        "✅ Status penawaran diperbarui."
      );

    }


    // Refresh
    await loadIncomingOffers(
      need
    );


    // Update local cache
    const index =
      needsCache.findIndex(
        item =>
          item.id ===
          need.id
      );


    if (
      index !== -1 &&
      newStatus === "accepted"
    ) {

      needsCache[index] = {

        ...needsCache[index],

        status:
          "in_progress",

        acceptedOfferId:
          offerId,

        acceptedProviderId:
          offer.providerId ||
          "",

        acceptedPrice:
          Number(
            offer.price ||
            0
          )

      };

    }


  } catch (error) {

    console.error(
      "UPDATE OFFER ERROR:",
      error
    );


    alert(
      "Gagal mengubah status penawaran:\n\n" +
      error.message
    );

  } finally {

    isUpdatingOffer =
      false;

  }

}


// ============================================================
// OPEN OFFER FORM
// ============================================================

function openOfferForm(
  need
) {

  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  if (
    need.ownerId ===
    currentUser.uid
  ) {

    alert(
      "Anda tidak dapat mengirim penawaran ke kebutuhan sendiri."
    );

    return;

  }


  let modal =
    $("offerModal");


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "offerModal";

    modal.className =
      "modal hidden";

    document.body.appendChild(
      modal
    );

  }


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="offerBackdrop"
    ></div>


    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            PENAWARAN
          </span>

          <h2>
            💰 Ajukan Penawaran
          </h2>

          <p>
            ${escapeHTML(
              need.title ||
              "Kebutuhan"
            )}
          </p>

        </div>


        <button
          id="closeOffer"
          class="modal-close"
          type="button"
        >
          ×
        </button>

      </div>


      <form id="offerForm">

        <div class="form-group">

          <label>
            Harga Penawaran (Rp)
          </label>

          <input
            name="price"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            required
          >

        </div>


        <div class="form-group">

          <label>
            Lama Pengerjaan
          </label>

          <input
            name="duration"
            type="text"
            maxlength="100"
            placeholder="Contoh: 3 hari"
            required
          >

        </div>


        <div class="form-group">

          <label>
            Pesan Penawaran
          </label>

          <textarea
            name="message"
            rows="5"
            maxlength="2000"
            placeholder="Jelaskan penawaran Anda..."
            required
          ></textarea>

        </div>


        <div class="modal-actions">

          <button
            id="cancelOffer"
            type="button"
            class="btn btn-outline"
          >
            Batal
          </button>


          <button
            id="submitOffer"
            type="submit"
            class="btn btn-primary"
          >
            💰 Kirim Penawaran
          </button>

        </div>

      </form>

    </div>

  `;


  modal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );


  $("closeOffer")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "offerModal"
        )
    );


  $("cancelOffer")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "offerModal"
        )
    );


  $("offerBackdrop")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "offerModal"
        )
    );


  $("offerForm")
    ?.addEventListener(
      "submit",
      event =>
        submitOffer(
          event,
          need
        )
    );

}


// ============================================================
// SUBMIT OFFER
// ============================================================

async function submitOffer(
  event,
  need
) {

  event.preventDefault();


  if (
    isSubmittingOffer
  ) {
    return;
  }


  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  if (!need?.id) {

    alert(
      "Kebutuhan tidak ditemukan."
    );

    return;

  }


  if (
    need.ownerId ===
    currentUser.uid
  ) {

    alert(
      "Anda tidak dapat menawarkan kebutuhan sendiri."
    );

    return;

  }


  const form =
    event.target;


  const price =
    Number(
      form.price?.value ||
      0
    );


  const duration =
    String(
      form.duration?.value ||
      ""
    ).trim();


  const message =
    String(
      form.message?.value ||
      ""
    ).trim();


  if (
    !Number.isFinite(
      price
    ) ||
    price <= 0
  ) {

    alert(
      "Masukkan harga yang valid."
    );

    return;

  }


  if (!duration) {

    alert(
      "Masukkan lama pengerjaan."
    );

    return;

  }


  if (!message) {

    alert(
      "Masukkan pesan penawaran."
    );

    return;

  }


  isSubmittingOffer =
    true;


  const button =
    $("submitOffer");


  const original =
    button?.innerHTML ||
    "💰 Kirim Penawaran";


  if (button) {

    button.disabled =
      true;

    button.innerHTML =
      "⏳ Mengirim...";

  }


  try {

    await addDoc(

      collection(
        db,
        "needs",
        need.id,
        "offers"
      ),

      {

        providerId:
          currentUser.uid,

        providerName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Pengguna",

        providerEmail:
          currentUser.email ||
          "",

        providerPhoto:
          currentUser.photoURL ||
          "",

        needId:
          need.id,

        needTitle:
          need.title ||
          "Kebutuhan",

        price,

        duration,

        message,

        status:
          "pending",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }

    );


    form.reset();


    closeModal(
      "offerModal"
    );


    showToast(
      "🤝 Penawaran berhasil dikirim!"
    );


    const counter =
      $("userOffersCount");


    if (counter) {

      const old =
        Number(
          counter.textContent
        );


      if (
        Number.isFinite(
          old
        )
      ) {

        setText(
          "userOffersCount",
          old + 1
        );

      }

    }


  } catch (error) {

    console.error(
      "SUBMIT OFFER ERROR:",
      error
    );


    alert(
      "Gagal mengirim penawaran:\n\n" +
      error.message
    );

  } finally {

    isSubmittingOffer =
      false;


    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        original;

    }

  }

}


// ============================================================
// TRANSACTION ID
// ============================================================

function createTransactionId(
  needId,
  offerId
) {

  return (
    String(
      needId
    ) +
    "_" +
    String(
      offerId
    )
  );

}


// ============================================================
// OPEN TRANSACTION
// ============================================================

window.openTransaction =
  async function(
    transactionId
  ) {

    if (!currentUser) {

      window.location.href =
        "login.html";

      return;

    }


    if (!transactionId) {
      return;
    }


    try {

      const transactionRef =
        doc(
          db,
          "transactions",
          transactionId
        );


      const snapshot =
        await getDoc(
          transactionRef
        );


      if (!snapshot.exists()) {

        alert(
          "Transaksi belum ditemukan."
        );

        return;

      }


      const transaction = {

        id:
          snapshot.id,

        ...snapshot.data()

      };


      if (
        transaction.ownerId !==
        currentUser.uid &&
        transaction.providerId !==
        currentUser.uid
      ) {

        alert(
          "Anda tidak memiliki akses ke transaksi ini."
        );

        return;

      }


      showTransaction(
        transaction
      );


    } catch (error) {

      console.error(
        "OPEN TRANSACTION ERROR:",
        error
      );


      alert(
        "Gagal membuka transaksi:\n\n" +
        error.message
      );

    }

  };


// ============================================================
// OPEN TRANSACTION FROM NEED + OFFER
// ============================================================

async function openTransactionFromOffer(
  needId,
  offerId
) {

  const transactionId =
    createTransactionId(
      needId,
      offerId
    );


  await window.openTransaction(
    transactionId
  );

}


// ============================================================
// SHOW TRANSACTION
// ============================================================

function showTransaction(
  transaction
) {

  currentTransaction =
    transaction;


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


  const isOwner =
    transaction.ownerId ===
    currentUser.uid;


  const isProvider =
    transaction.providerId ===
    currentUser.uid;


  const paymentStatus =
    normalizePaymentStatus(
      transaction.paymentStatus
    );


  const workStatus =
    normalizeWorkStatus(
      transaction.workStatus
    );


  const transactionStatus =
    normalizeTransactionStatus(
      transaction.status
    );


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="transactionBackdrop"
    ></div>


    <div
      class="modal-content"
      style="max-width:900px"
    >

      <div class="modal-header">

        <div>

          <span class="section-label">
            TRANSAKSI
          </span>

          <h2>
            🤝 ${escapeHTML(
              transaction.needTitle ||
              "Transaksi"
            )}
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

        <!-- ============================================= -->
        <!-- TRANSACTION SUMMARY -->
        <!-- ============================================= -->

        <div style="
          background:#eff6ff;
          border-radius:14px;
          padding:18px;
          margin-bottom:18px;
        ">

          <div style="
            display:grid;
            grid-template-columns:
              repeat(auto-fit,minmax(150px,1fr));
            gap:15px;
          ">

            <div>

              <small>
                Nilai Transaksi
              </small>

              <strong style="
                display:block;
                font-size:22px;
                margin-top:4px;
              ">
                Rp ${formatMoney(
                  transaction.price
                )}
              </strong>

            </div>


            <div>

              <small>
                Pembayaran
              </small>

              <strong style="
                display:block;
                margin-top:4px;
              ">
                ${getPaymentStatusText(
                  paymentStatus
                )}
              </strong>

            </div>


            <div>

              <small>
                Pengerjaan
              </small>

              <strong style="
                display:block;
                margin-top:4px;
              ">
                ${getWorkStatusText(
                  workStatus
                )}
              </strong>

            </div>


            <div>

              <small>
                Transaksi
              </small>

              <strong style="
                display:block;
                margin-top:4px;
              ">
                ${getTransactionStatusText(
                  transactionStatus
                )}
              </strong>

            </div>

          </div>

        </div>


        <!-- ============================================= -->
        <!-- PARTIES -->
        <!-- ============================================= -->

        <div style="
          background:#f9fafb;
          border-radius:14px;
          padding:18px;
          margin-bottom:18px;
        ">

          <h3>
            👥 Pihak Transaksi
          </h3>

          <p>
            👤 Pemilik:
            <strong>
              ${escapeHTML(
                transaction.ownerName ||
                "Pemilik"
              )}
            </strong>
          </p>

          <p>
            🛠️ Penyedia:
            <strong>
              ${escapeHTML(
                transaction.providerName ||
                "Penyedia"
              )}
            </strong>
          </p>

        </div>


        <!-- ============================================= -->
        <!-- PAYMENT -->
        <!-- ============================================= -->

        <div style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          margin-bottom:18px;
        ">

          <h3>
            💳 Pembayaran
          </h3>

          <p>
            Status:
            <strong>
              ${getPaymentStatusText(
                paymentStatus
              )}
            </strong>
          </p>


          ${
            isOwner &&
            paymentStatus === "unpaid"
              ? `
                <button
                  id="payTransactionButton"
                  type="button"
                  class="btn btn-primary"
                >
                  💳 Bayar Sekarang
                </button>
              `
              : ""
          }


          ${
            isOwner &&
            paymentStatus === "pending"
              ? `
                <button
                  id="confirmPaymentButton"
                  type="button"
                  class="btn btn-primary"
                >
                  ✓ Konfirmasi Pembayaran
                </button>
              `
              : ""
          }


          ${
            paymentStatus === "paid"
              ? `
                <div style="
                  padding:12px;
                  border-radius:10px;
                  background:#ecfdf5;
                  color:#047857;
                  font-weight:700;
                ">
                  ✓ Pembayaran telah dikonfirmasi.
                </div>
              `
              : ""
          }

        </div>


        <!-- ============================================= -->
        <!-- WORK -->
        <!-- ============================================= -->

        <div style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          margin-bottom:18px;
        ">

          <h3>
            🔨 Pekerjaan
          </h3>

          <p>
            Status:
            <strong>
              ${getWorkStatusText(
                workStatus
              )}
            </strong>
          </p>


          ${
            isProvider &&
            paymentStatus === "paid" &&
            !transaction.workCompleted
              ? `
                <button
                  id="completeWorkButton"
                  type="button"
                  class="btn btn-primary"
                >
                  ✓ Selesaikan Pekerjaan
                </button>
              `
              : ""
          }


          ${
            transaction.workCompleted
              ? `
                <div style="
                  padding:12px;
                  border-radius:10px;
                  background:#ecfdf5;
                  color:#047857;
                  font-weight:700;
                ">
                  ✓ Penyedia menyatakan pekerjaan selesai.
                </div>
              `
              : ""
          }

        </div>


        <!-- ============================================= -->
        <!-- CONFIRMATION -->
        <!-- ============================================= -->

        <div style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          margin-bottom:18px;
        ">

          <h3>
            ✅ Konfirmasi Penyelesaian
          </h3>


          <div style="
            line-height:2;
          ">

            <div>
              ${
                transaction.ownerConfirmed
                  ? "✅"
                  : "⬜"
              }
              Pemilik
            </div>

            <div>
              ${
                transaction.providerConfirmed
                  ? "✅"
                  : "⬜"
              }
              Penyedia
            </div>

          </div>


          ${
            isOwner &&
            transaction.workCompleted &&
            !transaction.ownerConfirmed
              ? `
                <button
                  id="ownerConfirmButton"
                  type="button"
                  class="btn btn-primary"
                  style="margin-top:12px"
                >
                  ✓ Saya Konfirmasi Selesai
                </button>
              `
              : ""
          }


          ${
            isProvider &&
            transaction.workCompleted &&
            !transaction.providerConfirmed
              ? `
                <button
                  id="providerConfirmButton"
                  type="button"
                  class="btn btn-primary"
                  style="margin-top:12px"
                >
                  ✓ Saya Konfirmasi Selesai
                </button>
              `
              : ""
          }


          ${
            transaction.ownerConfirmed &&
            transaction.providerConfirmed
              ? `
                <div style="
                  margin-top:15px;
                  padding:14px;
                  border-radius:10px;
                  background:#ecfdf5;
                  color:#047857;
                  font-weight:800;
                ">
                  🎉 TRANSAKSI SELESAI
                </div>
              `
              : ""
          }

        </div>


        <!-- ============================================= -->
        <!-- CHAT -->
        <!-- ============================================= -->

        <div style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          overflow:hidden;
        ">

          <div style="
            padding:15px 18px;
            border-bottom:1px solid #e5e7eb;
          ">

            <h3 style="margin:0">
              💬 Chat Transaksi
            </h3>

          </div>


          <div
            id="transactionMessages"
            style="
              height:300px;
              overflow-y:auto;
              padding:15px;
              background:#f9fafb;
            "
          >

            Memuat chat...

          </div>


          <form
            id="transactionChatForm"
            style="
              display:flex;
              gap:8px;
              padding:12px;
              border-top:1px solid #e5e7eb;
            "
          >

            <input
              id="transactionMessageInput"
              type="text"
              maxlength="2000"
              placeholder="Tulis pesan..."
              autocomplete="off"
              style="
                flex:1;
                min-width:0;
              "
              required
            >


            <button
              id="sendTransactionMessage"
              type="submit"
              class="btn btn-primary"
            >
              Kirim
            </button>

          </form>

        </div>

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
      closeTransactionModal
    );


  $("transactionBackdrop")
    ?.addEventListener(
      "click",
      closeTransactionModal
    );


  $("payTransactionButton")
    ?.addEventListener(
      "click",
      () =>
        updatePaymentStatus(
          transaction,
          "pending"
        )
    );


  $("confirmPaymentButton")
    ?.addEventListener(
      "click",
      () =>
        updatePaymentStatus(
          transaction,
          "paid"
        )
    );


  $("completeWorkButton")
    ?.addEventListener(
      "click",
      () =>
        completeWork(
          transaction
        )
    );


  $("ownerConfirmButton")
    ?.addEventListener(
      "click",
      () =>
        confirmTransaction(
          transaction,
          "owner"
        )
    );


  $("providerConfirmButton")
    ?.addEventListener(
      "click",
      () =>
        confirmTransaction(
          transaction,
          "provider"
        )
    );


  $("transactionChatForm")
    ?.addEventListener(
      "submit",
      event =>
        sendTransactionMessage(
          event,
          transaction
        )
    );


  listenTransaction(
    transaction.id
  );


  listenMessages(
    transaction.id
  );

}


// ============================================================
// CLOSE TRANSACTION
// ============================================================

function closeTransactionModal() {

  if (unsubscribeTransaction) {

    unsubscribeTransaction();

    unsubscribeTransaction = null;

  }


  if (unsubscribeMessages) {

    unsubscribeMessages();

    unsubscribeMessages = null;

  }


  closeModal(
    "transactionModal"
  );

}


// ============================================================
// LISTEN TRANSACTION
// ============================================================

function listenTransaction(
  transactionId
) {

  if (unsubscribeTransaction) {

    unsubscribeTransaction();

  }


  const transactionRef =
    doc(
      db,
      "transactions",
      transactionId
    );


  unsubscribeTransaction =
    onSnapshot(

      transactionRef,

      snapshot => {

        if (
          !snapshot.exists()
        ) {
          return;
        }


        currentTransaction = {

          id:
            snapshot.id,

          ...snapshot.data()

        };


        renderTransactionLive(
          currentTransaction
        );

      },

      error => {

        console.error(
          "TRANSACTION LISTENER ERROR:",
          error
        );

      }

    );

}


// ============================================================
// RENDER LIVE TRANSACTION
// ============================================================

function renderTransactionLive(
  transaction
) {

  const modal =
    $("transactionModal");


  if (
    !modal ||
    modal.classList.contains(
      "hidden"
    )
  ) {
    return;
  }


  const paymentStatus =
    normalizePaymentStatus(
      transaction.paymentStatus
    );


  const workStatus =
    normalizeWorkStatus(
      transaction.workStatus
    );


  const status =
    normalizeTransactionStatus(
      transaction.status
    );


  const paymentBox =
    modal.querySelector(
      ".payment-status-live"
    );


  if (paymentBox) {

    paymentBox.textContent =
      getPaymentStatusText(
        paymentStatus
      );

  }


  // Tombol dapat berubah setelah
  // listener menerima update.
  //
  // Agar sederhana dan stabil,
  // pengguna bisa menutup dan membuka
  // transaksi kembali untuk mendapatkan
  // UI tombol terbaru.

}


// ============================================================
// PAYMENT
// ============================================================

async function updatePaymentStatus(
  transaction,
  newStatus
) {

  if (
    isUpdatingTransaction ||
    !currentUser
  ) {
    return;
  }


  if (
    transaction.ownerId !==
    currentUser.uid
  ) {

    alert(
      "Hanya pemilik kebutuhan yang dapat mengatur pembayaran."
    );

    return;

  }


  isUpdatingTransaction =
    true;


  try {

    const transactionRef =
      doc(
        db,
        "transactions",
        transaction.id
      );


    await updateDoc(
      transactionRef,
      {

        paymentStatus:
          newStatus,

        workStatus:
          newStatus === "paid"
            ? "in_progress"
            : "waiting_payment",

        updatedAt:
          serverTimestamp()

      }
    );


    showToast(
      newStatus === "paid"
        ? "✅ Pembayaran dikonfirmasi!"
        : "💳 Pembayaran dibuat."
    );


    // Refresh transaksi
    await window.openTransaction(
      transaction.id
    );


  } catch (error) {

    console.error(
      "PAYMENT ERROR:",
      error
    );


    alert(
      "Gagal mengubah status pembayaran:\n\n" +
      error.message
    );

  } finally {

    isUpdatingTransaction =
      false;

  }

}


// ============================================================
// COMPLETE WORK
// ============================================================

async function completeWork(
  transaction
) {

  if (
    isUpdatingTransaction ||
    !currentUser
  ) {
    return;
  }


  if (
    transaction.providerId !==
    currentUser.uid
  ) {

    alert(
      "Hanya penyedia yang dapat menyelesaikan pekerjaan."
    );

    return;

  }


  if (
    normalizePaymentStatus(
      transaction.paymentStatus
    ) !== "paid"
  ) {

    alert(
      "Pekerjaan belum dapat diselesaikan sebelum pembayaran dikonfirmasi."
    );

    return;

  }


  if (
    transaction.workCompleted
  ) {

    return;

  }


  if (
    !confirm(
      "Apakah pekerjaan benar-benar sudah selesai?"
    )
  ) {

    return;

  }


  isUpdatingTransaction =
    true;


  try {

    const transactionRef =
      doc(
        db,
        "transactions",
        transaction.id
      );


    await updateDoc(
      transactionRef,
      {

        workCompleted:
          true,

        workStatus:
          "completed",

        updatedAt:
          serverTimestamp()

      }
    );


    showToast(
      "✓ Pekerjaan ditandai selesai."
    );


    await window.openTransaction(
      transaction.id
    );


  } catch (error) {

    console.error(
      "COMPLETE WORK ERROR:",
      error
    );


    alert(
      "Gagal menyelesaikan pekerjaan:\n\n" +
      error.message
    );

  } finally {

    isUpdatingTransaction =
      false;

  }

}


// ============================================================
// CONFIRM TRANSACTION
// ============================================================

async function confirmTransaction(
  transaction,
  role
) {

  if (
    isUpdatingTransaction ||
    !currentUser
  ) {
    return;
  }


  const isOwner =
    role === "owner";


  const isProvider =
    role === "provider";


  if (
    isOwner &&
    transaction.ownerId !==
    currentUser.uid
  ) {

    alert(
      "Anda bukan pemilik transaksi."
    );

    return;

  }


  if (
    isProvider &&
    transaction.providerId !==
    currentUser.uid
  ) {

    alert(
      "Anda bukan penyedia transaksi."
    );

    return;

  }


  if (
    !transaction.workCompleted
  ) {

    alert(
      "Pekerjaan belum ditandai selesai oleh penyedia."
    );

    return;

  }


  const field =
    isOwner
      ? "ownerConfirmed"
      : "providerConfirmed";


  isUpdatingTransaction =
    true;


  try {

    const transactionRef =
      doc(
        db,
        "transactions",
        transaction.id
      );


    const updateData = {

      [field]:
        true,

      updatedAt:
        serverTimestamp()

    };


    // Jika pihak lain sudah konfirmasi,
    // transaksi otomatis selesai.

    const otherConfirmed =
      isOwner
        ? transaction.providerConfirmed
        : transaction.ownerConfirmed;


    if (
      otherConfirmed
    ) {

      updateData.status =
        "completed";

      updateData.workStatus =
        "completed";

    }


    await updateDoc(
      transactionRef,
      updateData
    );


    showToast(
      otherConfirmed
        ? "🎉 Transaksi selesai!"
        : "✅ Konfirmasi berhasil."
    );


    await window.openTransaction(
      transaction.id
    );


  } catch (error) {

    console.error(
      "CONFIRM TRANSACTION ERROR:",
      error
    );


    alert(
      "Gagal melakukan konfirmasi:\n\n" +
      error.message
    );

  } finally {

    isUpdatingTransaction =
      false;

  }

}


// ============================================================
// CHAT LISTENER
// ============================================================

function listenMessages(
  transactionId
) {

  if (unsubscribeMessages) {

    unsubscribeMessages();

  }


  const messagesRef =
    collection(
      db,
      "transactions",
      transactionId,
      "messages"
    );


  const messagesQuery =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "asc"
      ),
      limit(100)
    );


  unsubscribeMessages =
    onSnapshot(

      messagesQuery,

      snapshot => {

        const messages = [];


        snapshot.forEach(
          item => {

            messages.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        renderMessages(
          messages
        );

      },

      error => {

        console.error(
          "CHAT ERROR:",
          error
        );


        const container =
          $("transactionMessages");


        if (container) {

          container.innerHTML = `

            <div style="
              padding:15px;
              color:#dc2626;
            ">
              ⚠️ Gagal memuat chat.
              <br>
              ${escapeHTML(
                error.message
              )}
            </div>

          `;

        }

      }

    );

}


// ============================================================
// RENDER CHAT
// ============================================================

function renderMessages(
  messages
) {

  const container =
    $("transactionMessages");


  if (!container) {
    return;
  }


  if (!messages.length) {

    container.innerHTML = `

      <div style="
        text-align:center;
        padding:40px 15px;
        color:#6b7280;
      ">

        💬 Belum ada pesan.

        <br>

        Mulai percakapan dengan pihak transaksi.

      </div>

    `;

    return;

  }


  container.innerHTML =
    messages
      .map(
        message => {

          const mine =
            message.senderId ===
            currentUser?.uid;


          return `

            <div style="
              display:flex;
              justify-content:${
                mine
                  ? "flex-end"
                  : "flex-start"
              };
              margin-bottom:10px;
            ">

              <div style="
                max-width:80%;
                padding:10px 13px;
                border-radius:14px;
                background:${
                  mine
                    ? "#2563eb"
                    : "#ffffff"
                };
                color:${
                  mine
                    ? "#ffffff"
                    : "#111827"
                };
                box-shadow:
                  0 1px 3px
                  rgba(0,0,0,.08);
              ">

                <div style="
                  font-size:11px;
                  opacity:.7;
                  margin-bottom:4px;
                ">
                  ${escapeHTML(
                    message.senderName ||
                    "Pengguna"
                  )}
                </div>


                <div style="
                  white-space:pre-wrap;
                  word-break:break-word;
                ">
                  ${escapeHTML(
                    message.text ||
                    ""
                  )}
                </div>


                <div style="
                  font-size:10px;
                  opacity:.6;
                  margin-top:5px;
                ">
                  ${formatTime(
                    message.createdAt
                  )}
                </div>

              </div>

            </div>

          `;

        }
      )
      .join("");


  container.scrollTop =
    container.scrollHeight;

}


// ============================================================
// SEND CHAT MESSAGE
// ============================================================

async function sendTransactionMessage(
  event,
  transaction
) {

  event.preventDefault();


  if (
    isSendingMessage ||
    !currentUser
  ) {
    return;
  }


  if (
    transaction.ownerId !==
    currentUser.uid &&
    transaction.providerId !==
    currentUser.uid
  ) {

    alert(
      "Anda tidak memiliki akses ke chat ini."
    );

    return;

  }


  const input =
    $("transactionMessageInput");


  const button =
    $("sendTransactionMessage");


  const text =
    String(
      input?.value ||
      ""
    ).trim();


  if (!text) {
    return;
  }


  isSendingMessage =
    true;


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Mengirim...";

  }


  try {

    await addDoc(

      collection(
        db,
        "transactions",
        transaction.id,
        "messages"
      ),

      {

        senderId:
          currentUser.uid,

        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Pengguna",

        senderEmail:
          currentUser.email ||
          "",

        text,

        createdAt:
          serverTimestamp()

      }

    );


    if (input) {

      input.value =
        "";

      input.focus();

    }

  } catch (error) {

    console.error(
      "SEND MESSAGE ERROR:",
      error
    );


    alert(
      "Gagal mengirim pesan:\n\n" +
      error.message
    );

  } finally {

    isSendingMessage =
      false;


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Kirim";

    }

  }

}


// ============================================================
// NEED MODAL
// ============================================================

function openNeedModal() {

  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  const modal =
    $("needModal");


  if (!modal) {
    return;
  }


  modal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );

}


function closeNeedModal() {

  closeModal(
    "needModal"
  );

}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeModal(
  id
) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  modal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "modal-open"
  );

}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  try {

    await signOut(
      auth
    );


    window.location.href =
      "login.html";


  } catch (error) {

    alert(
      "Gagal logout:\n" +
      error.message
    );

  }

}


// ============================================================
// PROFILE
// ============================================================

function openProfile() {

  window.location.href =
    "profile.html";

}


// ============================================================
// OPEN NEED FROM URL
// ============================================================

function openNeedFromURL() {

  if (!authReady) {
    return;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const needId =
    params.get(
      "need"
    );


  if (!needId) {
    return;
  }


  window.openNeedDetail(
    needId
  );


  window.history.replaceState(
    {},
    document.title,
    "index.html"
  );

}


// ============================================================
// NEED STATUS
// ============================================================

function normalizeNeedStatus(
  status
) {

  const value =
    String(
      status ||
      "open"
    ).toLowerCase();


  if (
    value === "in_progress" ||
    value === "in-progress" ||
    value === "progress" ||
    value === "dikerjakan"
  ) {

    return "in_progress";

  }


  if (
    value === "completed" ||
    value === "complete" ||
    value === "selesai"
  ) {

    return "completed";

  }


  if (
    value === "cancelled" ||
    value === "canceled" ||
    value === "dibatalkan"
  ) {

    return "cancelled";

  }


  return "open";

}


function getNeedStatusText(
  status
) {

  switch (
    normalizeNeedStatus(
      status
    )
  ) {

    case "in_progress":
      return "🔨 Dalam Pengerjaan";

    case "completed":
      return "✓ Selesai";

    case "cancelled":
      return "✕ Dibatalkan";

    default:
      return "🟢 Dibuka";

  }

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


function getOfferStatusClass(
  status
) {

  switch (
    normalizeOfferStatus(
      status
    )
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
    normalizeOfferStatus(
      status
    )
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
// TRANSACTION STATUS
// ============================================================

function normalizeTransactionStatus(
  status
) {

  const value =
    String(
      status ||
      "active"
    ).toLowerCase();


  if (
    value === "completed" ||
    value === "complete" ||
    value === "selesai"
  ) {

    return "completed";

  }


  if (
    value === "cancelled" ||
    value === "canceled"
  ) {

    return "cancelled";

  }


  return "active";

}


function getTransactionStatusText(
  status
) {

  switch (
    normalizeTransactionStatus(
      status
    )
  ) {

    case "completed":
      return "🎉 Selesai";

    case "cancelled":
      return "✕ Dibatalkan";

    default:
      return "🔵 Aktif";

  }

}


// ============================================================
// PAYMENT STATUS
// ============================================================

function normalizePaymentStatus
