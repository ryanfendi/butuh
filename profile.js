// ============================================================
// PROFILE.JS - BUTUH
// VERSI CEPAT
// Cocok dengan firebase.js Firebase 12.1.0
// Struktur:
// needs/{needId}
// needs/{needId}/offers/{offerId}
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

const MAX_OFFERS = 100;
const MAX_NEEDS = 100;

const LOAD_TIMEOUT = 10000;


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let loadingOffers = false;
let loadingNeeds = false;

let needsCache = new Map();


// ============================================================
// HELPER DOM
// ============================================================

function $(selector) {
  return document.querySelector(selector);
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
// RUPIAH
// ============================================================

function formatRupiah(value) {

  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}


// ============================================================
// FIRESTORE DATE
// ============================================================

function timestampToDate(value) {

  if (!value) {
    return null;
  }

  try {

    if (typeof value.toDate === "function") {
      return value.toDate();
    }

    if (typeof value.toMillis === "function") {
      return new Date(value.toMillis());
    }

    if (
      typeof value === "object" &&
      value.seconds !== undefined
    ) {

      return new Date(
        Number(value.seconds) * 1000
      );
    }

    if (value instanceof Date) {
      return value;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;

  } catch (error) {

    return null;
  }
}


// ============================================================
// TIME
// ============================================================

function timestampValue(value) {

  const date = timestampToDate(value);

  if (!date) {
    return 0;
  }

  return date.getTime();
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

  const date = timestampToDate(value);

  if (!date) {
    return "-";
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
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
    new Promise((_, reject) => {

      timer = setTimeout(() => {

        reject(
          new Error(
            "Permintaan terlalu lama."
          )
        );

      }, timeout);

    });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {

    clearTimeout(timer);

  });
}


// ============================================================
// TOAST
// ============================================================

function toast(
  message,
  type = "info"
) {

  let element =
    document.getElementById(
      "profileToast"
    );

  if (!element) {

    element =
      document.createElement(
        "div"
      );

    element.id =
      "profileToast";

    element.style.position =
      "fixed";

    element.style.left =
      "50%";

    element.style.bottom =
      "20px";

    element.style.transform =
      "translateX(-50%)";

    element.style.zIndex =
      "999999";

    element.style.padding =
      "12px 18px";

    element.style.borderRadius =
      "12px";

    element.style.color =
      "#fff";

    element.style.fontSize =
      "14px";

    element.style.fontWeight =
      "700";

    element.style.boxShadow =
      "0 10px 30px rgba(0,0,0,.2)";

    document.body.appendChild(
      element
    );

  }

  element.textContent =
    message;

  if (type === "success") {

    element.style.background =
      "#16a34a";

  } else if (type === "error") {

    element.style.background =
      "#dc2626";

  } else {

    element.style.background =
      "#111827";

  }

  clearTimeout(
    element._timer
  );

  element._timer =
    setTimeout(() => {

      element.remove();

    }, 3000);

}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    currentUser =
      user || null;

    if (!user) {

      showNotLoggedIn();

      return;
    }

    console.log(
      "✅ PROFILE USER:",
      user.uid
    );

    renderProfile(
      user
    );

    // Jalankan bersamaan agar cepat
    await Promise.allSettled([

      loadMyNeeds(
        user.uid
      ),

      loadMyOffers(
        user.uid
      )

    ]);

  }
);


// ============================================================
// PROFILE ELEMENT
// ============================================================

function getProfileNameElement() {

  return (
    $("#profileName") ||
    $("#userName") ||
    $("#displayName") ||
    $("#menuUserName")
  );

}


function getProfileEmailElement() {

  return (
    $("#profileEmail") ||
    $("#userEmail") ||
    $("#menuUserEmail")
  );

}


function getProfilePhotoElement() {

  return (
    $("#profilePhoto") ||
    $("#userAvatar") ||
    $("#profileImage")
  );

}


function getNameInput() {

  return (
    $("#nameInput") ||
    $("#displayNameInput") ||
    $("#profileNameInput")
  );

}


function getOffersContainer() {

  return (
    $("#offersContainer") ||
    $("#offerHistory") ||
    $("#offersList") ||
    $("#riwayatPenawaran")
  );

}


