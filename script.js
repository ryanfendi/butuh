// ============================================================
// BUTUH - SCRIPT.JS
// Marketplace Kebutuhan
// Firebase v12.1.0
// VERSI CEPAT + DETAIL + PENAWARAN
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
  updateDoc,
  serverTimestamp
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

const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let needsCache = [];

let unsubscribeAuth = null;

let isSubmittingNeed = false;

let isSubmittingOffer = false;


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
  user => {

    currentUser = user;

    updateUserUI(user);

    if (user) {
      loadNeeds();
    } else {
      showLoggedOut();
    }

  }
);


// ============================================================
// USER UI
// ============================================================

function updateUserUI(user) {

  const name =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Pengguna";

  const email =
    user?.email || "";

  const photo =
    user?.photoURL ||
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

async function loadNeeds() {

  const container =
    $("needsList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-box">
      <div class="spinner"></div>
      <strong>Memuat kebutuhan...</strong>
    </div>
  `;

  try {

    /*
      Tidak memakai orderBy.
      Tidak membutuhkan composite index.
    */

    const snapshot =
      await getDocs(
        collection(
          db,
          "needs"
        )
      );

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

    needsCache = needs;

    renderNeeds(
      needs
    );

    updateBasicCounters(
      needs
    );

    /*
      Counter penawaran dijalankan
      setelah kebutuhan tampil.
    */

    loadMyOfferCountFast(
      needs
    );

  } catch (error) {

    console.error(
      "LOAD NEEDS:",
      error
    );

    container.innerHTML = `
      <div class="loading-box">
        <div class="empty-icon">⚠️</div>

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
        <div class="empty-icon">📭</div>

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

  const active =
    status === "open" ||
    status === "active" ||
    status === "aktif";

  return `
    <article
      class="need-card"
      data-id="${escapeHTML(
        need.id
      )}"
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
            ${formatDate(
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
          data-id="${escapeHTML(
            need.id
          )}"
        >
          ${
            owner
              ? "Lihat"
              : active
                ? "Tawarkan"
                : "Lihat"
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
      item => {

        const status =
          String(
            item.status ||
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
      item =>
        item.ownerId ===
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
// MY OFFER COUNT
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

            const ref =
              collection(
                db,
                "needs",
                need.id,
                "offers"
              );

            const q =
              query(
                ref,
                where(
                  "providerId",
                  "==",
                  currentUser.uid
                )
              );

            const snap =
              await getDocs(q);

            return snap.size;

          } catch {

            return 0;

          }

        }
      );

    const result =
      await Promise.all(
        requests
      );

    const total =
      result.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    setText(
      "userOffersCount",
      total
    );

  } catch {

    setText(
      "userOffersCount",
      "0"
    );

  }

}


// ============================================================
// OPEN DETAIL
// ============================================================

window.openNeedDetail =
  async function(
    needId
  ) {

    if (!needId) {
      alert(
        "ID kebutuhan tidak ditemukan."
      );
      return;
    }

    const cached =
      needsCache.find(
        item =>
          item.id === needId
      );

    if (cached) {

      await showNeedDetail(
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
        await getDoc(ref);

      if (!snap.exists()) {

        alert(
          "Kebutuhan tidak ditemukan."
        );

        return;
      }

      await showNeedDetail({
        id: snap.id,
        ...snap.data()
      });

    } catch (error) {

      console.error(
        "DETAIL:",
        error
      );

      alert(
        "Gagal membuka kebutuhan."
      );

    }

  };


// ============================================================
// DETAIL MODAL
// ============================================================

async function showNeedDetail(
  need
) {

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

  const owner =
    need.ownerId ===
    currentUser?.uid;

  let offersHTML = "";

  /*
    Hanya pemilik kebutuhan yang
    mengambil daftar penawaran.
  */

  if (owner) {

    offersHTML =
      await getOffersHTML(
        need.id
      );

  }

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
          class="modal-close"
          id="closeDetail"
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
          padding:18px;
          border-radius:14px;
          margin:20px 0;
        ">

          <small>
            Budget
          </small>

          <div style="
            font-size:25px;
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

          👤
          ${escapeHTML(
            need.ownerName ||
            "Pengguna"
          )}

          <br>

          📂
          ${escapeHTML(
            getCategory(
              need.category
            )
          )}

          <br>

          📅
          ${formatDate(
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

        </div>

        ${
          owner
            ? `
              <div style="
                margin-top:25px;
              ">

                <h3>
                  💰 Penawaran Masuk
                </h3>

                <div id="detailOffers">
                  ${offersHTML}
                </div>

              </div>
            `
            : `
              <button
                id="detailOfferButton"
                class="btn btn-primary"
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

  if (!owner) {

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
// GET OFFERS FOR OWNER
// ============================================================

async function getOffersHTML(
  needId
) {

  try {

    const ref =
      collection(
        db,
        "needs",
        needId,
        "offers"
      );

    const snap =
      await getDocs(ref);

    if (snap.empty) {

      return `
        <div style="
          padding:20px;
          text-align:center;
          color:#667085;
        ">
          📭 Belum ada penawaran.
        </div>
      `;

    }

    const offers = [];

    snap.forEach(
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

    return offers
      .map(
        offer =>
          createOwnerOfferCard(
            needId,
            offer
          )
      )
      .join("");

  } catch (error) {

    console.error(
      "GET OFFERS:",
      error
    );

    return `
      <div style="
        padding:15px;
        background:#fef2f2;
        color:#dc2626;
        border-radius:10px;
      ">
        ⚠️ Gagal memuat penawaran.
      </div>
    `;

  }

}


// ============================================================
// OWNER OFFER CARD
// ============================================================

function createOwnerOfferCard(
  needId,
  offer
) {

  const status =
    String(
      offer.status ||
      "pending"
    ).toLowerCase();

  const canAccept =
    status === "pending";

  return `
    <div style="
      border:1px solid #e5e7eb;
      border-radius:14px;
      padding:16px;
      margin-top:12px;
    ">

      <strong>
        ${escapeHTML(
          offer.providerName ||
          "Penyedia"
        )}
      </strong>

      <div style="
        color:#2563eb;
        font-size:20px;
        font-weight:800;
        margin-top:6px;
      ">
        Rp ${formatMoney(
          offer.price
        )}
      </div>

      <div style="
        margin-top:8px;
        color:#667085;
      ">
        ⏱️
        ${escapeHTML(
          offer.duration ||
          "-"
        )}
      </div>

      <p style="
        line-height:1.6;
      ">
        ${escapeHTML(
          offer.message ||
          ""
        )}
      </p>

      <span class="status ${
        getStatusClass(
          status
        )
      }">
        ${getStatusText(
          status
        )}
      </span>

      ${
        canAccept
          ? `
            <div style="
              display:flex;
              gap:8px;
              margin-top:15px;
            ">

              <button
                class="btn btn-primary"
                type="button"
                data-accept-offer="true"
                data-need-id="${escapeHTML(
                  needId
                )}"
                data-offer-id="${escapeHTML(
                  offer.id
                )}"
              >
                ✓ Terima
              </button>

              <button
                class="btn btn-outline"
                type="button"
                data-reject-offer="true"
                data-need-id="${escapeHTML(
                  needId
                )}"
                data-offer-id="${escapeHTML(
                  offer.id
                )}"
              >
                ✕ Tolak
              </button>

            </div>
          `
          : ""
      }

    </div>
  `;

}


