// ============================================================
// PROFILE.JS
// BUTUH - Profil Pengguna
// Versi CEPAT
//
// Cocok dengan:
// - firebase.js
// - script.js
// - profile.html
//
// Struktur Firestore:
//
// needs/{needId}
//   ownerId
//   title
//   description
//   category
//   budget
//   deadline
//   status
//   createdAt
//
// needs/{needId}/offers/{offerId}
//   providerId
//   providerName
//   providerEmail
//   providerPhoto
//   price
//   duration
//   message
//   status
//   createdAt
// ============================================================


import {
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase.js";


// ============================================================
// CONFIG
// ============================================================

const MAX_NEEDS = 100;
const MAX_OFFERS = 200;
const LOAD_TIMEOUT = 10000;


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let isLoadingNeeds = false;
let isLoadingOffers = false;


// ============================================================
// HELPER $
// ============================================================

function $(id) {
  return document.getElementById(id);
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

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


// ============================================================
// TIMEOUT
// ============================================================

function withTimeout(
  promise,
  timeout = LOAD_TIMEOUT
) {

  let timer;

  const timeoutPromise =
    new Promise(
      (_, reject) => {

        timer = setTimeout(
          () => {

            reject(
              new Error(
                "Pengambilan data terlalu lama."
              )
            );

          },
          timeout
        );

      }
    );


  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(
    () => clearTimeout(timer)
  );
}


// ============================================================
// FIRESTORE TIMESTAMP
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
      value.seconds !== undefined
    ) {

      return (
        Number(value.seconds) *
        1000
      );

    }


    const date =
      new Date(value);


    const time =
      date.getTime();


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
// FORMAT RUPIAH
// ============================================================

function formatRupiah(value) {

  const number =
    Number(value || 0);


  if (
    !Number.isFinite(number)
  ) {

    return "Rp 0";

  }


  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }
  ).format(number);

}


// ============================================================
// CATEGORY
// ============================================================

function getCategory(value) {

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
// STATUS
// ============================================================

function normalizeStatus(value) {

  return String(
    value ||
    "pending"
  )
    .trim()
    .toLowerCase();

}


function getStatusText(status) {

  switch (
    normalizeStatus(status)
  ) {

    case "accepted":
    case "accept":
    case "diterima":
      return "Diterima";


    case "completed":
    case "complete":
    case "selesai":
      return "Selesai";


    case "rejected":
    case "reject":
    case "ditolak":
      return "Ditolak";


    case "cancelled":
    case "canceled":
    case "cancel":
    case "dibatalkan":
      return "Dibatalkan";


    case "pending":
    case "menunggu":
      return "Menunggu";


    default:
      return status || "Menunggu";

  }

}


function getStatusClass(status) {

  switch (
    normalizeStatus(status)
  ) {

    case "accepted":
    case "accept":
    case "diterima":
      return "status-success";


    case "completed":
    case "complete":
    case "selesai":
      return "status-completed";


    case "rejected":
    case "reject":
    case "ditolak":
      return "status-danger";


    case "cancelled":
    case "canceled":
    case "cancel":
    case "dibatalkan":
      return "status-danger";


    default:
      return "status-pending";

  }

}


// ============================================================
// TOAST
// ============================================================

function showToast(
  message,
  type = "info"
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

    toast.style.position =
      "fixed";

    toast.style.left =
      "50%";

    toast.style.bottom =
      "20px";

    toast.style.transform =
      "translateX(-50%)";

    toast.style.zIndex =
      "999999";

    toast.style.padding =
      "12px 18px";

    toast.style.borderRadius =
      "999px";

    toast.style.color =
      "#fff";

    toast.style.fontWeight =
      "700";

    toast.style.fontSize =
      "14px";

    toast.style.boxShadow =
      "0 10px 30px rgba(0,0,0,.2)";

    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  if (type === "error") {

    toast.style.background =
      "#dc2626";

  }

  else if (
    type === "success"
  ) {

    toast.style.background =
      "#16a34a";

  }

  else {

    toast.style.background =
      "#111827";

  }


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
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    currentUser =
      user;


    if (!user) {

      showLoggedOut();

      return;

    }


    console.log(
      "Profile login:",
      user.uid
    );


    renderProfile(
      user
    );


    /*
      Jalankan bersamaan.
      Tidak perlu menunggu kebutuhan
      selesai baru mengambil offers.
    */

    await Promise.allSettled([

      loadNeeds(
        user.uid
      ),

      loadOffers(
        user.uid
      )

    ]);

  }
);