function getNeedsContainer() {

  return (
    $("#needsContainer") ||
    $("#needsHistory") ||
    $("#myNeedsList") ||
    $("#riwayatKebutuhan") ||
    $("#userNeedsList")
  );

}


// ============================================================
// RENDER PROFILE
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
    "-";

  const nameElement =
    getProfileNameElement();

  const emailElement =
    getProfileEmailElement();

  const photoElement =
    getProfilePhotoElement();

  const input =
    getNameInput();


  if (nameElement) {

    nameElement.textContent =
      name;

  }


  if (emailElement) {

    emailElement.textContent =
      email;

  }


  if (input) {

    input.value =
      user.displayName || "";

  }


  if (
    photoElement &&
    user.photoURL
  ) {

    photoElement.src =
      user.photoURL;

  }

}


// ============================================================
// NOT LOGIN
// ============================================================

function showNotLoggedIn() {

  const offers =
    getOffersContainer();

  const needs =
    getNeedsContainer();


  if (offers) {

    offers.innerHTML = `

      <div style="
        padding:35px 15px;
        text-align:center;
        color:#6b7280;
      ">

        <div style="
          font-size:42px;
          margin-bottom:10px;
        ">
          🔐
        </div>

        <strong>
          Silakan login terlebih dahulu
        </strong>

        <p style="
          margin-top:8px;
          font-size:14px;
        ">
          Login untuk melihat riwayat penawaran.
        </p>

      </div>

    `;

  }


  if (needs) {

    needs.innerHTML = `

      <div style="
        padding:35px 15px;
        text-align:center;
        color:#6b7280;
      ">

        <div style="
          font-size:42px;
          margin-bottom:10px;
        ">
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
// LOAD MY NEEDS
// ============================================================

async function loadMyNeeds(
  ownerId
) {

  if (!ownerId) {
    return;
  }

  if (loadingNeeds) {
    return;
  }

  loadingNeeds =
    true;


  const container =
    getNeedsContainer();


  if (!container) {

    console.warn(
      "Container riwayat kebutuhan tidak ditemukan."
    );

    loadingNeeds =
      false;

    return;
  }


  // Jangan tampilkan spinner terus
  container.innerHTML = `

    <div style="
      padding:25px;
      text-align:center;
      color:#6b7280;
    ">

      <div style="
        font-size:30px;
        margin-bottom:8px;
      ">
        📌
      </div>

      <strong>
        Memuat kebutuhan...
      </strong>

    </div>

  `;


  try {

    console.log(
      "📌 Mengambil kebutuhan user:",
      ownerId
    );


    const needsRef =
      collection(
        db,
        "needs"
      );


    /*
      HANYA where ownerId.

      Tidak menggunakan orderBy.

      Jadi tidak membutuhkan
      composite index.
    */

    const q =
      query(

        needsRef,

        where(
          "ownerId",
          "==",
          ownerId
        ),

        limit(
          MAX_NEEDS
        )

      );


    const snapshot =
      await withTimeout(
        getDocs(q)
      );


    const needs = [];


    snapshot.forEach(
      item => {

        const data =
          item.data();


        const need = {

          id:
            item.id,

          ...data

        };


        needs.push(
          need
        );


        needsCache.set(
          item.id,
          need
        );

      }
    );


    // Sort browser
    needs.sort(
      (a, b) => {

        return (
          timestampValue(
            b.createdAt
          ) -
          timestampValue(
            a.createdAt
          )
        );

      }
    );


    console.log(
      "📌 Kebutuhan saya:",
      needs.length
    );


    updateNeedCount(
      needs.length
    );


    renderMyNeeds(
      needs
    );


  } catch (error) {

    console.error(
      "❌ LOAD MY NEEDS:",
      error
    );


    showNeedsError(
      error
    );


  } finally {

    loadingNeeds =
      false;

  }

}


// ============================================================
// RENDER MY NEEDS
// ============================================================

function renderMyNeeds(
  needs
) {

  const container =
    getNeedsContainer();


  if (!container) {
    return;
  }


  if (!needs.length) {

    container.innerHTML = `

      <div style="
        padding:35px 15px;
        text-align:center;
        color:#6b7280;
      ">

        <div style="
          font-size:42px;
          margin-bottom:10px;
        ">
          📌
        </div>

        <strong style="
          color:#374151;
          font-size:16px;
        ">
          Belum ada kebutuhan
        </strong>

        <p style="
          margin-top:7px;
          font-size:14px;
        ">
          Kebutuhan yang Anda posting
          akan muncul di sini.
        </p>

      </div>

    `;

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
        150
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
    String(
      need.status ||
      "open"
    ).toLowerCase();


  let statusLabel =
    "Aktif";


  if (
    status === "closed" ||
    status === "selesai" ||
    status === "completed"
  ) {

    statusLabel =
      "Selesai";

  }


  if (
    status === "cancelled" ||
    status === "canceled"
  ) {

    statusLabel =
      "Dibatalkan";

  }


  return `

    <article
      class="need-history-card"
      data-need-id="${escapeHTML(
        need.id
      )}"
      style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:16px;
        margin-bottom:14px;
        box-shadow:0 4px 14px rgba(0,0,0,.05);
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-start;
      ">

        <div style="
          flex:1;
          min-width:0;
        ">

          <h3 style="
            margin:0;
            color:#111827;
            font-size:17px;
          ">
            ${title}
          </h3>

          <div style="
            margin-top:6px;
            font-size:13px;
            color:#6b7280;
          ">
            📅 ${escapeHTML(date)}
          </div>

        </div>


        <span style="
          flex-shrink:0;
          padding:6px 10px;
          border-radius:999px;
          background:#dcfce7;
          color:#15803d;
          font-size:12px;
          font-weight:700;
        ">
          ${escapeHTML(statusLabel)}
        </span>

      </div>


      ${
        description
          ? `
            <p style="
              margin:12px 0 0;
              color:#4b5563;
              font-size:14px;
              line-height:1.5;
            ">
              ${description}
            </p>
          `
          : ""
      }


      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-top:14px;
        padding-top:14px;
        border-top:1px solid #f3f4f6;
      ">

        <div>

          <small style="
            display:block;
            color:#6b7280;
            font-size:11px;
          ">
            Budget
          </small>

          <strong style="
            color:#2563eb;
            font-size:16px;
          ">
            ${escapeHTML(budget)}
          </strong>

        </div>


        <button
          type="button"
          class="view-my-need-btn"
          data-id="${escapeHTML(
            need.id
          )}"
          style="
            padding:10px 15px;
            border:0;
            border-radius:10px;
            background:#2563eb;
            color:#fff;
            font-weight:700;
            cursor:pointer;
          "
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
      ".view-my-need-btn"
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
              Gunakan detail.html.

              Ini sama dengan halaman
              detail kebutuhan marketplace.
            */

            window.location.href =
              "detail.html?id=" +
              encodeURIComponent(
                id
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
    getNeedsContainer();


  if (!container) {
    return;
  }


  let message =
    "Gagal memuat riwayat kebutuhan.";


  const text =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    text.includes(
      "permission"
    )
  ) {

    message =
      "Firestore Rules menolak akses.";

  } else if (
    text.includes(
      "network"
    )
  ) {

    message =
      "Koneksi internet bermasalah.";

  } else if (
    text.includes(
      "terlalu lama"
    )
  ) {

    message =
      "Firestore terlalu lama merespons.";

  }


  container.innerHTML = `

    <div style="
      padding:30px 15px;
      text-align:center;
    ">

      <div style="
        font-size:42px;
        margin-bottom:10px;
      ">
        ⚠️
      </div>

      <strong style="
        color:#374151;
      ">
        ${escapeHTML(message)}
      </strong>

      <p style="
        color:#9ca3af;
        font-size:12px;
        margin-top:8px;
      ">
        ${escapeHTML(
          error?.message ||
          ""
        )}
      </p>

      <button
        id="retryNeedsBtn"
        type="button"
        style="
          margin-top:12px;
          padding:10px 18px;
          border:0;
          border-radius:10px;
          background:#2563eb;
          color:#fff;
          font-weight:700;
        "
      >
        Coba Lagi
      </button>

    </div>

  `;


  $("#retryNeedsBtn")
    ?.addEventListener(
      "click",
      () => {

        if (currentUser) {

          loadMyNeeds(
            currentUser.uid
          );

        }

      }
    );

}