// ============================================================
// ACCEPT OFFER
// ============================================================

async function acceptOffer(
  needId,
  offerId
) {

  if (!currentUser) {
    return;
  }

  const confirmed =
    confirm(
      "Terima penawaran ini?"
    );

  if (!confirmed) {
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

    const needSnap =
      await getDoc(
        needRef
      );

    if (!needSnap.exists()) {

      alert(
        "Kebutuhan tidak ditemukan."
      );

      return;
    }

    const need =
      needSnap.data();

    if (
      need.ownerId !==
      currentUser.uid
    ) {

      alert(
        "Anda bukan pemilik kebutuhan."
      );

      return;
    }

    await updateDoc(
      offerRef,
      {
        status:
          "accepted",

        updatedAt:
          serverTimestamp()
      }
    );

    await updateDoc(
      needRef,
      {
        status:
          "accepted",

        acceptedOfferId:
          offerId,

        updatedAt:
          serverTimestamp()
      }
    );

    alert(
      "✅ Penawaran berhasil diterima."
    );

    closeModal(
      "detailModal"
    );

    /*
      Refresh kebutuhan agar
      status langsung berubah.
    */

    await loadNeeds();

  } catch (error) {

    console.error(
      "ACCEPT OFFER:",
      error
    );

    alert(
      "Gagal menerima penawaran:\n\n" +
      error.message
    );

  }

}


// ============================================================
// REJECT OFFER
// ============================================================

async function rejectOffer(
  needId,
  offerId
) {

  if (!currentUser) {
    return;
  }

  const confirmed =
    confirm(
      "Tolak penawaran ini?"
    );

  if (!confirmed) {
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

    const needSnap =
      await getDoc(
        needRef
      );

    if (!needSnap.exists()) {
      return;
    }

    if (
      needSnap.data().ownerId !==
      currentUser.uid
    ) {

      alert(
        "Anda bukan pemilik kebutuhan."
      );

      return;
    }

    await updateDoc(
      offerRef,
      {
        status:
          "rejected",

        updatedAt:
          serverTimestamp()
      }
    );

    alert(
      "Penawaran ditolak."
    );

    closeModal(
      "detailModal"
    );

    await loadNeeds();

  } catch (error) {

    console.error(
      "REJECT OFFER:",
      error
    );

    alert(
      "Gagal menolak penawaran."
    );

  }

}


