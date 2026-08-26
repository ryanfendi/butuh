// ============================================================
// BUTUH - SCRIPT.JS
// VERSI MARKETPLACE TRANSAKSI
//
// ALUR:
// Kebutuhan
// -> Penawaran
// -> Terima
// -> Transaksi
// -> Chat
// -> Pekerjaan
// -> Selesai
// -> Konfirmasi
// -> Pembayaran
//
// Firebase SDK 12.1.0
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
  apiKey: "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",
  authDomain: "butuhin.firebaseapp.com",
  projectId: "butuhin",
  storageBucket: "butuhin.firebasestorage.app",
  messagingSenderId: "331896660506",
  appId: "1:331896660506:web:7a03f433101b81dd74e7a3"
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

let currentDetailNeed = null;

let currentTransaction = null;

let unsubscribeNeeds = null;

let unsubscribeChat = null;

let isSubmittingNeed = false;

let isSubmittingOffer = false;

let isUpdatingOffer = false;

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

    currentUser = user;

    authReady = true;

    updateUserUI(user);

    if (user) {

      loadNeeds();

      openNeedFromURL();

    } else {

      if (unsubscribeNeeds) {

        unsubscribeNeeds();

        unsubscribeNeeds = null;

      }

      if (unsubscribeChat) {

        unsubscribeChat();

        unsubscribeChat = null;

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
            getTime(b.createdAt) -
            getTime(a.createdAt)
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

          <div class="loading-box">

            <div class="empty-icon">
              ⚠️
            </div>

            <strong>
              Gagal memuat kebutuhan
            </strong>

            <small>
              ${escapeHTML(
                error.message ||
                "Terjadi kesalahan."
              )}
            </small>

            <button
              id="retryNeedsBtn"
              class="btn btn-primary"
              type="button"
              style="margin-top:15px"
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

function renderNeeds(needs) {

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
          createNeedCard(need)
      )
      .join("");

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedCard(need) {

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
    String(
      need.status ||
      "open"
    ).toLowerCase();


  const isOpen =
    status === "open" ||
    status === "active" ||
    status === "aktif";


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
              : "btn-primary"
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

function updateBasicCounters(needs) {

  const active =
    needs.filter(
      need => {

        const status =
          String(
            need.status ||
            "open"
          ).toLowerCase();


        return (
          status === "open" ||
          status === "active" ||
          status === "aktif"
        );

      }
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
// COUNT OFFERS
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

async function submitNeed(event) {

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
    !Number.isFinite(budget) ||
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


    const cached =
      needsCache.find(
        need =>
          need.id ===
          needId
      );


    if (cached) {

      showNeedDetail(
        cached
      );

      return;
    }


    try {

      const ref =
        doc(
          db,
          "needs",
          needId
        );


      const snap =
        await getDoc(
          ref
        );


      if (!snap.exists()) {

        alert(
          "Kebutuhan tidak ditemukan."
        );

        return;
      }


      showNeedDetail({

        id:
          snap.id,

        ...snap.data()

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


  const status =
    String(
      need.status ||
      "open"
    ).toLowerCase();


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
          ${escapeHTML(
            getNeedStatusText(
              status
            )
          )}

        </div>


        ${
          isOwner
            ? `

              <div style="
                margin-top:25px
              ">

                <h3>
                  💰 Penawaran Masuk
                </h3>

                <div id="incomingOffersList">

                  <div class="loading-state">

                    <div class="spinner"></div>

                    Memuat penawaran...

                  </div>

                </div>

              </div>

            `
            : status === "open"
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
                  padding:15px;
                  border-radius:12px;
                  background:#f3f4f6;
                ">
                  🔒 Kebutuhan ini sudah tidak
                  menerima penawaran.
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

  } else {

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
        getTime(b.createdAt) -
        getTime(a.createdAt)
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
            Belum ada penyedia yang
            mengajukan penawaran.
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
// OFFER CARD
// ============================================================

function createIncomingOfferCard(
  need,
  offer
) {

  const status =
    normalizeStatus(
      offer.status
    );


  let actions = "";


  if (
    status === "pending" &&
    need.status === "open"
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

      <div style="
        margin-top:14px;
      ">

        <button
          type="button"
          class="btn btn-primary"
          data-transaction-action="open"
          data-need-id="${escapeHTML(
            need.id
          )}"
          data-offer-id="${escapeHTML(
            offer.id
          )}"
        >
          💬 Buka Transaksi & Chat
        </button>

      </div>

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
        getStatusClass(status)
      }">

        ${getStatusText(status)}

      </span>

    </div>

  `;

}


// ============================================================
// UPDATE OFFER STATUS
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
      "Anda bukan pemilik kebutuhan ini."
    );

    return;
  }


  isUpdatingOffer =
    true;


  try {

    const user =
      auth.currentUser;


    if (!user) {

      throw new Error(
        "Sesi login telah berakhir."
      );

    }


    const needRef =
      doc(
        db,
        "needs",
        need.id
      );


    const needSnapshot =
      await getDoc(
        needRef
      );


    if (!needSnapshot.exists()) {

      throw new Error(
        "Kebutuhan tidak ditemukan."
      );

    }


    const latestNeed =
      needSnapshot.data();


    if (
      latestNeed.ownerId !==
      user.uid
    ) {

      throw new Error(
        "Anda bukan pemilik kebutuhan."
      );

    }


    const offerRef =
      doc(
        db,
        "needs",
        need.id,
        "offers",
        offerId
      );


    const offerSnapshot =
      await getDoc(
        offerRef
      );


    if (!offerSnapshot.exists()) {

      throw new Error(
        "Penawaran tidak ditemukan."
      );

    }


    const offer =
      offerSnapshot.data();


    // --------------------------------------------------------
    // ACCEPT
    // --------------------------------------------------------

    if (
      newStatus ===
      "accepted"
    ) {

      const batch =
        writeBatch(db);


      batch.update(
        offerRef,
        {

          status:
            "accepted",

          acceptedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      batch.update(
        needRef,
        {

          status:
            "in_progress",

          acceptedOfferId:
            offerId,

          acceptedProviderId:
            offer.providerId,

          acceptedProviderName:
            offer.providerName ||
            "Penyedia",

          acceptedPrice:
            Number(
              offer.price ||
              0
            ),

          updatedAt:
            serverTimestamp()

        }
      );


      // Tolak otomatis penawaran lain
      const offersSnapshot =
        await getDocs(
          collection(
            db,
            "needs",
            need.id,
            "offers"
          )
        );


      offersSnapshot.forEach(
        item => {

          if (
            item.id !==
            offerId
          ) {

            const data =
              item.data();


            if (
              normalizeStatus(
                data.status
              ) ===
              "pending"
            ) {

              batch.update(
                item.ref,
                {

                  status:
                    "rejected",

                  updatedAt:
                    serverTimestamp()

                }
              );

            }

          }

        }
      );


      await batch.commit();


      showToast(
        "🎉 Penawaran diterima! Pekerjaan dimulai."
      );


      await loadIncomingOffers(
        {
          ...need,
          status:
            "in_progress"
        }
      );


      return;

    }


    // --------------------------------------------------------
    // REJECT
    // --------------------------------------------------------

    if (
      newStatus ===
      "rejected"
    ) {

      await updateDoc(
        offerRef,
        {

          status:
            "rejected",

          updatedAt:
            serverTimestamp()

        }
      );


      showToast(
        "✕ Penawaran ditolak."
      );


      await loadIncomingOffers(
        need
      );


      return;

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
      "Anda tidak dapat menawarkan kebutuhan sendiri."
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
    isSubmittingOffer ||
    !currentUser
  ) {
    return;
  }


  if (!need?.id) {

    alert(
      "Kebutuhan tidak ditemukan."
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
    !Number.isFinite(price) ||
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

    const user =
      auth.currentUser;


    if (!user) {

      throw new Error(
        "Sesi login telah berakhir."
      );

    }


    const needRef =
      doc(
        db,
        "needs",
        need.id
      );


    const needSnapshot =
      await getDoc(
        needRef
      );


    if (!needSnapshot.exists()) {

      throw new Error(
        "Kebutuhan tidak ditemukan."
      );

    }


    const latestNeed =
      needSnapshot.data();


    if (
      latestNeed.ownerId ===
      user.uid
    ) {

      throw new Error(
        "Anda tidak dapat menawarkan kebutuhan sendiri."
      );

    }


    const status =
      String(
        latestNeed.status ||
        "open"
      ).toLowerCase();


    if (
      status !== "open" &&
      status !== "active" &&
      status !== "aktif"
    ) {

      throw new Error(
        "Kebutuhan ini sudah tidak menerima penawaran."
      );

    }


    const offersRef =
      collection(
        db,
        "needs",
        need.id,
        "offers"
      );


    await addDoc(
      offersRef,
      {

        providerId:
          user.uid,

        providerName:
          user.displayName ||
          user.email?.split("@")[0] ||
          "Pengguna",

        providerEmail:
          user.email ||
          "",

        providerPhoto:
          user.photoURL ||
          "",

        needId:
          need.id,

        needTitle:
          latestNeed.title ||
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
// TRANSACTION
// ============================================================

async function openTransaction(
  needId,
  offerId
) {

  if (!currentUser) {
    return;
  }


  try {

    const needRef =
      doc(
        db,
        "needs",
        needId
      );


    const offerRef =
      doc(
        db,
        "needs",
        needId,
        "offers",
        offerId
      );


    const [
      needSnap,
      offerSnap
    ] =
      await Promise.all([
        getDoc(needRef),
        getDoc(offerRef)
      ]);


    if (
      !needSnap.exists() ||
      !offerSnap.exists()
    ) {

      throw new Error(
        "Data transaksi tidak ditemukan."
      );

    }


    const need =
      needSnap.data();


    const offer =
      offerSnap.data();


    if (
      offer.status !==
      "accepted"
    ) {

      throw new Error(
        "Penawaran ini belum diterima."
      );

    }


    const isOwner =
      need.ownerId ===
      currentUser.uid;


    const isProvider =
      offer.providerId ===
      currentUser.uid;


    if (
      !isOwner &&
      !isProvider
    ) {

      throw new Error(
        "Anda tidak memiliki akses ke transaksi ini."
      );

    }


    // --------------------------------------------------------
    // CARI TRANSAKSI
    // --------------------------------------------------------

    const transactionRef =
      doc(
        db,
        "needs",
        needId,
        "transactions",
        offerId
      );


    const transactionSnap =
      await getDoc(
        transactionRef
      );


    if (!transactionSnap.exists()) {

      await updateDoc(
        offerRef,
        {

          transactionId:
            offerId,

          updatedAt:
            serverTimestamp()

        }
      ).catch(
        () => {}
      );


      // Tidak bisa create lewat updateDoc
      // jika transaction belum ada.
      // Gunakan addDoc dengan ID tetap melalui setDoc
      // pada versi ini kita menggunakan dynamic import.
    }


    await createTransactionIfNeeded(
      needId,
      offerId,
      need,
      offer
    );


    await showTransactionModal(
      needId,
      offerId
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

}


// ============================================================
// CREATE TRANSACTION
// ============================================================

async function createTransactionIfNeeded(
  needId,
  offerId,
  need,
  offer
) {

  const transactionRef =
    doc(
      db,
      "needs",
      needId,
      "transactions",
      offerId
    );


  const snapshot =
    await getDoc(
      transactionRef
    );


  if (
    snapshot.exists()
  ) {
    return;
  }


  // Karena setDoc belum di-import pada awal file,
  // gunakan update melalui batch setelah membuat data
  // tidak dapat dilakukan untuk dokumen baru.
  //
  // Kita tambahkan dokumen menggunakan addDoc ke
  // transactions, kemudian ID disimpan pada offer.

  const transactionsRef =
    collection(
      db,
      "needs",
      needId,
      "transactions"
    );


  const existing =
    await getDocs(
      query(
        transactionsRef,
        where(
          "offerId",
          "==",
          offerId
        ),
        limit(1)
      )
    );


  if (!existing.empty) {
    return;
  }


  await addDoc(
    transactionsRef,
    {

      offerId,

      needId,

      ownerId:
        need.ownerId,

      providerId:
        offer.providerId,

      ownerName:
        need.ownerName ||
        "Pemilik",

      providerName:
        offer.providerName ||
        "Penyedia",

      title:
        need.title ||
        offer.needTitle ||
        "Transaksi",

      price:
        Number(
          offer.price ||
          0
        ),

      duration:
        offer.duration ||
        "",

      status:
        "in_progress",

      providerCompleted:
        false,

      ownerConfirmed:
        false,

      paymentStatus:
        "unpaid",

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()

    }
  );

}


// ============================================================
// SHOW TRANSACTION
// ============================================================

async function showTransactionModal(
  needId,
  offerId
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


  const transactionsRef =
    collection(
      db,
      "needs",
      needId,
      "transactions"
    );


  const q =
    query(
      transactionsRef,
      where(
        "offerId",
        "==",
        offerId
      ),
      limit(1)
    );


  const snapshot =
    await getDocs(q);


  if (snapshot.empty) {

    throw new Error(
      "Transaksi belum tersedia."
    );

  }


  const item =
    snapshot.docs[0];


  currentTransaction = {

    id:
      item.id,

    ...item.data()

  };


  renderTransactionModal(
    modal,
    currentTransaction
  );


  modal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );


  startTransactionListeners(
    needId,
    currentTransaction.id
  );

}


// ============================================================
// TRANSACTION MODAL
// ============================================================

function renderTransactionModal(
  modal,
  transaction
) {

  const isOwner =
    transaction.ownerId ===
    currentUser?.uid;


  const isProvider =
    transaction.providerId ===
    currentUser?.uid;


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="transactionBackdrop"
    ></div>


    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            TRANSAKSI BUTUH
          </span>

          <h2>
            🤝 ${escapeHTML(
              transaction.title
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


      <div style="padding:18px">


        <div style="
          background:#eff6ff;
          padding:16px;
          border-radius:14px;
          margin-bottom:15px;
        ">

          <strong>
            💰 Nilai Transaksi
          </strong>

          <div style="
            font-size:25px;
            font-weight:800;
            margin-top:5px;
          ">

            Rp ${formatMoney(
              transaction.price
            )}

          </div>

        </div>


        <div id="transactionStatusBox">

          ${renderTransactionStatus(
            transaction
          )}

        </div>


        <hr style="
          margin:20px 0;
          border:none;
          border-top:1px solid #e5e7eb;
        ">


        <h3>
          💬 Chat
        </h3>


        <div
          id="transactionMessages"
          style="
            height:250px;
            overflow-y:auto;
            background:#f9fafb;
            border-radius:12px;
            padding:12px;
            margin:10px 0;
          "
        >

          <div>
            Memuat chat...
          </div>

        </div>


        <form
          id="transactionChatForm"
          style="
            display:flex;
            gap:8px;
          "
        >

          <input
            id="transactionMessageInput"
            type="text"
            maxlength="2000"
            placeholder="Tulis pesan..."
            required
            style="
              flex:1;
              padding:12px;
              border:1px solid #d1d5db;
              border-radius:10px;
            "
          >


          <button
            type="submit"
            class="btn btn-primary"
          >
            Kirim
          </button>

        </form>


        <div
          id="transactionActions"
          style="
            margin-top:18px;
          "
        >

          ${renderTransactionActions(
            transaction,
            isOwner,
            isProvider
          )}

        </div>


      </div>

    </div>

  `;


  $("closeTransaction")
    ?.addEventListener(
      "click",
      closeTransaction
    );


  $("transactionBackdrop")
    ?.addEventListener(
      "click",
      closeTransaction
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


  document
    .querySelectorAll(
      "[data-transaction-action]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            await handleTransactionAction(
              button.dataset.transactionAction,
              transaction
            );

          }
        );

      }
    );

}


// ============================================================
// TRANSACTION STATUS
// ============================================================

function renderTransactionStatus(
  transaction
) {

  const payment =
    transaction.paymentStatus ||
    "unpaid";


  return `

    <div style="
      display:grid;
      gap:8px;
    ">

      <div>
        📌 Status:
        <strong>
          ${escapeHTML(
            getTransactionStatusText(
              transaction
            )
          )}
        </strong>
      </div>


      <div>
        👨‍💻 Penyedia:
        ${escapeHTML(
          transaction.providerName
        )}
      </div>


      <div>
        💳 Pembayaran:
        <strong>
          ${escapeHTML(
            getPaymentStatusText(
              payment
            )
          )}
        </strong>
      </div>


      <div>
        ${
          transaction.providerCompleted
            ? "✅"
            : "⏳"
        }
        Penyedia menyelesaikan pekerjaan
      </div>


      <div>
        ${
          transaction.ownerConfirmed
            ? "✅"
            : "⏳"
        }
        Pemilik mengonfirmasi pekerjaan
      </div>

    </div>

  `;

}


// ============================================================
// TRANSACTION ACTIONS
// ============================================================

function renderTransactionActions(
  transaction,
  isOwner,
  isProvider
) {

  let html = "";


  if (
    isProvider &&
    !transaction.providerCompleted
  ) {

    html += `

      <button
        type="button"
        class="btn btn-primary"
        data-transaction-action="provider_complete"
        style="
          width:100%;
          margin-bottom:8px;
        "
      >
        ✅ Selesaikan Pekerjaan
      </button>

    `;

  }


  if (
    isOwner &&
    transaction.providerCompleted &&
    !transaction.ownerConfirmed
  ) {

    html += `

      <button
        type="button"
        class="btn btn-primary"
        data-transaction-action="owner_confirm"
        style="
          width:100%;
          margin-bottom:8px;
        "
      >
        ✅ Konfirmasi Pekerjaan Selesai
      </button>

    `;

  }


  if (
    isOwner &&
    transaction.ownerConfirmed &&
    transaction.paymentStatus !== "paid"
  ) {

    html += `

      <button
        type="button"
        class="btn btn-primary"
        data-transaction-action="create_payment"
        style="
          width:100%;
          margin-bottom:8px;
        "
      >
        💳 Buat Pembayaran
      </button>

    `;

  }


  if (
    isOwner &&
    transaction.paymentStatus === "pending"
  ) {

    html += `

      <button
        type="button"
        class="btn btn-primary"
        data-transaction-action="confirm_payment"
        style="
          width:100%;
          margin-bottom:8px;
        "
      >
        💳 Konfirmasi Pembayaran
      </button>

    `;

  }


  if (
    transaction.paymentStatus ===
      "paid" &&
    transaction.providerCompleted &&
    transaction.ownerConfirmed
  ) {

    html += `

      <div style="
        padding:14px;
        border-radius:12px;
        background:#dcfce7;
        color:#166534;
        font-weight:700;
      ">

        🎉 Transaksi selesai!

      </div>

    `;

  }


  if (!html) {

    html = `

      <div style="
        padding:12px;
        background:#f3f4f6;
        border-radius:10px;
      ">

        ⏳ Menunggu proses berikutnya.

      </div>

    `;

  }


  return html;

}


// ============================================================
// TRANSACTION ACTION
// ============================================================

async function handleTransactionAction(
  action,
  transaction
) {

  if (
    isUpdatingTransaction ||
    !currentUser
  ) {
    return;
  }


  isUpdatingTransaction =
    true;


  try {

    const ref =
      doc(
        db,
        "needs",
        transaction.needId,
        "transactions",
        transaction.id
      );


    const snap =
      await getDoc(ref);


    if (!snap.exists()) {

      throw new Error(
        "Transaksi tidak ditemukan."
      );

    }


    const latest =
      snap.data();


    // --------------------------------------------------------
    // PROVIDER COMPLETE
    // --------------------------------------------------------

    if (
      action ===
      "provider_complete"
    ) {

      if (
        latest.providerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Hanya penyedia yang dapat menyelesaikan pekerjaan."
        );

      }


      await updateDoc(
        ref,
        {

          providerCompleted:
            true,

          status:
            "waiting_confirmation",

          providerCompletedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      showToast(
        "✅ Pekerjaan ditandai selesai."
      );

    }


    // --------------------------------------------------------
    // OWNER CONFIRM
    // --------------------------------------------------------

    else if (
      action ===
      "owner_confirm"
    ) {

      if (
        latest.ownerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Hanya pemilik yang dapat mengonfirmasi."
        );

      }


      await updateDoc(
        ref,
        {

          ownerConfirmed:
            true,

          status:
            "awaiting_payment",

          ownerConfirmedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      showToast(
        "✅ Pekerjaan dikonfirmasi selesai."
      );

    }


    // --------------------------------------------------------
    // CREATE PAYMENT
    // --------------------------------------------------------

    else if (
      action ===
      "create_payment"
    ) {

      if (
        latest.ownerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Hanya pemilik yang dapat membuat pembayaran."
        );

      }


      await createPayment(
        latest
      );


      showToast(
        "💳 Pembayaran dibuat."
      );

    }


    // --------------------------------------------------------
    // CONFIRM PAYMENT
    // --------------------------------------------------------

    else if (
      action ===
      "confirm_payment"
    ) {

      if (
        latest.ownerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Hanya pemilik yang dapat mengonfirmasi pembayaran."
        );

      }


      const paymentRef =
        collection(
          db,
          "needs",
          latest.needId,
          "transactions",
          latest.id,
          "payments"
        );


      const paymentSnapshot =
        await getDocs(
          query(
            paymentRef,
            where(
              "status",
              "==",
              "pending"
            ),
            limit(1)
          )
        );


      if (
        paymentSnapshot.empty
      ) {

        throw new Error(
          "Pembayaran pending tidak ditemukan."
        );

      }


      const paymentDoc =
        paymentSnapshot.docs[0];


      await updateDoc(
        paymentDoc.ref,
        {

          status:
            "paid",

          paidAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      await updateDoc(
        ref,
        {

          paymentStatus:
            "paid",

          status:
            "completed",

          paidAt:
            serverTimestamp(),

          completedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      const needRef =
        doc(
          db,
          "needs",
          latest.needId
        );


      await updateDoc(
        needRef,
        {

          status:
            "completed",

          completedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      showToast(
        "🎉 Pembayaran dikonfirmasi. Transaksi selesai!"
      );

    }


    await refreshTransaction(
      transaction
    );


  } catch (error) {

    console.error(
      "TRANSACTION ACTION ERROR:",
      error
    );


    alert(
      "Gagal memproses transaksi:\n\n" +
      error.message
    );

  } finally {

    isUpdatingTransaction =
      false;

  }

}


// ============================================================
// CREATE PAYMENT
// ============================================================

async function createPayment(
  transaction
) {

  const paymentsRef =
    collection(
      db,
      "needs",
      transaction.needId,
      "transactions",
      transaction.id,
      "payments"
    );


  const pending =
    await getDocs(
      query(
        paymentsRef,
        where(
          "status",
          "==",
          "pending"
        ),
        limit(1)
      )
    );


  if (!pending.empty) {

    return;

  }


  await addDoc(
    paymentsRef,
    {

      transactionId:
        transaction.id,

      needId:
        transaction.needId,

      ownerId:
        transaction.ownerId,

      providerId:
        transaction.providerId,

      amount:
        Number(
          transaction.price ||
          0
        ),

      currency:
        "IDR",

      method:
        "manual",

      status:
        "pending",

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()

    }
  );


  const transactionRef =
    doc(
      db,
      "needs",
      transaction.needId,
      "transactions",
      transaction.id
    );


  await updateDoc(
    transactionRef,
    {

      paymentStatus:
        "pending",

      updatedAt:
        serverTimestamp()

    }
  );

}


// ============================================================
// REFRESH TRANSACTION
// ============================================================

async function refreshTransaction(
  transaction
) {

  const ref =
    doc(
      db,
      "needs",
      transaction.needId,
      "transactions",
      transaction.id
    );


  const snap =
    await getDoc(ref);


  if (!snap.exists()) {
    return;
  }


  currentTransaction = {

    id:
      snap.id,

    ...snap.data()

  };


  const modal =
    $("transactionModal");


  if (!modal) {
    return;
  }


  const statusBox =
    $("transactionStatusBox");


  if (statusBox) {

    statusBox.innerHTML =
      renderTransactionStatus(
        currentTransaction
      );

  }


  const actions =
    $("transactionActions");


  if (actions) {

    actions.innerHTML =
      renderTransactionActions(
        currentTransaction,
        currentTransaction.ownerId ===
          currentUser?.uid,
        currentTransaction.providerId ===
          currentUser?.uid
      );


    actions
      .querySelectorAll(
        "[data-transaction-action]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async () => {

              await handleTransactionAction(
                button.dataset.transactionAction,
                currentTransaction
              );

            }
          );

        }
      );

  }

}


// ============================================================
// CHAT LISTENER
// ============================================================

function startTransactionListeners(
  needId,
  transactionId
) {

  if (unsubscribeChat) {

    unsubscribeChat();

    unsubscribeChat = null;

  }


  const messagesRef =
    collection(
      db,
      "needs",
      needId,
      "transactions",
      transactionId,
      "messages"
    );


  const q =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "asc"
      ),
      limit(100)
    );


  unsubscribeChat =
    onSnapshot(
      q,
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


        const box =
          $("transactionMessages");


        if (box) {

          box.innerHTML = `

            <div style="
              color:#b91c1c;
              padding:10px;
            ">

              ⚠️ Gagal memuat chat.

            </div>

          `;

        }

      }
    );

}


// ============================================================
// RENDER MESSAGES
// ============================================================

function renderMessages(
  messages
) {

  const box =
    $("transactionMessages");


  if (!box) {
    return;
  }


  if (!messages.length) {

    box.innerHTML = `

      <div style="
        text-align:center;
        padding:30px 10px;
        color:#6b7280;
      ">

        💬 Belum ada pesan.
        Mulai percakapan.

      </div>

    `;

    return;
  }


  box.innerHTML =
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
              margin-bottom:8px;
            ">

              <div style="
                max-width:80%;
                padding:10px 13px;
                border-radius:12px;
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
                  0 1px 3px rgba(0,0,0,.08);
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


                <div>
                  ${escapeHTML(
                    message.text ||
                    ""
                  )}
                </div>


                <div style="
                  font-size:10px;
                  opacity:.6;
                  margin-top:4px;
                ">
                  ${formatDateTime(
                    message.createdAt
                  )}
                </div>

              </div>

            </div>

          `;

        }
      )
      .join("");


  box.scrollTop =
    box.scrollHeight;

}


// ============================================================
// SEND MESSAGE
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


  const input =
    $("transactionMessageInput");


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


  try {

    const messagesRef =
      collection(
        db,
        "needs",
        transaction.needId,
        "transactions",
        transaction.id,
        "messages"
      );


    await addDoc(
      messagesRef,
      {

        senderId:
          currentUser.uid,

        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Pengguna",

        text,

        createdAt:
          serverTimestamp()

      }
    );


    input.value = "";


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

  }

}


// ============================================================
// CLOSE TRANSACTION
// ============================================================

function closeTransaction() {

  if (unsubscribeChat) {

    unsubscribeChat();

    unsubscribeChat = null;

  }


  closeModal(
    "transactionModal"
  );

}


// ============================================================
// TRANSACTION STATUS TEXT
// ============================================================

function getTransactionStatusText(
  transaction
) {

  if (
    transaction.paymentStatus ===
      "paid" &&
    transaction.providerCompleted &&
    transaction.ownerConfirmed
  ) {

    return "Selesai";

  }


  if (
    transaction.ownerConfirmed
  ) {

    return "Menunggu Pembayaran";

  }


  if (
    transaction.providerCompleted
  ) {

    return "Menunggu Konfirmasi Pemilik";

  }


  return "Dalam Pengerjaan";

}


// ============================================================
// PAYMENT STATUS
// ============================================================

function getPaymentStatusText(
  status
) {

  switch (status) {

    case "paid":
      return "✓ Sudah Dibayar";

    case "pending":
      return "⏳ Menunggu Pembayaran";

    default:
      return "Belum Dibayar";

  }

}


// ============================================================
// TRANSACTION ACTION CLICK
// ============================================================

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-transaction-action='open']"
      );


    if (!button) {
      return;
    }


    openTransaction(
      button.dataset.needId,
      button.dataset.offerId
    );

  }
);


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
// URL
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
// STATUS
// ============================================================

function normalizeStatus(
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
// STATUS CLASS
// ============================================================

function getStatusClass(
  status
) {

  switch (
    normalizeStatus(
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


// ============================================================
// STATUS TEXT
// ============================================================

function getStatusText(
  status
) {

  switch (
    normalizeStatus(
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
// NEED STATUS
// ============================================================

function getNeedStatusText(
  status
) {

  switch (
    String(
      status ||
      ""
    ).toLowerCase()
  ) {

    case "in_progress":
      return "🔨 Dalam Pengerjaan";

    case "completed":
      return "✓ Selesai";

    case "cancelled":
    case "canceled":
      return "✕ Dibatalkan";

    default:
      return "🟢 Dibuka";

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
      String(
        value ?? ""
      );

  }

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
// DATE TIME
// ============================================================

function formatDateTime(
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
      hour:
        "2-digit",
      minute:
        "2-digit"
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
// ESCAPE HTML
// ============================================================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )

    .replace