// ============================================================
// UPDATE NEED COUNT
// ============================================================

function updateNeedCount(
  count
) {

  const elements = [

    $("#needCount"),

    $("#totalNeeds"),

    $("#myNeedCount"),

    $("#jumlahKebutuhan"),

    $("#userNeedsCount")

  ];


  elements.forEach(
    element => {

      if (element) {

        element.textContent =
          String(count);

      }

    }
  );

}


// ============================================================
// LOAD MY OFFERS
// ============================================================

async function loadMyOffers(
  providerId
) {

  if (!providerId) {
    return;
  }


  if (loadingOffers) {
    return;
  }


  loadingOffers =
    true;


  const container =
    getOffersContainer();


  if (!container) {

    console.warn(
      "Container riwayat penawaran tidak ditemukan."
    );

    loadingOffers =
      false;

    return;
  }


  container.innerHTML = `

    <div style="
      padding:25px;
      text-align:center;
      color:#6b7280;
    ">

      <div style="
        font-size:30px;
        margin-bottom:8px;
      ">
        💰
      </div>

      <strong>
        Memuat riwayat penawaran...
      </strong>

    </div>

  `;


  try {

    console.log(
      "💰 Mengambil offers provider:",
      providerId
    );


    /*
      STRUKTUR FIRESTORE:

      needs/{needId}/offers/{offerId}

      Karena offers adalah
      subcollection, gunakan
      collectionGroup("offers").

      Query:

      providerId == currentUser.uid

      TIDAK menggunakan orderBy.
    */


    const offersRef =
      collectionGroup(
        db,
        "offers"
      );


    const q =
      query(

        offersRef,

        where(
          "providerId",
          "==",
          providerId
        ),

        limit(
          MAX_OFFERS
        )

      );


    const snapshot =
      await withTimeout(
        getDocs(q)
      );


    const offers = [];


    snapshot.forEach(
      item => {

        offers.push({

          id:
            item.id,

          path:
            item.ref.path,

          parentNeedId:
            item.ref.parent.parent?.id ||
            null,

          ...item.data()

        });

      }
    );


    offers.sort(
      (a, b) => {

        return (
          timestampValue(
            b.createdAt ||
            b.timestamp ||
            b.updatedAt
          ) -
          timestampValue(
            a.createdAt ||
            a.timestamp ||
            a.updatedAt
          )
        );

      }
    );


    console.log(
      "💰 Jumlah offers:",
      offers.length
    );


    updateOfferCount(
      offers.length
    );


    if (!offers.length) {

      showEmptyOffers();

      return;
    }


    await renderOffers(
      offers
    );


  } catch (error) {

    console.error(
      "❌ LOAD OFFERS:",
      error
    );


    showOffersError(
      error
    );


  } finally {

    loadingOffers =
      false;

  }

}


