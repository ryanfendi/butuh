// ============================================================
// PROFILE.JS
// BUTUH - Profile & Riwayat Penawaran
// Firebase 12.1.0
// Cocok dengan firebase.js + script.js
// ============================================================

import {
  onAuthStateChanged,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
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
const MAX_OFFERS_PER_NEED = 100;
const LOAD_TIMEOUT = 10000;


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let isLoadingOffers = false;
let isLoadingNeeds = false;

let cachedNeeds = new Map();


// ============================================================
// HELPER
// ============================================================

function $(selector) {
  return document.querySelector(selector);
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

  return String(value ?? "")

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");
}


// ============================================================
// RUPIAH
// ============================================================

function formatRupiah(value) {

  const number = Number(value || 0);

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
// DATE
// ============================================================

function timestampToDate(value) {

  if (!value) {
    return null;
  }

  try {

    if (
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    if (
      typeof value.toMillis === "function"
    ) {
      return new Date(
        value.toMillis()
      );
    }

    if (
      value.seconds !== undefined
    ) {

      return new Date(
        Number(value.seconds) * 1000
      );

    }

    if (
      value instanceof Date
    ) {
      return value;
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;

  } catch (error) {

    return null;
  }
}


function getTime(value) {

  const date =
    timestampToDate(value);

  return date
    ? date.getTime()
    : 0;
}


function formatDate(value) {

  const date =
    timestampToDate(value);

  if (!date) {
    return "Baru saja";
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

  return Promise.race([

    promise,

    new Promise(
      (_, reject) => {

        setTimeout(
          () => {

            reject(
              new Error(
                "Permintaan terlalu lama."
              )
            );

          },
          timeout
        );

      }
    )

  ]);

}


// ============================================================
// TOAST
// ============================================================

function showToast(
  message,
  type = "info"
) {

  let toast =
    document.getElementById(
      "profileToast"
    );

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
      "12px";

    toast.style.color =
      "#fff";

    toast.style.fontSize =
      "14px";

    toast.style.fontWeight =
      "700";

    toast.style.boxShadow =
      "0 10px 30px rgba(0,0,0,.2)";

    document.body.appendChild(
      toast
    );

  }

  toast.textContent =
    message;

  if (type === "success") {

    toast.style.background =
      "#16a34a";

  } else if (type === "error") {

    toast.style.background =
      "#dc2626";

  } else {

    toast.style.background =
      "#111827";

  }

  clearTimeout(
    toast._timer
  );

  toast._timer =
    setTimeout(
      () => {

        toast.remove();

      },
      3000
    );

}


// ============================================================
// PROFILE ELEMENTS
// ============================================================

function getNameElement() {

  return (
    $("#profileName") ||
    $("#userName") ||
    $("#displayName")
  );

}


function getEmailElement() {

  return (
    $("#profileEmail") ||
    $("#userEmail")
  );

}


function getPhotoElement() {

  return (
    $("#profilePhoto") ||
    $("#userAvatar")
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
    $("#offersList")
  );

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
      "PROFILE USER:",
      user.uid
    );

    renderProfile(
      user
    );

    /*
      Jangan menunggu profile
      untuk menampilkan UI.
    */

    loadOffers(
      user.uid
    );

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
    "-";

  const nameElement =
    getNameElement();

  const emailElement =
    getEmailElement();

  const photoElement =
    getPhotoElement();

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
        margin-bottom:12px;
      ">
        🔐
      </div>

      <strong>
        Silakan login terlebih dahulu
      </strong>

      <div style="
        margin-top:8px;
        font-size:14px;
      ">
        Login untuk melihat riwayat penawaran Anda.
      </div>

    </div>

  `;

}


// ============================================================
// LOAD OFFERS
// ============================================================

async function loadOffers(
  providerId
) {

  if (!providerId) {
    return;
  }

  if (isLoadingOffers) {
    return;
  }

  isLoadingOffers =
    true;

  const container =
    getOffersContainer();


  if (container) {

    container.innerHTML = `

      <div style="
        padding:35px 15px;
        text-align:center;
        color:#6b7280;
      ">

        <div style="
          font-size:30px;
          margin-bottom:10px;
        ">
          ⏳
        </div>

        <strong>
          Memuat riwayat penawaran...
        </strong>

      </div>

    `;

  }


  try {

    /*
      ========================================================
      PENTING
      ========================================================

      Struktur database:

      needs/
        needId/
          offers/
            offerId

      Jadi kita TIDAK menggunakan:

      collectionGroup("offers")

      dan TIDAK membutuhkan index
      providerId global.

      Kita mengambil kebutuhan terlebih dahulu,
      kemudian mencari offers pada subcollection.
    */


    const needsSnapshot =
      await withTimeout(

        getDocs(
          query(
            collection(
              db,
              "needs"
            ),
            limit(
              MAX_NEEDS
            )
          )
        )

      );


    const needs = [];

    needsSnapshot.forEach(
      item => {

        const need = {

          id:
            item.id,

          ...item.data()

        };

        needs.push(
          need
        );

        cachedNeeds.set(
          need.id,
          need
        );

      }
    );


    /*
      Urutkan kebutuhan terbaru.
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


    /*
      Ambil offers secara paralel.
    */

    const results =
      await Promise.all(

        needs.map(
          need =>
            loadOffersForNeed(
              need,
              providerId
            )
        )

      );


    const offers = [];


    results.forEach(
      result => {

        if (
          Array.isArray(result)
        ) {

          offers.push(
            ...result
          );

        }

      }
    );


    /*
      Urutkan berdasarkan waktu terbaru.
    */

    offers.sort(
      (a, b) => {

        return (
          getTime(
            b.createdAt ||
            b.updatedAt
          ) -
          getTime(
            a.createdAt ||
            a.updatedAt
          )
        );

      }
    );


    updateOfferCount(
      offers.length
    );


    if (
      offers.length === 0
    ) {

      showEmptyOffers();

      return;

    }


    renderOffers(
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
// LOAD OFFERS FOR ONE NEED
// ============================================================

async function loadOffersForNeed(
  need,
  providerId
) {

  try {

    const offersRef =
      collection(
        db,
        "needs",
        need.id,
        "offers"
      );


    /*
      Query hanya providerId.

      Tidak memakai orderBy.
      Tidak membutuhkan composite index.
    */

    const q =
      query(
        offersRef,
        where(
          "providerId",
          "==",
          providerId
        ),
        limit(
          MAX_OFFERS_PER_NEED
        )
      );


    const snapshot =
      await getDocs(q);


    const offers = [];


    snapshot.forEach(
      item => {

        offers.push({

          id:
            item.id,

          needId:
            need.id,

          requirementId:
            need.id,

          need:
            need,

          ...item.data()

        });

      }
    );


    return offers;


  } catch (error) {

    console.warn(
      "Gagal mengambil offers:",
      need.id,
      error
    );

    return [];

  }

}


// ============================================================
// EMPTY
// ============================================================

function showEmptyOffers() {

  const container =
    getOffersContainer();

  if (!container) {
    return;
  }


  container.innerHTML = `

    <div style="
      text-align:center;
      padding:35px 15px;
      color:#6b7280;
    ">

      <div style="
        font-size:42px;
        margin-bottom:12px;
      ">
        💰
      </div>

      <div style="
        font-size:17px;
        font-weight:800;
        color:#374151;
      ">
        Belum ada penawaran
      </div>

      <div style="
        margin-top:7px;
        font-size:14px;
      ">
        Penawaran yang Anda kirim
        akan muncul di sini.
      </div>

    </div>

  `;

}


// ============================================================
// ERROR
// ============================================================

function showOffersError(
  error
) {

  const container =
    getOffersContainer();

  if (!container) {
    return;
  }


  let message =
    "Gagal memuat riwayat penawaran.";


  const text =
    String(
      error?.message || ""
    ).toLowerCase();


  if (
    text.includes("permission")
  ) {

    message =
      "Firestore menolak akses. Periksa Rules.";

  } else if (
    text.includes("network")
  ) {

    message =
      "Koneksi internet bermasalah.";

  } else if (
    text.includes("terlalu lama")
  ) {

    message =
      "Pengambilan data terlalu lama.";

  }


  container.innerHTML = `

    <div style="
      text-align:center;
      padding:30px 15px;
    ">

      <div style="
        font-size:42px;
        margin-bottom:10px;
      ">
        ⚠️
      </div>

      <div style="
        font-weight:800;
        color:#374151;
      ">
        ${escapeHTML(message)}
      </div>

      <button
        id="retryOffersBtn"
        type="button"
        style="
          margin-top:15px;
          padding:11px 18px;
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

          loadOffers(
            currentUser.uid
          );

        }

      }
    );

}