// ============================================================
// PROFILE UI
// ============================================================

function renderProfile(user) {

  const name =
    user.displayName ||
    (
      user.email
        ? user.email.split("@")[0]
        : "Pengguna"
    );


  const email =
    user.email ||
    "";


  const photo =
    user.photoURL ||
    avatar(name);


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


  if (src) {

    element.src =
      src;

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


  if (!element) {
    return;
  }


  element.textContent =
    String(
      value ?? ""
    );

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
// LOAD NEEDS
//
// PENTING:
//
// Tidak memakai:
// orderBy()
// Tidak memakai:
// collectionGroup()
//
// Query:
//
// needs
// where ownerId == currentUser.uid
//
// Ini harus cocok dengan script.js Anda.
// ============================================================

async function loadNeeds(
  uid
) {

  if (!uid) {
    return;
  }


  if (isLoadingNeeds) {
    return;
  }


  isLoadingNeeds =
    true;


  const container =
    $("needsList");


  if (!container) {

    isLoadingNeeds =
      false;

    return;

  }


  showNeedsLoading();


  try {

    console.log(
      "Memuat riwayat kebutuhan..."
    );


    const needsRef =
      collection(
        db,
        "needs"
      );


    const needsQuery =
      query(

        needsRef,

        where(
          "ownerId",
          "==",
          uid
        ),

        limit(
          MAX_NEEDS
        )

      );


    const snapshot =
      await withTimeout(
        getDocs(
          needsQuery
        )
      );


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


    /*
      Sort client-side.
      Tidak membutuhkan index.
    */

    needs.sort(
      (a, b) => {

        return (
          getTime(
            b.createdAt
          ) -
          getTime(
            a.createdAt
          )
        );

      }
    );


    console.log(
      "Riwayat kebutuhan:",
      needs.length
    );


    setText(
      "totalNeeds",
      needs.length
    );


    renderNeeds(
      needs
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

    isLoadingNeeds =
      false;

  }

}


// ============================================================
// NEEDS LOADING
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

      <strong>
        Memuat kebutuhan...
      </strong>

      <div style="
        margin-top:6px;
        font-size:13px;
      ">
        Mengambil data Anda
      </div>

    </div>

  `;

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

      <div class="empty-state">

        <div class="empty-icon">
          📋
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <p>
          Kebutuhan yang Anda posting
          akan muncul di sini.
        </p>

        <button
          type="button"
          id="postFirstNeed"
          class="btn btn-primary"
          style="margin-top:10px"
        >
          + Posting Kebutuhan
        </button>

      </div>

    `;


    $("postFirstNeed")
      ?.addEventListener(
        "click",
        () => {

          window.location.href =
            "index.html";

        }
      );


    return;

  }


  container.innerHTML =
    needs
      .map(
        createNeedHistoryCard
      )
      .join("");


  attachNeedButtons();

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedHistoryCard(
  need
) {

  const id =
    escapeHTML(
      need.id
    );


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
        180
      )
    );


  const category =
    escapeHTML(
      getCategory(
        need.category
      )
    );


  const budget =
    formatRupiah(
      need.budget
    );


  const date =
    formatDate(
      need.createdAt
    );


  const status =
    normalizeStatus(
      need.status ||
      "open"
    );


  let statusLabel =
    "Aktif";


  let statusClass =
    "status-success";


  if (
    status === "closed" ||
    status === "close"
  ) {

    statusLabel =
      "Ditutup";

    statusClass =
      "status-danger";

  }

  else if (
    status === "completed" ||
    status === "complete" ||
    status === "selesai"
  ) {

    statusLabel =
      "Selesai";

    statusClass =
      "status-completed";

  }


  return `

    <article
      class="history-card"
    >

      <div class="history-main">

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
          margin-bottom:8px;
        ">

          <span style="
            display:inline-block;
            padding:5px 9px;
            border-radius:999px;
            background:#eff6ff;
            color:#2563eb;
            font-size:12px;
            font-weight:700;
          ">
            ${category}
          </span>


          <span
            class="status ${statusClass}"
          >
            ${statusLabel}
          </span>

        </div>


        <h3>
          ${title}
        </h3>


        ${
          description
            ? `
              <p>
                ${description}
              </p>
            `
            : ""
        }


        <div class="history-meta">

          <span>
            💰 ${budget}
          </span>

          <span>
            📅 ${date}
          </span>

          ${
            need.deadline
              ? `
                <span>
                  ⏰ Deadline:
                  ${escapeHTML(
                    formatDateOnly(
                      need.deadline
                    )
                  )}
                </span>
              `
              : ""
          }

        </div>

      </div>


      <div style="
        display:flex;
        align-items:center;
      ">

        <button
          type="button"
          class="btn btn-outline view-need-btn"
          data-id="${id}"
        >
          Lihat Kebutuhan
        </button>

      </div>

    </article>

  `;

}