// ============================================================
// EMPTY OFFERS
// ============================================================

function showEmptyOffers() {

  const container =
    getOffersContainer();


  if (!container) {
    return;
  }


  container.innerHTML = `

    <div style="
      padding:35px 15px;
      text-align:center;
      color:#6b7280;
    ">

      <div style="
        font-size:42px;
        margin-bottom:10px;
      ">
        💰
      </div>

      <strong style="
        color:#374151;
        font-size:16px;
      ">
        Belum ada penawaran
      </strong>

      <p style="
        margin-top:7px;
        font-size:14px;
      ">
        Penawaran yang Anda kirim
        akan muncul di sini.
      </p>

    </div>

  `;

}


// ============================================================
// OFFER ERROR
// ============================================================

function showOffersError(
  error
) {

  const container =
    getOffersContainer();


  if (!container) {
    return;
  }


  const text =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  let message =
    "Gagal memuat riwayat penawaran.";


  if (
    text.includes(
      "index"
    )
  ) {

    message =
      "Index Collection Group offers belum aktif.";

  } else if (
    text.includes(
      "permission"
    )
  ) {

    message =
      "Firestore Rules menolak akses.";

  } else if (
    text.includes(
      "network"
    )
  ) {

    message =
      "Koneksi internet bermasalah.";

  } else if (
    text.includes(
      "terlalu lama"
    )
  ) {

    message =
      "Firestore terlalu lama merespons.";

  }


  container.innerHTML = `

    <div style="
      padding:30px 15px;
      text-align:center;
    ">

      <div style="
        font-size:42px;
        margin-bottom:10px;
      ">
        ⚠️
      </div>

      <strong style="
        color:#374151;
      ">
        ${escapeHTML(message)}
      </strong>

      <p style="
        color:#9ca3af;
        font-size:12px;
        margin-top:8px;
      ">
        ${escapeHTML(
          error?.message ||
          ""
        )}
      </p>

      <button
        id="retryOffersBtn"
        type="button"
        style="
          margin-top:12px;
          padding:10px 18px;
          border:0;
          border-radius:10px;
          background:#2563eb;
          color:#fff;
          font-weight:700;
        "
      >
        Coba Lagi
      </button>

    </div>

  `;


  $("#retryOffersBtn")
    ?.addEventListener(
      "click",
      () => {

        if (currentUser) {

          loadMyOffers(
            currentUser.uid
          );

        }

      }
    );

}