// ============================================================
// COUNT
// ============================================================

function updateOfferCount(
  count
) {

  const ids = [

    "offerCount",

    "totalOffers",

    "myOfferCount",

    "jumlahPenawaran",

    "userOffersCount"

  ];


  ids.forEach(
    id => {

      const element =
        document.getElementById(
          id
        );

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

function renderOffers(
  offers
) {

  const container =
    getOffersContainer();

  if (!container) {
    return;
  }


  container.innerHTML =
    offers
      .map(
        createOfferCard
      )
      .join("");


  attachOfferButtons();

}


// ============================================================
// CREATE OFFER CARD
// ============================================================

function createOfferCard(
  offer
) {

  const need =
    offer.need ||
    cachedNeeds.get(
      offer.needId ||
      offer.requirementId
    );


  const title =
    need?.title ||
    offer.needTitle ||
    offer.requirementTitle ||
    offer.title ||
    "Kebutuhan";


  const description =
    need?.description ||
    offer.description ||
    "";


  const location =
    need?.location ||
    need?.city ||
    offer.location ||
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


  const status =
    getStatus(
      offer
    );


  const date =
    offer.createdAt ||
    offer.timestamp ||
    offer.updatedAt;


  const needId =
    need?.id ||
    offer.needId ||
    offer.requirementId;


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
          min-width:0;
          flex:1;
        ">

          <div style="
            font-size:17px;
            font-weight:800;
            color:#111827;
          ">
            ${escapeHTML(title)}
          </div>

          ${
            location
              ? `
                <div style="
                  margin-top:6px;
                  font-size:13px;
                  color:#6b7280;
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
          font-size:12px;
          font-weight:800;
          background:${getStatusBackground(
            status
          )};
          color:${getStatusColor(
            status
          )};
        ">
          ${escapeHTML(
            statusText(
              status
            )
          )}
        </span>

      </div>


      ${
        description
          ? `
            <div style="
              margin-top:12px;
              color:#4b5563;
              font-size:14px;
              line-height:1.5;
            ">
              ${escapeHTML(
                truncate(
                  description,
                  180
                )
              )}
            </div>
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
          min-width:130px;
          padding:11px;
          border-radius:10px;
          background:#f0fdf4;
        ">

          <div style="
            font-size:11px;
            color:#6b7280;
          ">
            Penawaran Anda
          </div>

          <div style="
            margin-top:3px;
            font-size:16px;
            font-weight:900;
            color:#16a34a;
          ">
            ${formatRupiah(price)}
          </div>

        </div>


        <div style="
          flex:1;
          min-width:130px;
          padding:11px;
          border-radius:10px;
          background:#eff6ff;
        ">

          <div style="
            font-size:11px;
            color:#6b7280;
          ">
            Pengerjaan
          </div>

          <div style="
            margin-top:3px;
            font-size:14px;
            font-weight:700;
            color:#2563eb;
          ">
            ${escapeHTML(duration)}
          </div>

        </div>


        <div style="
          flex:1;
          min-width:130px;
          padding:11px;
          border-radius:10px;
          background:#f9fafb;
        ">

          <div style="
            font-size:11px;
            color:#6b7280;
          ">
            Waktu
          </div>

          <div style="
            margin-top:3px;
            font-size:13px;
            font-weight:600;
            color:#374151;
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
              background:#f9fafb;
              border-radius:10px;
              color:#4b5563;
              font-size:13px;
              line-height:1.5;
            ">
              <strong>Pesan:</strong>
              ${escapeHTML(message)}
            </div>
          `
          : ""
      }


      ${
        needId
          ? `
            <button
              class="view-requirement-btn"
              data-id="${escapeHTML(
                needId
              )}"
              type="button"
              style="
                width:100%;
                margin-top:14px;
                padding:12px;
                border:1px solid #bfdbfe;
                border-radius:10px;
                background:#eff6ff;
                color:#2563eb;
                font-weight:800;
                cursor:pointer;
              "
            >
              👁️ Lihat Kebutuhan
            </button>
          `
          : ""
      }

    </article>

  `;

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
      return status;

  }

}


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
// LIHAT KEBUTUHAN
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

            const needId =
              button.dataset.id;

            if (!needId) {

              showToast(
                "ID kebutuhan tidak ditemukan.",
                "error"
              );

              return;

            }


            openNeedFromHistory(
              needId
            );

          }
        );

      }
    );

}