// ============================================================
// ATTACH NEED BUTTONS
// ============================================================

function attachNeedButtons() {

  document
    .querySelectorAll(
      ".view-need-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;


            if (!id) {
              return;
            }


            /*
              Gunakan detail.html
              yang sebelumnya sudah
              berhasil Anda perbaiki.
            */

            window.location.href =
              "detail.html?id=" +
              encodeURIComponent(id);

          }
        );

      }
    );

}


// ============================================================
// LOAD OFFERS
//
// Struktur:
//
// needs/{needId}/offers/{offerId}
//
// Karena itu menggunakan
// collectionGroup("offers").
// ============================================================

async function loadOffers(
  uid
) {

  if (!uid) {
    return;
  }


  if (isLoadingOffers) {
    return;
  }


  isLoadingOffers =
    true;


  const container =
    $("offersList");


  if (!container) {

    isLoadingOffers =
      false;

    return;

  }


  showOffersLoading();


  try {

    console.log(
      "Memuat riwayat penawaran..."
    );


    /*
      collectionGroup mencari semua
      subcollection bernama "offers".

      Contoh:

      needs/ABC/offers/123
      needs/DEF/offers/456
      needs/GHI/offers/789

      lalu filter:

      providerId == UID
    */

    const offersRef =
      collectionGroup(
        db,
        "offers"
      );


    const offersQuery =
      query(

        offersRef,

        where(
          "providerId",
          "==",
          uid
        ),

        limit(
          MAX_OFFERS
        )

      );


    const snapshot =
      await withTimeout(
        getDocs(
          offersQuery
        )
      );


    const offers = [];


    snapshot.forEach(
      item => {

        offers.push({

          id:
            item.id,

          path:
            item.ref.path,

          ...item.data()

        });

      }
    );


    /*
      Sort di browser.
    */

    offers.sort(
      (a, b) => {

        return (
          getTime(
            b.createdAt
          ) -
          getTime(
            a.createdAt
          )
        );

      }
    );


    console.log(
      "Riwayat penawaran:",
      offers.length
    );


    setText(
      "totalOffers",
      offers.length
    );


    updateOfferStatistics(
      offers
    );


    await renderOffers(
      offers
    );


  } catch (error) {

    console.error(
      "LOAD OFFERS ERROR:",
      error
    );


    showOffersError(
      error
    );


  } finally {

    isLoadingOffers =
      false;

  }

}