// ============================================================
// UPDATE OFFER COUNT
// ============================================================

function updateOfferCount(
  count
) {

  const elements = [

    $("#offerCount"),

    $("#totalOffers"),

    $("#myOfferCount"),

    $("#jumlahPenawaran"),

    $("#userOffersCount")

  ];


  elements.forEach(
    element => {

      if (element) {

        element.textContent =
          String(count);

      }

    }
  );

}


// ============================================================
// RENDER OFFERS
// ============================================================

async function renderOffers(
  offers
) {

  const container =
    getOffersContainer();


  if (!container) {
    return;
  }


  /*
    PENTING:

    Ambil semua kebutuhan secara paralel.

    Karena parent ID sudah diketahui
    dari:

    offer.ref.parent.parent.id
  */


  const cards =
    await Promise.all(

      offers.map(
        async offer => {

          let requirement =
            null;


          const requirementId =
            offer.parentNeedId ||
            offer.requirementId ||
            offer.needId ||
            offer.requestId ||
            offer.postId;


          if (requirementId) {

            requirement =
              await getRequirementFast(
                requirementId
              );

          }


          return createOfferCard(
            offer,
            requirement
          );

        }
      )

    );


  container.innerHTML =
    cards.join("");


  attachOfferButtons();

}


// ============================================================
// GET REQUIREMENT FAST
// ============================================================

async function getRequirementFast(
  requirementId
) {

  if (!requirementId) {
    return null;
  }


  /*
    Gunakan cache terlebih dahulu.
  */

  if (
    needsCache.has(
      requirementId
    )
  ) {

    return needsCache.get(
      requirementId
    );

  }


  try {

    const ref =
      doc(
        db,
        "needs",
        requirementId
      );


    const snapshot =
      await getDoc(
        ref
      );


    if (
      snapshot.exists()
    ) {

      const need = {

        id:
          snapshot.id,

        ...snapshot.data()

      };


      needsCache.set(
        requirementId,
        need
      );


      return need;

    }


  } catch (error) {

    console.warn(
      "Gagal mengambil kebutuhan:",
      requirementId,
      error
    );

  }


  return null;

}


// ============================================================
// STATUS
// ============================================================

function getStatus(
  offer
) {

  return String(

    offer.status ||

    offer.offerStatus ||

    "pending"

  ).toLowerCase();

}


function statusText(
  status
) {

  switch (status) {

    case "accepted":
    case "diterima":
      return "Diterima";

    case "rejected":
    case "ditolak":
      return "Ditolak";

    case "completed":
    case "selesai":
      return "Selesai";

    case "cancelled":
    case "canceled":
    case "dibatalkan":
      return "Dibatalkan";

    case "pending":
    case "menunggu":
      return "Menunggu";

    default:
      return status || "Menunggu";

  }

}


// ============================================================
// OFFER CARD
// ============================================================

