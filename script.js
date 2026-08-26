// ============================================================
// BUTUH - SCRIPT.JS V2
// Marketplace Kebutuhan + Penawaran + Transaksi + Chat
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
  setDoc,
  orderBy,
  limit
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
let authReady = false;

let needsCache = [];
let unsubscribeNeeds = null;

let currentDetailNeed = null;

let isSubmittingNeed = false;
let isSubmittingOffer = false;
let isUpdatingOffer = false;

let currentTransaction = null;
let unsubscribeChat = null;

// ============================================================
// HELPERS
// ============================================================

const $ = id => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value ?? "");
}

function setImage(id, src) {
  const el = $(id);
  if (el && src) el.src = src;
}

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, async user => {

  currentUser = user;
  authReady = true;

  updateUserUI(user);

  if (!user) {

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
    return;
  }

  loadNeeds();
  openNeedFromURL();
});

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

  const photo =
    user.photoURL ||
    avatar(name);

  setText("userName", name);
  setText("menuUserName", name);

  setText("userEmail", user.email || "");
  setText("menuUserEmail", user.email || "");

  setImage("userPhoto", photo);
  setImage("menuUserPhoto", photo);
}

// ============================================================
// LOAD NEEDS
// ============================================================

function loadNeeds() {

  const container = $("needsList");

  if (!container) return;

  if (unsubscribeNeeds) {
    unsubscribeNeeds();
    unsubscribeNeeds = null;
  }

  container.innerHTML = `
    <div class="loading-box">
      <div class="loading-spinner"></div>
      <strong>Memuat kebutuhan...</strong>
      <small>Menghubungkan ke Firestore</small>
    </div>
  `;

  const needsRef = collection(db, "needs");

  unsubscribeNeeds = onSnapshot(
    needsRef,
    snapshot => {

      const needs = [];

      snapshot.forEach(item => {
        needs.push({
          id: item.id,
          ...item.data()
        });
      });

      needs.sort(
        (a, b) =>
          getTime(b.createdAt) -
          getTime(a.createdAt)
      );

      needsCache = needs;

      renderNeeds(needs);
      updateBasicCounters(needs);
      loadMyOfferCountFast(needs);
    },
    error => {

      console.error(error);

      container.innerHTML = `
        <div class="loading-box">
          <div class="empty-icon">⚠️</div>
          <strong>Gagal memuat kebutuhan</strong>
          <small>${escapeHTML(error.message)}</small>

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
        ?.addEventListener("click", loadNeeds);
    }
  );
}

// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds(needs) {

  const container = $("needsList");

  if (!container) return;

  if (!needs.length) {

    container.innerHTML = `
      <div class="loading-box">
        <div class="empty-icon">📭</div>
        <strong>Belum ada kebutuhan</strong>
        <small>Jadilah yang pertama memposting kebutuhan.</small>
      </div>
    `;

    return;
  }

  container.innerHTML =
    needs.map(createNeedCard).join("");
}

// ============================================================
// NEED CARD
// ============================================================

function createNeedCard(need) {

  const owner =
    need.ownerId === currentUser?.uid;

  const status =
    normalizeNeedStatus(need.status);

  const isOpen =
    status === "open";

  let buttonText = "👁️ Lihat";

  if (!owner && isOpen) {
    buttonText = "💰 Tawarkan";
  }

  return `
    <article
      class="need-card"
      data-id="${escapeHTML(need.id)}"
    >

      <div class="need-card-top">

        <div>

          <span class="need-category">
            ${escapeHTML(getCategory(need.category))}
          </span>

          <h3>
            ${escapeHTML(need.title || "Tanpa judul")}
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
        ${escapeHTML(
          truncate(need.description || "", 160)
        )}
      </p>

      <div class="need-footer">

        <div>

          <div class="need-budget">
            Rp ${formatMoney(need.budget)}
          </div>

          <div class="need-date">
            📅 ${formatDate(need.createdAt)}
          </div>

          ${
            status !== "open"
              ? `
                <div style="margin-top:5px">
                  ${getNeedStatusText(status)}
                </div>
              `
              : ""
          }

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
          ${buttonText}
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
      n => normalizeNeedStatus(n.status) === "open"
    ).length;

  const mine =
    needs.filter(
      n => n.ownerId === currentUser?.uid
    ).length;

  setText("activeNeedsCount", active);
  setText("userNeedsCount", mine);
}

// ============================================================
// COUNT OFFERS
// ============================================================

async function loadMyOfferCountFast(needs) {

  if (!currentUser || !needs.length) {
    setText("userOffersCount", "0");
    return;
  }

  try {

    let total = 0;

    for (const need of needs) {

      try {

        const q = query(
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

        const snap = await getDocs(q);

        total += snap.size;

      } catch (err) {

        console.warn(
          "Offer count error:",
          err.message
        );

      }
    }

    setText("userOffersCount", total);

  } catch (error) {

    console.warn(error);

  }
}

// ============================================================
// SUBMIT NEED
// ============================================================

async function submitNeed(event) {

  event.preventDefault();

  if (isSubmittingNeed) return;

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  const form = event.target;

  const title =
    String(form.title?.value || "").trim();

  const description =
    String(form.description?.value || "").trim();

  const category =
    form.category?.value || "other";

  const rawBudget =
    String(form.budget?.value || "").trim();

  const budget = Number(rawBudget);

  const deadline =
    form.deadline?.value || "";

  if (!title) {
    alert("Judul kebutuhan wajib diisi.");
    return;
  }

  if (!description) {
    alert("Deskripsi kebutuhan wajib diisi.");
    return;
  }

  if (
    rawBudget === "" ||
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    alert("Masukkan budget yang valid.");
    return;
  }

  isSubmittingNeed = true;

  const button = $("submitNeed");
  const original =
    button?.innerHTML || "🚀 Posting Kebutuhan";

  if (button) {
    button.disabled = true;
    button.innerHTML = "⏳ Menyimpan...";
  }

  try {

    await addDoc(
      collection(db, "needs"),
      {
        title,
        description,
        category,
        budget,
        deadline,

        ownerId: currentUser.uid,

        ownerName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Pengguna",

        ownerEmail:
          currentUser.email || "",

        ownerPhoto:
          currentUser.photoURL || "",

        status: "open",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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

    isSubmittingNeed = false;

    if (button) {
      button.disabled = false;
      button.innerHTML = original;
    }
  }
}

// ============================================================
// DETAIL
// ============================================================

window.openNeedDetail = async function(needId) {

  if (!needId) return;

  const cached =
    needsCache.find(
      n => n.id === needId
    );

  if (cached) {
    showNeedDetail(cached);
    return;
  }

  try {

    const snap =
      await getDoc(
        doc(db, "needs", needId)
      );

    if (!snap.exists()) {
      alert("Kebutuhan tidak ditemukan.");
      return;
    }

    showNeedDetail({
      id: snap.id,
      ...snap.data()
    });

  } catch (error) {

    console.error(error);

    alert(
      "Gagal membuka kebutuhan:\n" +
      error.message
    );
  }
};

// ============================================================
// SHOW DETAIL
// ============================================================

async function showNeedDetail(need) {

  currentDetailNeed = need;

  let modal = $("detailModal");

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id = "detailModal";
    modal.className = "modal hidden";

    document.body.appendChild(modal);
  }

  const isOwner =
    need.ownerId === currentUser?.uid;

  const status =
    normalizeNeedStatus(need.status);

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
            ${escapeHTML(need.title || "Kebutuhan")}
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
          ${escapeHTML(need.description || "")}
        </p>

        <div style="
          background:#eff6ff;
          padding:16px;
          border-radius:12px;
          margin:20px 0;
        ">

          <small>Budget</small>

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
            need.ownerName || "Pengguna"
          )}

          <br>

          📂 ${escapeHTML(
            getCategory(need.category)
          )}

          <br>

          📅 ${formatDate(need.createdAt)}

          ${
            need.deadline
              ? `
                <br>
                ⏰ Deadline:
                ${escapeHTML(need.deadline)}
              `
              : ""
          }

          <br>

          📌 Status:
          ${getNeedStatusText(status)}

        </div>

        ${
          isOwner
            ? `
              <div style="margin-top:25px">

                <h3>💰 Penawaran Masuk</h3>

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
                  background:#f3f4f6;
                  border-radius:12px;
                ">
                  🔒 Kebutuhan ini sudah tidak menerima
                  penawaran baru.
                </div>
              `
        }

      </div>

    </div>
  `;

  modal.classList.remove("hidden");

  document.body.classList.add("modal-open");

  $("closeDetail")
    ?.addEventListener(
      "click",
      () => closeModal("detailModal")
    );

  $("detailBackdrop")
    ?.addEventListener(
      "click",
      () => closeModal("detailModal")
    );

  if (isOwner) {

    loadIncomingOffers(need);

  } else {

    $("detailOfferButton")
      ?.addEventListener(
        "click",
        () => {

          closeModal("detailModal");

          openOfferForm(need);
        }
      );
  }
}

// ============================================================
// LOAD OFFERS
// ============================================================

async function loadIncomingOffers(need) {

  const container =
    $("incomingOffersList");

  if (!container) return;

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "needs",
          need.id,
          "offers"
        )
      );

    const offers = [];

    snapshot.forEach(item => {

      offers.push({
        id: item.id,
        ...item.data()
      });

    });

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
            Belum ada penyedia yang mengajukan.
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
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            await updateOfferStatus(
              need,
              button.dataset.offerId,
              button.dataset.offerAction
            );

          }
        );

      });

  } catch (error) {

    console.error(error);

    container.innerHTML = `
      <div class="error-state">
        ⚠️ Gagal memuat penawaran
        <p>
          ${escapeHTML(error.message)}
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
    normalizeOfferStatus(
      offer.status
    );

  let actions = "";

  if (status === "pending") {

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
    `;
  }

  return `
    <div class="history-card">

      <div class="history-main">

        <h3>
          👤 ${escapeHTML(
            offer.providerName || "Penyedia"
          )}
        </h3>

        <div class="offer-price">
          Rp ${formatMoney(offer.price)}
        </div>

        <p>
          ${escapeHTML(offer.message || "")}
        </p>

        <div class="history-meta">

          <span>
            ⏱️ ${escapeHTML(
              offer.duration || "-"
            )}
          </span>

          <span>
            📅 ${formatDate(offer.createdAt)}
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
// ACCEPT / REJECT OFFER
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
    need.ownerId !== currentUser.uid
  ) {

    alert(
      "Anda tidak memiliki izin."
    );

    return;
  }

  isUpdatingOffer = true;

  try {

    const offerRef =
      doc(
        db,
        "needs",
        need.id,
        "offers",
        offerId
      );

    const offerSnap =
      await getDoc(offerRef);

    if (!offerSnap.exists()) {
      throw new Error(
        "Penawaran tidak ditemukan."
      );
    }

    const offer =
      offerSnap.data();

    if (newStatus === "accepted") {

      // ------------------------------------------------------
      // UPDATE OFFER
      // ------------------------------------------------------

      await updateDoc(
        offerRef,
        {
          status: "accepted",
          updatedAt: serverTimestamp()
        }
      );

      // ------------------------------------------------------
      // TOLAK PENAWARAN LAIN
      // ------------------------------------------------------

      try {

        const allOffers =
          await getDocs(
            collection(
              db,
              "needs",
              need.id,
              "offers"
            )
          );

        const updates = [];

        allOffers.forEach(item => {

          if (
            item.id !== offerId &&
            normalizeOfferStatus(
              item.data().status
            ) === "pending"
          ) {

            updates.push(
              updateDoc(
                doc(
                  db,
                  "needs",
                  need.id,
                  "offers",
                  item.id
                ),
                {
                  status: "rejected",
                  updatedAt: serverTimestamp()
                }
              )
            );

          }

        });

        await Promise.all(updates);

      } catch (err) {

        console.warn(
          "Tidak dapat menolak offer lain:",
          err
        );
      }

      // ------------------------------------------------------
      // UPDATE NEED
      // ------------------------------------------------------

      await updateDoc(
        doc(db, "needs", need.id),
        {
          status: "in_progress",
          acceptedOfferId: offerId,
          acceptedProviderId:
            offer.providerId,
          acceptedProviderName:
            offer.providerName || "Penyedia",
          updatedAt: serverTimestamp()
        }
      );

      // ------------------------------------------------------
      // CREATE TRANSACTION
      // ------------------------------------------------------

      const transactionRef =
        doc(
          db,
          "needs",
          need.id,
          "transactions",
          offerId
        );

      const transactionSnap =
        await getDoc(transactionRef);

      if (!transactionSnap.exists()) {

        await setDoc(
          transactionRef,
          {
            needId: need.id,
            needTitle:
              need.title || "Kebutuhan",

            offerId,

            ownerId:
              need.ownerId,

            ownerName:
              need.ownerName || "Pemilik",

            providerId:
              offer.providerId,

            providerName:
              offer.providerName || "Penyedia",

            amount:
              Number(offer.price || 0),

            currency: "IDR",

            status: "in_progress",

            workStatus: "in_progress",

            paymentStatus: "unpaid",

            providerCompleted: false,

            ownerConfirmed: false,

            providerConfirmed: false,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );
      }

      showToast(
        "🎉 Penawaran diterima. Transaksi dibuat!"
      );

    } else {

      await updateDoc(
        offerRef,
        {
          status: "rejected",
          updatedAt: serverTimestamp()
        }
      );

      showToast(
        "✕ Penawaran ditolak."
      );
    }

    await loadIncomingOffers(need);

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

    isUpdatingOffer = false;
  }
}

// ============================================================
// OFFER FORM
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
      "Anda tidak dapat menawarkan kebutuhan sendiri."
    );

    return;
  }

  let modal = $("offerModal");

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id = "offerModal";
    modal.className = "modal hidden";

    document.body.appendChild(modal);
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
              need.title || "Kebutuhan"
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

  modal.classList.remove("hidden");

  document.body.classList.add("modal-open");

  $("closeOffer")
    ?.addEventListener(
      "click",
      () => closeModal("offerModal")
    );

  $("cancelOffer")
    ?.addEventListener(
      "click",
      () => closeModal("offerModal")
    );

  $("offerBackdrop")
    ?.addEventListener(
      "click",
      () => closeModal("offerModal")
    );

  $("offerForm")
    ?.addEventListener(
      "submit",
      e => submitOffer(e, need)
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

  if (isSubmittingOffer) return;

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (
    !need ||
    !need.id
  ) {

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

  if (
    normalizeNeedStatus(
      need.status
    ) !== "open"
  ) {

    alert(
      "Kebutuhan ini sudah tidak menerima penawaran."
    );

    return;
  }

  const form = event.target;

  const price =
    Number(form.price?.value || 0);

  const duration =
    String(
      form.duration?.value || ""
    ).trim();

  const message =
    String(
      form.message?.value || ""
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
    alert("Masukkan lama pengerjaan.");
    return;
  }

  if (!message) {
    alert("Masukkan pesan penawaran.");
    return;
  }

  isSubmittingOffer = true;

  const button =
    $("submitOffer");

  const original =
    button?.innerHTML ||
    "💰 Kirim Penawaran";

  if (button) {

    button.disabled = true;
    button.innerHTML = "⏳ Mengirim...";
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
          currentUser.email || "",

        providerPhoto:
          currentUser.photoURL || "",

        needId:
          need.id,

        needTitle:
          need.title || "Kebutuhan",

        price,
        duration,
        message,

        status: "pending",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );

    form.reset();

    closeModal("offerModal");

    showToast(
      "🤝 Penawaran berhasil dikirim!"
    );

    const counter =
      $("userOffersCount");

    if (counter) {

      const old =
        Number(counter.textContent);

      if (Number.isFinite(old)) {
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

    isSubmittingOffer = false;

    if (button) {

      button.disabled = false;
      button.innerHTML = original;
    }
  }
}

// ============================================================
// TRANSACTION
// ============================================================

async function getTransaction(
  needId,
  transactionId
) {

  const ref =
    doc(
      db,
      "needs",
      needId,
      "transactions",
      transactionId
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data()
  };
}

// ============================================================
// OPEN TRANSACTION
// ============================================================

window.openTransaction =
  async function(
    needId,
    transactionId
  ) {

    if (!currentUser) return;

    try {

      const transaction =
        await getTransaction(
          needId,
          transactionId
        );

      if (!transaction) {
        alert("Transaksi tidak ditemukan.");
        return;
      }

      const allowed =
        transaction.ownerId === currentUser.uid ||
        transaction.providerId === currentUser.uid;

      if (!allowed) {
        alert("Anda bukan pihak transaksi ini.");
        return;
      }

      currentTransaction =
        transaction;

      showTransactionModal(
        transaction
      );

    } catch (error) {

      console.error(error);

      alert(
        "Gagal membuka transaksi:\n" +
        error.message
      );
    }
  };

// ============================================================
// TRANSACTION MODAL
// ============================================================

function showTransactionModal(
  transaction
) {

  let modal =
    $("transactionModal");

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "transactionModal";

    modal.className =
      "modal hidden";

    document.body.appendChild(modal);
  }

  const isOwner =
    transaction.ownerId ===
    currentUser.uid;

  const isProvider =
    transaction.providerId ===
    currentUser.uid;

  const completed =
    transaction.status ===
    "completed";

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

      <div style="padding:20px">

        <div style="
          padding:16px;
          background:#eff6ff;
          border-radius:14px;
          margin-bottom:16px;
        ">

          <div>
            💰 Nilai pekerjaan
          </div>

          <strong style="
            display:block;
            font-size:24px;
            margin-top:5px;
          ">
            Rp ${formatMoney(
              transaction.amount
            )}
          </strong>

        </div>

        <div style="
          display:grid;
          gap:8px;
          margin-bottom:20px;
        ">

          <div>
            👤 Pemilik:
            ${escapeHTML(
              transaction.ownerName || "-"
            )}
          </div>

          <div>
            🛠️ Penyedia:
            ${escapeHTML(
              transaction.providerName || "-"
            )}
          </div>

          <div>
            📌 Status:
            ${escapeHTML(
              transaction.status || "-"
            )}
          </div>

          <div>
            💳 Pembayaran:
            ${escapeHTML(
              transaction.paymentStatus || "unpaid"
            )}
          </div>

        </div>

        <div id="transactionActions">

          ${renderTransactionActions(
            transaction,
            isOwner,
            isProvider
          )}

        </div>

        ${
          !completed
            ? `
              <div style="margin-top:25px">

                <h3>
                  💬 Chat
                </h3>

                <div
                  id="chatMessages"
                  style="
                    height:280px;
                    overflow-y:auto;
                    border:1px solid #e5e7eb;
                    border-radius:12px;
                    padding:12px;
                    background:#f9fafb;
                    margin:10px 0;
                  "
                >
                  Memuat chat...
                </div>

                <form id="chatForm"
                  style="
                    display:flex;
                    gap:8px;
                  "
                >

                  <input
                    id="chatInput"
                    type="text"
                    maxlength="2000"
                    placeholder="Tulis pesan..."
                    required
                    style="
                      flex:1;
                      min-width:0;
                    "
                  >

                  <button
                    type="submit"
                    class="btn btn-primary"
                  >
                    Kirim
                  </button>

                </form>

              </div>
            `
            : ""
        }

      </div>

    </div>
  `;

  modal.classList.remove("hidden");

  document.body.classList.add("modal-open");

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

  $("chatForm")
    ?.addEventListener(
      "submit",
      sendChatMessage
    );

  if (!completed) {
    startChatListener(transaction);
  }
}

// ============================================================
// TRANSACTION ACTIONS
// ============================================================

function renderTransactionActions(
  transaction,
  isOwner,
  isProvider
) {

  if (
    transaction.status ===
    "completed"
  ) {

    return `
      <div style="
        padding:15px;
        background:#ecfdf5;
        border-radius:12px;
        color:#065f46;
        font-weight:700;
      ">
        ✅ Transaksi telah selesai.
      </div>
    `;
  }

  let html = "";

  if (isProvider) {

    if (
      !transaction.providerCompleted
    ) {

      html += `
        <button
          id="completeWorkBtn"
          type="button"
          class="btn btn-primary"
          style="width:100%;margin-bottom:10px"
        >
          ✅ Selesaikan Pekerjaan
        </button>
      `;

    } else {

      html += `
        <div style="
          padding:12px;
          background:#eff6ff;
          border-radius:10px;
          margin-bottom:10px;
        ">
          ⏳ Anda sudah menyatakan pekerjaan selesai.
          Menunggu konfirmasi pemilik.
        </div>
      `;
    }
  }

  if (isOwner) {

    if (
      transaction.providerCompleted &&
      !transaction.ownerConfirmed
    ) {

      html += `
        <button
          id="confirmWorkBtn"
          type="button"
          class="btn btn-primary"
          style="width:100%;margin-bottom:10px"
        >
          ✅ Konfirmasi Pekerjaan Selesai
        </button>
      `;

    } else if (
      !transaction.providerCompleted
    ) {

      html += `
        <div style="
          padding:12px;
          background:#f9fafb;
          border-radius:10px;
          margin-bottom:10px;
        ">
          ⏳ Menunggu penyedia menyelesaikan pekerjaan.
        </div>
      `;

    } else {

      html += `
        <div style="
          padding:12px;
          background:#ecfdf5;
          border-radius:10px;
        ">
          ✓ Anda sudah mengonfirmasi.
        </div>
      `;
    }
  }

  return html || `
    <div style="
      padding:12px;
      background:#f9fafb;
      border-radius:10px;
    ">
      Transaksi sedang berjalan.
    </div>
  `;
}

// ============================================================
// CLOSE TRANSACTION
// ============================================================

function closeTransaction() {

  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }

  closeModal("transactionModal");

  currentTransaction = null;
}

// ============================================================
// COMPLETE WORK
// ============================================================

async function completeWork() {

  if (
    !currentTransaction ||
    !currentUser
  ) return;

  if (
    currentTransaction.providerId !==
    currentUser.uid
  ) {

    alert(
      "Hanya penyedia yang dapat menyelesaikan pekerjaan."
    );

    return;
  }

  try {

    const ref =
      doc(
        db,
        "needs",
        currentTransaction.needId,
        "transactions",
        currentTransaction.id
      );

    await updateDoc(
      ref,
      {
        providerCompleted: true,
        workStatus: "waiting_confirmation",
        updatedAt: serverTimestamp()
      }
    );

    currentTransaction =
      await getTransaction(
        currentTransaction.needId,
        currentTransaction.id
      );

    showTransactionModal(
      currentTransaction
    );

    showToast(
      "✅ Pekerjaan ditandai selesai."
    );

  } catch (error) {

    console.error(error);

    alert(
      "Gagal menyelesaikan pekerjaan:\n\n" +
      error.message
    );
  }
}

// ============================================================
// OWNER CONFIRM
// ============================================================

async function confirmWork() {

  if (
    !currentTransaction ||
    !currentUser
  ) return;

  if (
    currentTransaction.ownerId !==
    currentUser.uid
  ) {

    alert(
      "Hanya pemilik yang dapat mengonfirmasi."
    );

    return;
  }

  if (
    !currentTransaction.providerCompleted
  ) {

    alert(
      "Penyedia belum menyelesaikan pekerjaan."
    );

    return;
  }

  try {

    const ref =
      doc(
        db,
        "needs",
        currentTransaction.needId,
        "transactions",
        currentTransaction.id
      );

    await updateDoc(
      ref,
      {
        ownerConfirmed: true,
        updatedAt: serverTimestamp()
      }
    );

    await finalizeTransactionIfReady();

    currentTransaction =
      await getTransaction(
        currentTransaction.needId,
        currentTransaction.id
      );

    showTransactionModal(
      currentTransaction
    );

    showToast(
      "✅ Pekerjaan berhasil dikonfirmasi."
    );

  } catch (error) {

    console.error(error);

    alert(
      "Gagal mengonfirmasi pekerjaan:\n\n" +
      error.message
    );
  }
}

// ============================================================
// FINALIZE TRANSACTION
// ============================================================

async function finalizeTransactionIfReady() {

  if (!currentTransaction) return;

  const ref =
    doc(
      db,
      "needs",
      currentTransaction.needId,
      "transactions",
      currentTransaction.id
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) return;

  const transaction =
    snap.data();

  if (
    transaction.providerCompleted &&
    transaction.ownerConfirmed
  ) {

    await updateDoc(
      ref,
      {
        providerConfirmed: true,
        status: "completed",
        workStatus: "completed",
        paymentStatus:
          transaction.paymentStatus === "paid"
            ? "released"
            : transaction.paymentStatus,
        completedAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp()
      }
    );

    await updateDoc(
      doc(
        db,
        "needs",
        currentTransaction.needId
      ),
      {
        status: "completed",
        updatedAt: serverTimestamp()
      }
    );

    return;
  }
}

// ============================================================
// CHAT LISTENER
// ============================================================

function startChatListener(transaction) {

  const container =
    $("chatMessages");

  if (!container) return;

  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }

  const messagesRef =
    collection(
      db,
      "needs",
      transaction.needId,
      "transactions",
      transaction.id,
      "messages"
    );

  const q =
    query(
      messagesRef,
      orderBy("createdAt", "asc"),
      limit(200)
    );

  unsubscribeChat =
    onSnapshot(
      q,
      snapshot => {

        const messages = [];

        snapshot.forEach(item => {

          messages.push({
            id: item.id,
            ...item.data()
          });

        });

        renderChatMessages(messages);
      },
      error => {

        console.error(
          "CHAT ERROR:",
          error
        );

        container.innerHTML = `
          <div style="padding:15px">
            ⚠️ Gagal memuat chat.
            <br>
            <small>
              ${escapeHTML(error.message)}
            </small>
          </div>
        `;
      }
    );
}

// ============================================================
// RENDER CHAT
// ============================================================

function renderChatMessages(messages) {

  const container =
    $("chatMessages");

  if (!container) return;

  if (!messages.length) {

    container.innerHTML = `
      <div style="
        text-align:center;
        padding:50px 10px;
        color:#6b7280;
      ">
        💬 Belum ada pesan.
        <br>
        Mulai percakapan.
      </div>
    `;

    return;
  }

  container.innerHTML =
    messages
      .map(message => {

        const mine =
          message.senderId ===
          currentUser?.uid;

        return `
          <div style="
            display:flex;
            justify-content:${mine ? "flex-end" : "flex-start"};
            margin-bottom:10px;
          ">

            <div style="
              max-width:80%;
              padding:9px 12px;
              border-radius:12px;
              background:${mine ? "#2563eb" : "#ffffff"};
              color:${mine ? "#ffffff" : "#111827"};
              border:1px solid #e5e7eb;
            ">

              <div style="
                font-size:11px;
                opacity:.7;
                margin-bottom:3px;
              ">
                ${escapeHTML(
                  message.senderName || "Pengguna"
                )}
              </div>

              <div>
                ${escapeHTML(
                  message.text || ""
                )}
              </div>

            </div>

          </div>
        `;
      })
      .join("");

  container.scrollTop =
    container.scrollHeight;
}

// ============================================================
// SEND CHAT
// ============================================================

async function sendChatMessage(event) {

  event.preventDefault();

  if (
    !currentUser ||
    !currentTransaction
  ) return;

  const input =
    $("chatInput");

  if (!input) return;

  const text =
    String(input.value || "").trim();

  if (!text) return;

  if (
    currentTransaction.ownerId !==
      currentUser.uid &&
    currentTransaction.providerId !==
      currentUser.uid
  ) {

    alert(
      "Anda bukan pihak transaksi."
    );

    return;
  }

  input.disabled = true;

  try {

    await addDoc(
      collection(
        db,
        "needs",
        currentTransaction.needId,
        "transactions",
        currentTransaction.id,
        "messages"
      ),
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

    console.error(error);

    alert(
      "Gagal mengirim pesan:\n\n" +
      error.message
    );

  } finally {

    input.disabled = false;
    input.focus();
  }
}

// ============================================================
// EVENT FOR TRANSACTION BUTTONS
// ============================================================

document.addEventListener(
  "click",
  event => {

    const complete =
      event.target.closest(
        "#completeWorkBtn"
      );

    if (complete) {
      completeWork();
      return;
    }

    const confirm =
      event.target.closest(
        "#confirmWorkBtn"
      );

    if (confirm) {
      confirmWork();
      return;
    }

    const transaction =
      event.target.closest(
        "[data-transaction-id]"
      );

    if (transaction) {

      const needId =
        transaction.dataset.needId;

      const transactionId =
        transaction.dataset.transactionId;

      if (
        needId &&
        transactionId
      ) {

        window.openTransaction(
          needId,
          transactionId
        );
      }
    }
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

  if (!modal) return;

  modal.classList.remove("hidden");

  document.body.classList.add("modal-open");
}

function closeNeedModal() {
  closeModal("needModal");
}

// ============================================================
// CLOSE MODAL
// ============================================================

function closeModal(id) {

  const modal = $(id);

  if (!modal) return;

  modal.classList.add("hidden");

  document.body.classList.remove("modal-open");
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
// URL
// ============================================================

function openNeedFromURL() {

  if (!authReady) return;

  const params =
    new URLSearchParams(
      window.location.search
    );

  const needId =
    params.get("need");

  if (!needId) return;

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
// STATUS HELPERS
// ============================================================

function normalizeNeedStatus(status) {

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
    value === "in-progress" ||
    value === "progress" ||
    value === "dikerjakan"
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

function normalizeOfferStatus(status) {

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

function getNeedStatusText(status) {

  switch (
    normalizeNeedStatus(status)
  ) {

    case "completed":
      return "✅ Selesai";

    case "in_progress":
      return "🔨 Dalam Pengerjaan";

    case "cancelled":
      return "❌ Dibatalkan";

    default:
      return "🟢 Dibuka";
  }
}

function getStatusClass(status) {

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

function getStatusText(status) {

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

  if (!time) return "Baru saja";

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

  if (!Number.isFinite(number)) {
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

function avatar(name) {

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
        color: "#fff",
        fontWeight: "700",
        fontSize: "14px",
        boxShadow:
          "0 10px 30px rgba(0,0,0,.2)"
      }
    );

    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = "block";

  clearTimeout(toast._timer);

  toast._timer =
    setTimeout(
      () => {
        toast.style.display = "none";
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

  if (!container) return;

  container.innerHTML = `
    <div class="loading-box">
      <div class="empty-icon">🔐</div>
      <strong>Silakan login</strong>
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
// DOM EVENTS
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
            ?.classList.toggle("hidden");
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

          if (!button) return;

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
          event.key === "Escape"
        ) {

          closeModal("needModal");
          closeModal("detailModal");
          closeModal("offerModal");
          closeTransaction();
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
  },

  openTransaction:
    window.openTransaction
};

console.log(
  "✅ BUTUH script.js V2 transaksi + chat aktif"
);
