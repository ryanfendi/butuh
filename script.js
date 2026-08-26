// ============================================================
// BUTUH - SCRIPT.JS
// Firebase Marketplace Kebutuhan
// VERSI TERBARU
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
  updateDoc
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

const auth = getAuth(app);

const db = getFirestore(app);


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let needsCache = [];

let unsubscribeNeeds = null;

let currentDetailNeed = null;

let isSubmittingNeed = false;

let isSubmittingOffer = false;

let isUpdatingOffer = false;

let authReady = false;


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

    setText("userName", "Pengguna");
    setText("menuUserName", "Pengguna");
    setText("userEmail", "");
    setText("menuUserEmail", "");

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


  setText("userName", name);
  setText("menuUserName", name);

  setText("userEmail", email);
  setText("menuUserEmail", email);

  setImage("userPhoto", photo);
  setImage("menuUserPhoto", photo);

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

              id: item.id,

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


        renderNeeds(needs);

        updateBasicCounters(needs);

        loadMyOfferCountFast(needs);

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
        need => createNeedCard(need)
      )
      .join("");

}


// ============================================================
// CREATE NEED CARD
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
            📅 ${formatDate(need.createdAt)}
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
// COUNT MY OFFERS
// ============================================================

async function loadMyOfferCountFast(needs) {

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

    const promises =
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

          } catch (error) {

            return 0;

          }

        }
      );


    const results =
      await Promise.all(
        promises
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
    Number(rawBudget);

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
    rawBudget === "" ||
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
  async function(needId) {

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
        "Gagal membuka kebutuhan:\n" +
        error.message
      );

    }

  };


// ============================================================
// SHOW NEED DETAIL
// ============================================================

async function showNeedDetail(need) {

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
            Rp ${formatMoney(need.budget)}
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
                ${escapeHTML(need.deadline)}
              `
              : ""
          }

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

                    <div class="spinner"></div>

                    Memuat penawaran...

                  </div>

                </div>

              </div>

            `
            : `

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

async function loadIncomingOffers(need) {

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

          id: item.id,

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

        <button
          id="retryIncomingOffers"
          class="btn btn-primary"
          type="button"
        >
          🔄 Coba Lagi
        </button>

      </div>

    `;


    $("retryIncomingOffers")
      ?.addEventListener(
        "click",
        () =>
          loadIncomingOffers(
            need
          )
      );

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
    normalizeStatus(
      offer.status
    );


  const actions =
    status === "pending"
      ? `

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
            data-offer-id="${escapeHTML(offer.id)}"
          >
            ✓ Terima
          </button>

          <button
            type="button"
            class="btn btn-outline"
            data-offer-action="rejected"
            data-offer-id="${escapeHTML(offer.id)}"
          >
            ✕ Tolak
          </button>

        </div>

      `
      : "";


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


      <span class="status ${getStatusClass(status)}">

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
      "Anda tidak memiliki izin untuk mengubah penawaran ini."
    );

    return;

  }


  isUpdatingOffer =
    true;


  try {

    const offerRef =
      doc(
        db,
        "needs",
        need.id,
        "offers",
        offerId
      );


    await updateDoc(
      offerRef,
      {

        status:
          newStatus,

        updatedAt:
          serverTimestamp()

      }
    );


    if (
      newStatus ===
      "accepted"
    ) {

      await updateDoc(
        doc(
          db,
          "needs",
          need.id
        ),
        {

          status:
            "in_progress",

          acceptedOfferId:
            offerId,

          updatedAt:
            serverTimestamp()

        }
      );

    }


    showToast(
      newStatus === "accepted"
        ? "🎉 Penawaran berhasil diterima!"
        : "✕ Penawaran ditolak."
    );


    await loadIncomingOffers(
      need
    );


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

function openOfferForm(need) {

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


  if (isSubmittingOffer) {
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
        Number.isFinite(old)
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

function closeModal(id) {

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

    await signOut(auth);

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
    params.get("need");


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

function normalizeStatus(status) {

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


function getStatusClass(status) {

  switch (
    normalizeStatus(status)
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


function getStatusText(status) {

  switch (
    normalizeStatus(status)
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
// SET TEXT
// ============================================================

function setText(id, value) {

  const element =
    $(id);

  if (element) {

    element.textContent =
      String(value ?? "");

  }

}


// ============================================================
// SET IMAGE
// ============================================================

function setImage(id, src) {

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

      return (
        value.seconds *
        1000
      );

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
// FORMAT DATE
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
// FORMAT MONEY
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
  ).format(
    number
  );

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
// AVATAR
// ============================================================

function avatar(name) {

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


// ============================================================
// TOAST
// ============================================================

function showToast(message) {

  let toast =
    $("butuhToast");


  if (!toast) {

    toast =
      document.createElement("div");

    toast.id =
      "butuhToast";

    Object.assign(
      toast.style,
      {

        position: "fixed",
        left: "50%",
        bottom: "25px",
        transform: "translateX(-50%)",
        zIndex: "999999",
        padding: "13px 20px",
        borderRadius: "999px",
        background: "#111827",
        color: "#ffffff",
        fontWeight: "700",
        fontSize: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,.2)"

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
// LOGGED OUT
// ============================================================

function showLoggedOut() {

  const container =
    $("needsList");

  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="loading-box">

      <div class="empty-icon">
        🔐
      </div>

      <strong>
        Silakan login
      </strong>

      <small>
        Login untuk melihat kebutuhan.
      </small>

    </div>

  `;


  setText("activeNeedsCount", "0");
  setText("userNeedsCount", "0");
  setText("userOffersCount", "0");

}


// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("needForm")
      ?.addEventListener(
        "submit",
        submitNeed
      );


    $("openNeedModal")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("heroPostButton")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("desktopPostButton")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("mobilePostButton")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("closeNeedModal")
      ?.addEventListener(
        "click",
        closeNeedModal
      );


    $("cancelNeed")
      ?.addEventListener(
        "click",
        closeNeedModal
      );


    $("needBackdrop")
      ?.addEventListener(
        "click",
        closeNeedModal
      );


    $("profileButton")
      ?.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          $("profileMenu")
            ?.classList.toggle(
              "hidden"
            );

        }
      );


    $("profilePageBtn")
      ?.addEventListener(
        "click",
        openProfile
      );


    $("logoutBtn")
      ?.addEventListener(
        "click",
        logout
      );


    document.addEventListener(
      "click",
      event => {

        const menu =
          $("profileMenu");

        const button =
          $("profileButton");


        if (
          menu &&
          button &&
          !menu.contains(event.target) &&
          !button.contains(event.target)
        ) {

          menu.classList.add(
            "hidden"
          );

        }

      }
    );


    $("needsList")
      ?.addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-action='detail']"
            );

          if (!button) {
            return;
          }


          const needId =
            button.dataset.id;


          if (needId) {

            window.openNeedDetail(
              needId
            );

          }

        }
      );


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {

          closeModal("needModal");
          closeModal("detailModal");
          closeModal("offerModal");

        }

      }
    );

  }
);


// ============================================================
// DEBUG
// ============================================================

window.butuhApp = {

  getUser() {
    return currentUser;
  },

  getNeeds() {
    return needsCache;
  },

  reload() {
    loadNeeds();
  }

};


console.log(
  "✅ BUTUH script.js terbaru aktif"
);