// ============================================================
// OFFER STATISTICS
// ============================================================

function updateOfferStatistics(
  offers
) {

  let accepted =
    0;


  let completed =
    0;


  offers.forEach(
    offer => {

      const status =
        normalizeStatus(
          offer.status
        );


      if (
        status === "accepted" ||
        status === "accept" ||
        status === "diterima"
      ) {

        accepted++;

      }


      if (
        status === "completed" ||
        status === "complete" ||
        status === "selesai"
      ) {

        completed++;

      }

    }
  );


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
// OFFERS LOADING
// ============================================================

function showOffersLoading() {

  const container =
    $("offersList");


  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="loading-state">

      <div class="spinner"></div>

      <strong>
        Memuat penawaran...
      </strong>

      <div style="
        margin-top:6px;
        font-size:13px;
      ">
        Mengambil riwayat Anda
      </div>

    </div>

  `;

}


// ============================================================
// RENDER OFFERS
// ============================================================

async function renderOffers(
  offers
) {

  const container =
    $("offersList");


  if (!container) {
    return;
  }


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
          Penawaran yang Anda kirim
          akan muncul di sini.
        </p>

      </div>

    `;

    return;

  }


  /*
    Ambil kebutuhan induk secara paralel.

    Dari path:

    needs/{needId}/offers/{offerId}

    kita bisa mendapatkan
    needId dari path Firestore.
  */

  const cards =
    await Promise.all(

      offers.map(
        async offer => {

          const needId =
            getNeedIdFromOffer(
              offer
            );


          let need =
            null;


          if (needId) {

            need =
              await getNeed(
                needId
              );

          }


          return createOfferHistoryCard(
            offer,
            need,
            needId
          );

        }
      )

    );


  container.innerHTML =
    cards.join("");


  attachOfferButtons();

}


// ============================================================
// GET NEED ID FROM OFFER
// ============================================================

function getNeedIdFromOffer(
  offer
) {

  /*
    Path:

    needs/ABC/offers/XYZ

    split:

    ["needs","ABC","offers","XYZ"]

    index 1 = ABC
  */

  if (
    offer.path
  ) {

    const parts =
      offer.path.split("/");


    if (
      parts.length >= 4 &&
      parts[0] === "needs" &&
      parts[2] === "offers"
    ) {

      return parts[1];

    }

  }


  /*
    Fallback jika data offer
    sudah menyimpan needId.
  */

  return (
    offer.needId ||
    offer.requirementId ||
    offer.requestId ||
    offer.postId ||
    ""
  );

}


// ============================================================
// GET NEED
// ============================================================

async function getNeed(
  needId
) {

  if (!needId) {
    return null;
  }


  try {

    const reference =
      doc(
        db,
        "needs",
        needId
      );


    const snapshot =
      await getDoc(
        reference
      );


    if (
      !snapshot.exists()
    ) {

      return null;

    }


    return {

      id:
        snapshot.id,

      ...snapshot.data()

    };

  } catch (error) {

    console.warn(
      "Gagal mengambil kebutuhan:",
      needId,
      error
    );


    return null;

  }

}


// ============================================================
// OFFER CARD
// ============================================================

