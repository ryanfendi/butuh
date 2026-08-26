// ============================================================
// BUTUH - SCRIPT.JS
// STABLE FIREBASE VERSION
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
// INIT
// ============================================================

let app;
let auth;
let db;

try {

  app =
    getApps().length
      ? getApp()
      : initializeApp(firebaseConfig);

  auth = getAuth(app);

  db = getFirestore(app);

  console.log("✅ Firebase berhasil diinisialisasi");

} catch (error) {

  console.error(
    "❌ FIREBASE INIT ERROR:",
    error
  );

  showFirebaseError(
    "Firebase gagal diinisialisasi",
    error
  );

}


// ============================================================
// STATE
// ============================================================

let currentUser = null;
let needsCache = [];
let unsubscribeNeeds = null;

let isSubmittingNeed = false;
let isSubmittingOffer = false;
let isUpdatingOffer = false;


// ============================================================
// HELPER
// ============================================================

function $(id) {
  return document.getElementById(id);
}


function setText(id, value) {

  const el = $(id);

  if (el) {
    el.textContent = String(value ?? "");
  }

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ============================================================
// FIREBASE ERROR
// ============================================================

function showFirebaseError(title, error) {

  console.error(title, error);

  const container =
    $("needsList");

  if (!container) {
    return;
  }

  container.innerHTML = `

    <div class="error-state"
      style="
        padding:25px;
        background:#fff1f2;
        border:1px solid #fecdd3;
        border-radius:15px;
      ">

      <div
        style="
          font-size:35px;
          margin-bottom:10px;
        "
      >
        ⚠️
      </div>

      <strong>
        ${escapeHTML(title)}
      </strong>

      <p
        style="
          margin-top:10px;
          color:#991b1b;
          word-break:break-word;
        "
      >
        ${escapeHTML(
          error?.message ||
          "Terjadi kesalahan Firebase."
        )}
      </p>

      <button
        id="reloadFirebase"
        class="btn btn-primary"
        type="button"
        style="margin-top:10px"
      >
        🔄 Muat Ulang
      </button>

    </div>

  `;

  $("reloadFirebase")
    ?.addEventListener(
      "click",
      () => window.location.reload()
    );

}


// ============================================================
// AUTH
// ============================================================

if (auth) {

  onAuthStateChanged(

    auth,

    async user => {

      console.log(
        "AUTH STATE:",
        user
      );

      currentUser = user;

      if (!user) {

        console.warn(
          "⚠️ Tidak ada user login"
        );

        showLoggedOut();

        return;

      }

      console.log(
        "✅ Login:",
        user.uid,
        user.email
      );

      updateUserUI(user);

      loadNeeds();

    },

    error => {

      console.error(
        "❌ AUTH ERROR:",
        error
      );

      showFirebaseError(
        "Firebase Authentication bermasalah",
        error
      );

    }

  );

}


// ============================================================
// AUTH TIMEOUT
// ============================================================

// Jangan biarkan halaman berputar selamanya.

setTimeout(
  () => {

    const container =
      $("needsList");

    if (
      container &&
      container.textContent.includes(
        "Memuat kebutuhan"
      )
    ) {

      console.warn(
        "⚠️ AUTH/FIREBASE TIMEOUT"
      );

      container.innerHTML = `

        <div class="error-state"
          style="
            padding:25px;
            text-align:center;
          "
        >

          <div style="font-size:40px">
            ⏳
          </div>

          <strong>
            Firebase tidak merespons
          </strong>

          <p>
            Koneksi Firebase/Auth belum berhasil.
          </p>

          <button
            class="btn btn-primary"
            type="button"
            onclick="location.reload()"
          >
            🔄 Coba Lagi
          </button>

        </div>

      `;

    }

  },
  10000
);


// ============================================================
// USER UI
// ============================================================

function updateUserUI(user) {

  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";

  const email =
    user.email || "";

  const photo =
    user.photoURL ||
    createAvatar(name);

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

  const userPhoto =
    $("userPhoto");

  const menuPhoto =
    $("menuUserPhoto");

  if (userPhoto) {
    userPhoto.src = photo;
  }

  if (menuPhoto) {
    menuPhoto.src = photo;
  }

}


// ============================================================
// LOAD NEEDS
// ============================================================

function loadNeeds() {

  console.log(
    "📡 Memuat kebutuhan..."
  );

  const container =
    $("needsList");

  if (!container) {

    console.error(
      "❌ needsList tidak ditemukan"
    );

    return;

  }

  if (!db) {

    showFirebaseError(
      "Firestore tidak tersedia",
      new Error("Database belum berhasil dibuat.")
    );

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

        console.log(
          "✅ FIRESTORE NEEDS:",
          snapshot.size
        );

        needsCache = [];

        snapshot.forEach(
          item => {

            needsCache.push({

              id: item.id,

              ...item.data()

            });

          }
        );


        needsCache.sort(
          (a, b) =>
            getTime(b.createdAt) -
            getTime(a.createdAt)
        );


        renderNeeds(
          needsCache
        );


        updateCounters(
          needsCache
        );

      },

      error => {

        console.error(
          "❌ FIRESTORE ERROR:",
          error
        );

        showFirebaseError(
          "Gagal membaca Firestore",
          error
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

        <div
          style="
            font-size:40px;
            margin-bottom:10px;
          "
        >
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
        createNeedCard
      )
      .join("");

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedCard(need) {

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

            ${escapeHTML(
              getCategory(
                need.category
              )
            )}

          </span>

          <h3>
            ${escapeHTML(
              need.title ||
              "Tanpa judul"
            )}
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
          truncate(
            need.description ||
            "",
            160
          )
        )}

      </p>


      <div class="need-footer">

        <div>

          <div class="need-budget">

            Rp ${formatMoney(
              need.budget
            )}

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

function updateCounters(needs) {

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
// SUBMIT NEED
// ============================================================

async function submitNeed(event) {

  event.preventDefault();

  if (isSubmittingNeed) {
    return;
  }

  if (!currentUser) {

    alert(
      "Silakan login terlebih dahulu."
    );

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

  const budget =
    Number(
      form.budget?.value ||
      0
    );

  const deadline =
    form.deadline?.value ||
    "";


  if (!title) {

    alert(
      "Judul wajib diisi."
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
    !Number.isFinite(budget) ||
    budget <= 0
  ) {

    alert(
      "Budget tidak valid."
    );

    return;

  }


  isSubmittingNeed = true;


  const button =
    $("submitNeed");

  if (button) {

    button.disabled = true;

    button.textContent =
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

    closeModal(
      "needModal"
    );

    showToast(
      "✅ Kebutuhan berhasil diposting"
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

      button.textContent =
        "🚀 Posting Kebutuhan";

    }

  }

}


// ============================================================
// OPEN DETAIL
// ============================================================

window.openNeedDetail =
  async function(needId) {

    if (!needId) {
      return;
    }


    let need =
      needsCache.find(
        item =>
          item.id === needId
      );


    if (!need) {

      try {

        const snap =
          await getDoc(
            doc(
              db,
              "needs",
              needId
            )
          );

        if (!snap.exists()) {

          alert(
            "Kebutuhan tidak ditemukan."
          );

          return;

        }

        need = {

          id: snap.id,

          ...snap.data()

        };

      } catch (error) {

        alert(
          "Gagal membuka kebutuhan:\n\n" +
          error.message
        );

        return;

      }

    }


    showNeedDetail(
      need
    );

  };


// ============================================================
// DETAIL
// ============================================================

async function showNeedDetail(need) {

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


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="detailBackdrop"
    ></div>

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            DETAIL
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

        <p style="line-height:1.7">
          ${escapeHTML(
            need.description ||
            ""
          )}
        </p>


        <div
          style="
            padding:18px;
            margin:20px 0;
            background:#eff6ff;
            border-radius:12px;
          "
        >

          <small>
            Budget
          </small>

          <div
            style="
              font-size:25px;
              font-weight:800;
              color:#2563eb;
            "
          >

            Rp ${formatMoney(
              need.budget
            )}

          </div>

        </div>


        <div>

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

        </div>


        ${
          owner
            ? `

              <div
                style="
                  margin-top:25px
                "
              >

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


  if (owner) {

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
// INCOMING OFFERS
// ============================================================

async function loadIncomingOffers(need) {

  const container =
    $("incomingOffersList");

  if (!container) {
    return;
  }


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

        </div>

      `;

      return;

    }


    container.innerHTML =
      offers
        .map(
          offer =>
            createOfferCard(
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

              await updateOfferStatus(

                need,

                button.dataset.offerId,

                button.dataset.offerAction

              );

            }
          );

        }
      );


  } catch (error) {

    console.error(
      "LOAD OFFERS ERROR:",
      error
    );

    container.innerHTML = `

      <div
        style="
          padding:15px;
          background:#fff1f2;
          color:#991b1b;
          border-radius:12px;
        "
      >

        ⚠️ Gagal memuat penawaran

        <br><br>

        ${escapeHTML(
          error.message
        )}

      </div>

    `;

  }

}


// ============================================================
// OFFER CARD
// ============================================================

function createOfferCard(
  need,
  offer
) {

  const status =
    normalizeStatus(
      offer.status
    );


  return `

    <div
      class="history-card"
      style="margin-top:12px"
    >

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

        </div>


        ${
          status === "pending"
            ? `

              <div
                style="
                  display:flex;
                  gap:8px;
                  margin-top:12px;
                  flex-wrap:wrap;
                "
              >

                <button
                  class="btn btn-primary"
                  type="button"
                  data-offer-action="accepted"
                  data-offer-id="${escapeHTML(
                    offer.id
                  )}"
                >
                  ✓ Terima
                </button>

                <button
                  class="btn btn-outline"
                  type="button"
                  data-offer-action="rejected"
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


      <span
        class="status ${
          getStatusClass(status)
        }"
      >

        ${getStatusText(status)}

      </span>

    </div>

  `;

}


// ============================================================
// UPDATE OFFER
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


  isUpdatingOffer = true;


  try {

    console.log(
      "Mengubah offer:",
      need.id,
      offerId,
      newStatus
    );


    await updateDoc(

      doc(
        db,
        "needs",
        need.id,
        "offers",
        offerId
      ),

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
        ? "🎉 Penawaran diterima!"
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

    isUpdatingOffer = false;

  }

}


// ============================================================
// OFFER FORM
// ============================================================

function openOfferForm(need) {

  if (!currentUser) {

    alert(
      "Silakan login terlebih dahulu."
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

          <h2>
            💰 Ajukan Penawaran
          </h2>

          <p>
            ${escapeHTML(
              need.title ||
              ""
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
            Harga Penawaran
          </label>

          <input
            name="price"
            type="number"
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
            required
          ></textarea>

        </div>


        <div class="modal-actions">

          <button
            type="button"
            class="btn btn-outline"
            id="cancelOffer"
          >
            Batal
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            id="submitOffer"
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

    alert(
      "Login terlebih dahulu."
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
    price <= 0 ||
    !duration ||
    !message
  ) {

    alert(
      "Semua data penawaran wajib diisi."
    );

    return;

  }


  isSubmittingOffer = true;


  const button =
    $("submitOffer");

  if (button) {

    button.disabled = true;

    button.textContent =
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

    isSubmittingOffer = false;

    if (button) {

      button.disabled = false;

      button.textContent =
        "💰 Kirim Penawaran";

    }

  }

}


// ============================================================
// MODAL
// ============================================================

function openNeedModal() {

  if (!currentUser) {

    alert(
      "Silakan login terlebih dahulu."
    );

    return;

  }


  $("needModal")
    ?.classList.remove(
      "hidden"
    );

  document.body.classList.add(
    "modal-open"
  );

}


function closeModal(id) {

  const modal =
    $(id);

  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

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
    value === "diterima"
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
    value === "selesai"
  ) {

    return "completed";

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
// FORMAT
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
    ? value.substring(
        0,
        length
      ) + "..."
    : value;

}


// ============================================================
// AVATAR
// ============================================================

function createAvatar(name) {

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
        transform:
          "translateX(-50%)",
        zIndex: "999999",
        padding:
          "13px 20px",
        borderRadius:
          "999px",
        background:
          "#111827",
        color:
          "#ffffff",
        fontWeight:
          "700"

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

  if (container) {

    container.innerHTML = `

      <div class="loading-box">

        <div style="font-size:40px">
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
        () =>
          closeModal(
            "needModal"
          )
      );


    $("cancelNeed")
      ?.addEventListener(
        "click",
        () =>
          closeModal(
            "needModal"
          )
      );


    $("needBackdrop")
      ?.addEventListener(
        "click",
        () =>
          closeModal(
            "needModal"
          )
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


          window.openNeedDetail(
            needId
          );

        }
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
  "🚀 BUTUH script.js STABLE aktif"
);