function createOfferCard(
  offer,
  requirement
) {

  const status =
    getStatus(
      offer
    );


  const requirementId =
    requirement?.id ||

    offer.parentNeedId ||

    offer.requirementId ||

    offer.needId ||

    offer.requestId ||

    offer.postId;


  const title =
    requirement?.title ||

    requirement?.name ||

    offer.requirementTitle ||

    offer.needTitle ||

    offer.title ||

    "Kebutuhan";


  const description =
    requirement?.description ||

    offer.description ||

    "";


  const price =
    offer.price ??

    offer.offerPrice ??

    offer.amount ??

    offer.bidAmount ??

    0;


  const message =
    offer.message ||

    offer.note ||

    "";


  const location =
    requirement?.location ||

    requirement?.city ||

    offer.location ||

    "";


  const date =
    offer.createdAt ||

    offer.timestamp ||

    offer.updatedAt;


  return `

    <article
      class="offer-card"
      data-offer-id="${escapeHTML(
        offer.id
      )}"
      style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:16px;
        margin-bottom:14px;
        box-shadow:0 4px 14px rgba(0,0,0,.05);
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-start;
      ">

        <div style="
          flex:1;
          min-width:0;
        ">

          <h3 style="
            margin:0;
            color:#111827;
            font-size:17px;
          ">
            ${escapeHTML(title)}
          </h3>


          ${
            location
              ? `
                <div style="
                  margin-top:6px;
                  color:#6b7280;
                  font-size:13px;
                ">
                  📍 ${escapeHTML(location)}
                </div>
              `
              : ""
          }

        </div>


        <span style="
          flex-shrink:0;
          padding:6px 10px;
          border-radius:999px;
          background:${getStatusBackground(
            status
          )};
          color:${getStatusColor(
            status
          )};
          font-size:12px;
          font-weight:700;
        ">
          ${escapeHTML(
            statusText(status)
          )}
        </span>

      </div>


      ${
        description
          ? `
            <p style="
              margin:12px 0 0;
              color:#4b5563;
              font-size:14px;
              line-height:1.5;
            ">
              ${escapeHTML(
                description
              )}
            </p>
          `
          : ""
      }


      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:14px;
      ">


        <div style="
          flex:1;
          min-width:140px;
          padding:11px;
          border-radius:10px;
          background:#f0fdf4;
        ">

          <small style="
            color:#6b7280;
            font-size:11px;
          ">
            Penawaran Anda
          </small>

          <div style="
            margin-top:3px;
            color:#16a34a;
            font-size:16px;
            font-weight:800;
          ">
            ${escapeHTML(
              formatRupiah(price)
            )}
          </div>

        </div>


        <div style="
          flex:1;
          min-width:140px;
          padding:11px;
          border-radius:10px;
          background:#f9fafb;
        ">

          <small style="
            color:#6b7280;
            font-size:11px;
          ">
            Waktu
          </small>

          <div style="
            margin-top:3px;
            color:#374151;
            font-size:13px;
            font-weight:600;
          ">
            ${escapeHTML(
              formatDate(date)
            )}
          </div>

        </div>

      </div>


      ${
        message
          ? `
            <div style="
              margin-top:12px;
              padding:11px;
              border-radius:10px;
              background:#f9fafb;
              color:#4b5563;
              font-size:13px;
              line-height:1.5;
            ">
              <strong>
                Pesan:
              </strong>

              ${escapeHTML(message)}
            </div>
          `
          : ""
      }


      ${
        requirementId
          ? `
            <button
              type="button"
              class="view-requirement-btn"
              data-id="${escapeHTML(
                requirementId
              )}"
              style="
                width:100%;
                margin-top:14px;
                padding:11px;
                border:1px solid #bfdbfe;
                border-radius:10px;
                background:#eff6ff;
                color:#2563eb;
                font-weight:700;
                cursor:pointer;
              "
            >
              👁️ Lihat Kebutuhan
            </button>
          `
          : `
            <div style="
              margin-top:14px;
              padding:10px;
              background:#fef2f2;
              color:#b91c1c;
              border-radius:10px;
              font-size:13px;
            ">
              Kebutuhan tidak ditemukan.
            </div>
          `
      }

    </article>

  `;

}


// ============================================================
// STATUS COLORS
// ============================================================

function getStatusBackground(
  status
) {

  if (
    status === "accepted" ||
    status === "diterima"
  ) {

    return "#dcfce7";

  }


  if (
    status === "rejected" ||
    status === "ditolak"
  ) {

    return "#fee2e2";

  }


  if (
    status === "completed" ||
    status === "selesai"
  ) {

    return "#dbeafe";

  }


  if (
    status === "cancelled" ||
    status === "canceled" ||
    status === "dibatalkan"
  ) {

    return "#f3f4f6";

  }


  return "#fef3c7";

}