function createOfferHistoryCard(
  offer,
  need,
  needId
) {

  const title =
    need?.title ||
    offer.needTitle ||
    offer.requirementTitle ||
    "Kebutuhan";


  const description =
    need?.description ||
    "";


  const price =
    offer.price ??
    offer.offerPrice ??
    offer.amount ??
    offer.bidAmount ??
    0;


  const duration =
    offer.duration ||
    "-";


  const message =
    offer.message ||
    offer.note ||
    "";


  const date =
    formatDate(
      offer.createdAt
    );


  const status =
    normalizeStatus(
      offer.status
    );


  const statusText =
    getStatusText(
      status
    );


  const statusClass =
    getStatusClass(
      status
    );


  return `

    <article
      class="history-card"
    >

      <div class="history-main">

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
          margin-bottom:8px;
        ">

          <span
            class="status ${statusClass}"
          >
            ${escapeHTML(
              statusText
            )}
          </span>

        </div>


        <h3>
          ${escapeHTML(title)}
        </h3>


        ${
          description
            ? `
              <p>
                ${escapeHTML(
                  truncate(
                    description,
                    180
                  )
                )}
              </p>
            `
            : ""
        }


        <div class="history-meta">

          <span>
            💰
            <strong
              class="offer-price"
            >
              ${formatRupiah(price)}
            </strong>
          </span>


          <span>
            ⏱️
            ${escapeHTML(
              duration
            )}
          </span>


          <span>
            📅
            ${escapeHTML(date)}
          </span>

        </div>


        ${
          message
            ? `
              <div style="
                margin-top:12px;
                padding:11px 13px;
                background:#f9fafb;
                border-radius:10px;
                color:#4b5563;
                font-size:13px;
                line-height:1.5;
              ">
                <strong>
                  Pesan:
                </strong>

                ${escapeHTML(
                  message
                )}
              </div>
            `
            : ""
        }

      </div>


      <div style="
        display:flex;
        align-items:center;
      ">

        ${
          needId
            ? `
              <button
                type="button"
                class="btn btn-outline view-offer-need-btn"
                data-id="${escapeHTML(
                  needId
                )}"
              >
                Lihat Kebutuhan
              </button>
            `
            : `
              <span
                class="status status-danger"
              >
                Kebutuhan tidak ditemukan
              </span>
            `
        }

      </div>

    </article>

  `;

}


// ============================================================
// OFFER BUTTON
// ============================================================

function attachOfferButtons() {

  document
    .querySelectorAll(
      ".view-offer-need-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const needId =
              button.dataset.id;


            if (!needId) {
              return;
            }


            window.location.href =
              "detail.html?id=" +
              encodeURIComponent(
                needId
              );

          }
        );

      }
    );

}


// ============================================================
// NEED ERROR
// ============================================================

function showNeedsError(
  error
) {

  const container =
    $("needsList");


  if (!container) {
    return;
  }


  const message =
    getFirestoreErrorMessage(
      error
    );


  container.innerHTML = `

    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

      <strong>
        Gagal memuat riwayat kebutuhan
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        type="button"
        id="retryNeeds"
        class="btn btn-primary"
        style="margin-top:10px"
      >
        🔄 Coba Lagi
      </button>

    </div>

  `;


  $("retryNeeds")
    ?.addEventListener(
      "click",
      () => {

        if (
          currentUser
        ) {

          loadNeeds(
            currentUser.uid
          );

        }

      }
    );

}


// ============================================================
// OFFER ERROR
// ============================================================

function showOffersError(
  error
) {

  const container =
    $("offersList");


  if (!container) {
    return;
  }


  const message =
    getFirestoreErrorMessage(
      error
    );


  container.innerHTML = `

    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

      <strong>
        Gagal memuat riwayat penawaran
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        type="button"
        id="retryOffers"
        class="btn btn-primary"
        style="margin-top:10px"
      >
        🔄 Coba Lagi
      </button>

    </div>

  `;


  $("retryOffers")
    ?.addEventListener(
      "click",
      () => {

        if (
          currentUser
        ) {

          loadOffers(
            currentUser.uid
          );

        }

      }
    );

}


// ============================================================
// FIRESTORE ERROR MESSAGE
// ============================================================