// ============================================================
// POST NEED
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
      "Deskripsi wajib diisi."
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
      "Budget tidak valid."
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
    "needs",
    need.id,
    "offers"
  ),
  {
    needId: need.id,

    needTitle:
      need.title || "Kebutuhan",

    providerId:
      currentUser.uid,

    providerName:
      currentUser.displayName ||
      currentUser.email?.split("@")[0] ||
      "Pengguna",

    providerEmail:
      currentUser.email || "",

    providerPhoto:
      currentUser.photoURL || "",

    price:
      price,

    duration:
      duration,

    message:
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

    closeNeedModal();

    showToast(
      "✅ Kebutuhan berhasil diposting!"
    );

    /*
      Refresh cepat.
    */

    await loadNeeds();

  } catch (error) {

    console.error(
      "POST NEED:",
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
// OFFER FORM
// ============================================================

function openOfferForm(
  need
) {

  if (!currentUser) {

    window.location.href =
      "login.html";

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
            Pesan
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
            type="button"
            id="cancelOffer"
            class="btn btn-outline"
          >
            Batal
          </button>

          <button
            type="submit"
            id="submitOffer"
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

  const form =
    event.target;

  const price =
    Number(
      form.price?.value
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
      "Harga penawaran tidak valid."
    );

    return;
  }

  if (!duration) {

    alert(
      "Lama pengerjaan wajib diisi."
    );

    return;
  }

  if (!message) {

    alert(
      "Pesan penawaran wajib diisi."
    );

    return;
  }

  /*
    Pemilik tidak boleh menawarkan
    kepada kebutuhannya sendiri.
  */

  if (
    need.ownerId ===
    currentUser.uid
  ) {

    alert(
      "Anda tidak dapat menawarkan kebutuhan sendiri."
    );

    return;
  }

  isSubmittingOffer =
    true;

  const button =
    $("submitOffer");

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

    needId:
      need.id,

    needTitle:
      need.title ||
      "Kebutuhan",

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

    loadMyOfferCountFast(
      needsCache
    );

  } catch (error) {

    console.error(
      "SUBMIT OFFER:",
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
        "💰 Kirim Penawaran";

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


    // PROFILE

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


    // OUTSIDE PROFILE

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
          !menu.contains(
            event.target
          ) &&
          !button.contains(
            event.target
          )
        ) {

          menu.classList.add(
            "hidden"
          );

        }

      }
    );


    // NEED DETAIL

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

          const id =
            button.dataset.id;

          if (id) {

            window.openNeedDetail(
              id
            );

          }

        }
      );


    // ACCEPT OFFER

    document.addEventListener(
      "click",
      event => {

        const accept =
          event.target.closest(
            "[data-accept-offer='true']"
          );

        if (accept) {

          acceptOffer(
            accept.dataset.needId,
            accept.dataset.offerId
          );

          return;
        }

        const reject =
          event.target.closest(
            "[data-reject-offer='true']"
          );

        if (reject) {

          rejectOffer(
            reject.dataset.needId,
            reject.dataset.offerId
          );

        }

      }
    );


    // ESC

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {

          closeModal(
            "needModal"
          );

          closeModal(
            "detailModal"
          );

          closeModal(
            "offerModal"
          );

        }

      }
    );

  }
);


// ============================================================
// GLOBAL API
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


// ============================================================
// OPEN NEED FROM PROFILE
// ============================================================

function openNeedFromURL() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const needId =
    params.get("need");

  if (!needId) {
    return;
  }

  let attempts = 0;

  const timer =
    setInterval(
      () => {

        attempts++;

        if (
          typeof window.openNeedDetail ===
          "function"
        ) {

          clearInterval(
            timer
          );

          window.openNeedDetail(
            needId
          );

          window.history.replaceState(
            {},
            document.title,
            "index.html"
          );

          return;

        }

        if (
          attempts >= 100
        ) {

          clearInterval(
            timer
          );

        }

      },
      100
    );

}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    openNeedFromURL
  );

} else {

  openNeedFromURL();

}


console.log(
  "✅ BUTUH script.js VERSI TERBARU aktif"
);


// ============================================================
// COMMON HELPERS
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

    return Number.isFinite(
      time
    )
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
      day: "2-digit",
      month: "short",
      year: "numeric"
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


function getCategory(
  value
) {

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
    String(
      text ||
      ""
    );

  return value.length <= length
    ? value
    : value.substring(
        0,
        length
      ) + "...";

}


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


function avatar(
  name
) {

  const first =
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
    encodeURIComponent(first) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


function showToast(
  message
) {

  let toast =
    $("butuhToast");

  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

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
        color: "#fff",
        fontWeight: "700",
        fontSize: "14px",
        boxShadow:
          "0 10px 30px rgba(0,0,0,.2)"
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


function showLoggedOut() {

  const container =
    $("needsList");

  if (container) {

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

  }

  setText(
    "activeNeedsCount",
    "0"
  );

  setText(
    "userNeedsCount",
    "0"
  );

  setText(
    "userOffersCount",
    "0"
  );

}