// ============================================================
// OPEN NEED FROM HISTORY
// ============================================================

async function openNeedFromHistory(
  needId
) {

  /*
    PENTING:

    Tidak lagi:

    detail.html?id=...

    Karena itu menyebabkan 404
    jika detail.html belum tersedia.
  */


  let need =
    cachedNeeds.get(
      needId
    );


  /*
    Kalau belum ada cache,
    ambil langsung.
  */

  if (!need) {

    try {

      const snapshot =
        await withTimeout(

          getDoc(
            doc(
              db,
              "needs",
              needId
            )
          )

        );


      if (
        !snapshot.exists()
      ) {

        showToast(
          "Kebutuhan sudah tidak ditemukan.",
          "error"
        );

        return;

      }


      need = {

        id:
          snapshot.id,

        ...snapshot.data()

      };


      cachedNeeds.set(
        needId,
        need
      );


    } catch (error) {

      console.error(
        "Gagal membuka kebutuhan:",
        error
      );

      showToast(
        "Gagal memuat kebutuhan.",
        "error"
      );

      return;

    }

  }


  /*
    Tampilkan detail langsung
    di halaman profile.
  */

  showNeedDetail(
    need
  );

}


// ============================================================
// DETAIL MODAL
// ============================================================

function showNeedDetail(
  need
) {

  let modal =
    document.getElementById(
      "historyNeedModal"
    );


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "historyNeedModal";

    modal.className =
      "modal hidden";

    document.body.appendChild(
      modal
    );

  }


  const status =
    String(
      need.status ||
      "open"
    ).toLowerCase();


  const owner =
    need.ownerId ===
    currentUser?.uid;


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="historyNeedBackdrop"
    ></div>


    <div
      class="modal-content"
      style="
        max-width:600px;
        width:calc(100% - 24px);
      "
    >

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
          id="closeHistoryNeed"
          class="modal-close"
          type="button"
        >
          ×
        </button>

      </div>


      <div style="
        padding:20px;
      ">

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-bottom:15px;
        ">

          <span style="
            padding:6px 10px;
            border-radius:999px;
            background:#eff6ff;
            color:#2563eb;
            font-size:12px;
            font-weight:700;
          ">
            ${escapeHTML(
              getCategory(
                need.category
              )
            )}
          </span>


          <span style="
            padding:6px 10px;
            border-radius:999px;
            background:#f0fdf4;
            color:#15803d;
            font-size:12px;
            font-weight:700;
          ">
            ${escapeHTML(status)}
          </span>

        </div>


        <div style="
          font-size:15px;
          line-height:1.7;
          color:#374151;
        ">
          ${escapeHTML(
            need.description ||
            "Tidak ada deskripsi."
          )}
        </div>


        <div style="
          margin-top:20px;
          padding:16px;
          border-radius:12px;
          background:#eff6ff;
        ">

          <div style="
            font-size:12px;
            color:#6b7280;
          ">
            Budget
          </div>

          <div style="
            margin-top:4px;
            font-size:24px;
            font-weight:900;
            color:#2563eb;
          ">
            ${formatRupiah(
              need.budget
            )}
          </div>

        </div>


        ${
          need.deadline
            ? `
              <div style="
                margin-top:14px;
                padding:12px;
                border-radius:10px;
                background:#f9fafb;
              ">
                <strong>Deadline:</strong>
                ${escapeHTML(
                  need.deadline
                )}
              </div>
            `
            : ""
        }


        <div style="
          margin-top:18px;
          font-size:14px;
          color:#6b7280;
        ">
          👤 Diposting oleh:
          <strong>
            ${escapeHTML(
              need.ownerName ||
              "Pengguna"
            )}
          </strong>
        </div>


        <div style="
          margin-top:8px;
          font-size:13px;
          color:#9ca3af;
        ">
          📅 ${escapeHTML(
            formatDate(
              need.createdAt
            )
          )}
        </div>


        ${
          owner
            ? `
              <div style="
                margin-top:18px;
                padding:13px;
                border-radius:10px;
                background:#f0fdf4;
                color:#15803d;
                font-weight:700;
              ">
                👤 Ini adalah kebutuhan Anda.
              </div>
            `
            : ""
        }


        <button
          id="historyGoHome"
          type="button"
          class="btn btn-outline"
          style="
            width:100%;
            margin-top:18px;
          "
        >
          ← Kembali ke Kebutuhan
        </button>

      </div>

    </div>

  `;


  modal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );


  $("#closeHistoryNeed")
    ?.addEventListener(
      "click",
      () => {

        closeHistoryNeed();

      }
    );


  $("#historyNeedBackdrop")
    ?.addEventListener(
      "click",
      () => {

        closeHistoryNeed();

      }
    );


  $("#historyGoHome")
    ?.addEventListener(
      "click",
      () => {

        closeHistoryNeed();

        /*
          Scroll ke daftar kebutuhan
          tanpa 404.
        */

        const needs =
          document.getElementById(
            "needs"
          );

        if (needs) {

          needs.scrollIntoView({
            behavior:
              "smooth"
          });

        }

      }
    );

}


// ============================================================
// CLOSE DETAIL
// ============================================================

function closeHistoryNeed() {

  const modal =
    document.getElementById(
      "historyNeedModal"
    );

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
      text || ""
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
// SAVE PROFILE
// ============================================================

async function saveProfile() {

  if (!currentUser) {

    showToast(
      "Silakan login terlebih dahulu.",
      "error"
    );

    return;

  }


  const input =
    getNameInput();


  if (!input) {

    showToast(
      "Kolom nama tidak ditemukan.",
      "error"
    );

    return;

  }


  const name =
    input.value.trim();


  if (!name) {

    showToast(
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


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Menyimpan...";

  }


  try {

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


    showToast(
      "Profil berhasil diperbarui.",
      "success"
    );


  } catch (error) {

    console.error(
      "SAVE PROFILE:",
      error
    );

    showToast(
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


    /*
      Logout.
    */

    const logoutButton =
      $("#logoutBtn") ||
      $("#btnLogout");


    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        async () => {

          try {

            logoutButton.disabled =
              true;

            logoutButton.textContent =
              "Keluar...";


            await signOut(
              auth
            );


            window.location.href =
              "login.html";


          } catch (error) {

            console.error(
              "LOGOUT:",
              error
            );

            logoutButton.disabled =
              false;

            logoutButton.textContent =
              "🚪 Keluar";


            showToast(
              "Gagal logout.",
              "error"
            );

          }

        }
      );

    }

  }
);


// ============================================================
// GLOBAL REFRESH
// ============================================================

window.reloadOfferHistory =
  function () {

    if (!currentUser) {

      showToast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;

    }


    /*
      Reset state agar bisa
      dipanggil kembali.
    */

    isLoadingOffers =
      false;


    loadOffers(
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

    if (!currentUser) {
      return;
    }

    isLoadingOffers =
      false;

    return loadOffers(
      currentUser.uid
    );

  },


  getCachedNeeds() {

    return cachedNeeds;

  }

};


// ============================================================
// ESCAPE
// ============================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeHistoryNeed();

    }

  }
);


console.log(
  "✅ profile.js cepat aktif"
);