function getStatusColor(
  status
) {

  if (
    status === "accepted" ||
    status === "diterima"
  ) {

    return "#15803d";

  }


  if (
    status === "rejected" ||
    status === "ditolak"
  ) {

    return "#b91c1c";

  }


  if (
    status === "completed" ||
    status === "selesai"
  ) {

    return "#1d4ed8";

  }


  if (
    status === "cancelled" ||
    status === "canceled" ||
    status === "dibatalkan"
  ) {

    return "#4b5563";

  }


  return "#a16207";

}


// ============================================================
// OFFER BUTTON
// ============================================================

function attachOfferButtons() {

  document
    .querySelectorAll(
      ".view-requirement-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;


            if (!id) {

              toast(
                "ID kebutuhan tidak ditemukan.",
                "error"
              );

              return;

            }


            /*
              Gunakan halaman detail.

              Jika detail.html Anda sudah benar,
              URL menjadi:

              detail.html?id=XXXXXXXX
            */

            window.location.href =
              "detail.html?id=" +
              encodeURIComponent(
                id
              );

          }
        );

      }
    );

}


// ============================================================
// SAVE PROFILE
// ============================================================

async function saveProfile() {

  if (!currentUser) {

    toast(
      "Silakan login terlebih dahulu.",
      "error"
    );

    return;
  }


  const input =
    getNameInput();


  if (!input) {

    toast(
      "Kolom nama tidak ditemukan.",
      "error"
    );

    return;
  }


  const name =
    input.value.trim();


  if (!name) {

    toast(
      "Nama tidak boleh kosong.",
      "error"
    );

    return;
  }


  const button =
    $("#saveProfileBtn") ||
    $("#btnSaveProfile");


  const oldText =
    button?.textContent ||
    "Simpan";


  try {

    if (button) {

      button.disabled =
        true;

      button.textContent =
        "Menyimpan...";

    }


    await withTimeout(
      updateProfile(
        currentUser,
        {
          displayName:
            name
        }
      )
    );


    renderProfile(
      currentUser
    );


    toast(
      "Profil berhasil diperbarui.",
      "success"
    );


  } catch (error) {

    console.error(
      "PROFILE UPDATE:",
      error
    );


    toast(
      "Gagal menyimpan profil.",
      "error"
    );


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        oldText;

    }

  }

}


// ============================================================
// PROFILE FORM
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const form =
      $("#profileForm");


    if (form) {

      form.addEventListener(
        "submit",
        event => {

          event.preventDefault();

          saveProfile();

        }
      );

    }


    const saveButton =
      $("#saveProfileBtn") ||
      $("#btnSaveProfile");


    if (
      saveButton &&
      !form
    ) {

      saveButton.addEventListener(
        "click",
        saveProfile
      );

    }


    const logoutButton =
      $("#logoutBtn") ||
      $("#btnLogout");


    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        logout
      );

    }

  }
);


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  try {

    const button =
      $("#logoutBtn") ||
      $("#btnLogout");


    if (button) {

      button.disabled =
        true;

      button.textContent =
        "Keluar...";

    }


    await auth.signOut();


    window.location.href =
      "login.html";


  } catch (error) {

    console.error(
      "LOGOUT:",
      error
    );


    toast(
      "Gagal logout.",
      "error"
    );

  }

}


// ============================================================
// GLOBAL RELOAD
// ============================================================

window.reloadOfferHistory =
  function() {

    if (!currentUser) {

      toast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;

    }


    loadMyOffers(
      currentUser.uid
    );

  };


window.reloadNeedHistory =
  function() {

    if (!currentUser) {

      toast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;

    }


    loadMyNeeds(
      currentUser.uid
    );

  };


// ============================================================
// DEBUG
// ============================================================

window.profileDebug = {

  getUser() {

    return currentUser;

  },


  reloadOffers() {

    if (currentUser) {

      return loadMyOffers(
        currentUser.uid
      );

    }

  },


  reloadNeeds() {

    if (currentUser) {

      return loadMyNeeds(
        currentUser.uid
      );

    }

  }

};


// ============================================================
// START
// ============================================================

console.log(
  "✅ profile.js VERSI CEPAT aktif"
);