function getFirestoreErrorMessage(
  error
) {

  const code =
    String(
      error?.code ||
      ""
    ).toLowerCase();


  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    code.includes(
      "permission-denied"
    ) ||
    message.includes(
      "permission"
    )
  ) {

    return (
      "Akses Firestore ditolak. " +
      "Periksa Firestore Rules."
    );

  }


  if (
    code.includes(
      "failed-precondition"
    ) ||
    message.includes(
      "index"
    )
  ) {

    return (
      "Firestore membutuhkan index. " +
      "Buat index yang diminta Firebase Console."
    );

  }


  if (
    code.includes(
      "unavailable"
    ) ||
    message.includes(
      "network"
    )
  ) {

    return (
      "Koneksi ke Firestore bermasalah."
    );

  }


  if (
    message.includes(
      "terlalu lama"
    )
  ) {

    return (
      "Pengambilan data terlalu lama."
    );

  }


  return (
    error?.message ||
    "Terjadi kesalahan saat mengambil data."
  );

}


// ============================================================
// FORMAT DATE ONLY
// ============================================================

function formatDateOnly(
  value
) {

  if (!value) {
    return "-";
  }


  /*
    Deadline dari HTML date:
    YYYY-MM-DD
  */

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {

    const parts =
      value.split("-");


    return (
      parts[2] +
      "-" +
      parts[1] +
      "-" +
      parts[0]
    );

  }


  return formatDate(value);

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
    value.length <= length
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
// LOGGED OUT
// ============================================================

function showLoggedOut() {

  setText(
    "profileName",
    "Belum Login"
  );


  setText(
    "profileEmail",
    "Silakan login terlebih dahulu"
  );


  setText(
    "totalNeeds",
    "0"
  );


  setText(
    "totalOffers",
    "0"
  );


  setText(
    "acceptedOffers",
    "0"
  );


  setText(
    "completedOffers",
    "0"
  );


  setText(
    "ratingValue",
    "Belum ada rating"
  );


  const needs =
    $("needsList");


  if (needs) {

    needs.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          🔐
        </div>

        <strong>
          Silakan login terlebih dahulu
        </strong>

        <p>
          Login untuk melihat riwayat kebutuhan.
        </p>

        <a
          href="login.html"
          class="btn btn-primary"
          style="
            display:inline-block;
            margin-top:10px;
          "
        >
          Login
        </a>

      </div>

    `;

  }


  const offers =
    $("offersList");


  if (offers) {

    offers.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          🔐
        </div>

        <strong>
          Silakan login terlebih dahulu
        </strong>

      </div>

    `;

  }

}


// ============================================================
// PROFILE UPDATE
// ============================================================

async function saveProfileName(
  name
) {

  if (!currentUser) {

    showToast(
      "Silakan login terlebih dahulu.",
      "error"
    );

    return;

  }


  const cleanName =
    String(
      name ||
      ""
    ).trim();


  if (!cleanName) {

    showToast(
      "Nama tidak boleh kosong.",
      "error"
    );

    return;

  }


  try {

    await withTimeout(
      updateProfile(
        currentUser,
        {
          displayName:
            cleanName
        }
      )
    );


    renderProfile(
      currentUser
    );


    showToast(
      "Profil berhasil diperbarui.",
      "success"
    );


  } catch (error) {

    console.error(
      "PROFILE UPDATE:",
      error
    );


    showToast(
      "Gagal memperbarui profil.",
      "error"
    );

  }

}


// ============================================================
// GLOBAL DEBUG / REFRESH
// ============================================================

window.reloadProfileData =
  function() {

    if (!currentUser) {

      showToast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;

    }


    loadNeeds(
      currentUser.uid
    );


    loadOffers(
      currentUser.uid
    );

  };


window.profileDebug = {

  getUser() {

    return currentUser;

  },


  reloadNeeds() {

    if (
      currentUser
    ) {

      return loadNeeds(
        currentUser.uid
      );

    }

  },


  reloadOffers() {

    if (
      currentUser
    ) {

      return loadOffers(
        currentUser.uid
      );

    }

  }

};


// ============================================================
// START
// ============================================================

console.log(
  "✅ profile.js cepat aktif"
);

console.log(
  "📋 Struktur needs: needs/{needId}"
);

console.log(
  "💰 Struktur offers: needs/{needId}/offers/{offerId}"
);
