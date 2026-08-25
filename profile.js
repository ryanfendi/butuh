// ============================================================
// PROFILE.JS
// BUTUH - Marketplace Kebutuhan
// VERSION: FAST / FIREBASE 12.1.0
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
//
// TIDAK menggunakan orderBy()
// agar tidak membutuhkan composite index.
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

let loadingNeeds = false;
let loadingOffers = false;


// ============================================================
// DOM HELPER
// ============================================================

function $(selector) {
  return document.querySelector(selector);
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
// RUPIAH
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
// FIREBASE TIMESTAMP
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

      return Number(
        value.seconds
      ) * 1000;

    }


    if (
      value instanceof Date
    ) {

      return value.getTime();

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
// DATE
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(
    new Date(time)
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
    $("#profileToast");


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
      "22px";

    toast.style.transform =
      "translateX(-50%)";

    toast.style.zIndex =
      "999999";

    toast.style.padding =
      "12px 18px";

    toast.style.borderRadius =
      "999px";

    toast.style.color =
      "#ffffff";

    toast.style.fontSize =
      "14px";

    toast.style.fontWeight =
      "700";

    toast.style.boxShadow =
      "0 10px 30px rgba(0,0,0,.20)";

    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  if (
    type === "success"
  ) {

    toast.style.background =
      "#16a34a";

  }

  else if (
    type === "error"
  ) {

    toast.style.background =
      "#dc2626";

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
      user || null;


    if (!user) {

      renderLoggedOut();

      return;

    }


    renderProfile(
      user
    );


    // Jalankan dua proses secara paralel
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
// PROFILE ELEMENTS
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
    $("#userPhoto") ||
    $("#menuUserPhoto")
  );

}


function getNameInput() {

  return (
    $("#nameInput") ||
    $("#displayNameInput") ||
    $("#profileNameInput")
  );

}


// ============================================================
// CONTAINERS
// ============================================================

function getNeedsContainer() {

  return (
    $("#needsContainer") ||
    $("#myNeedsContainer") ||
    $("#myNeeds") ||
    $("#needsHistory") ||
    $("#needsList")
  );

}


function getOffersContainer() {

  return (
    $("#offersContainer") ||
    $("#offerHistory") ||
    $("#offersList") ||
    $("#myOffers") ||
    $("#myOffersContainer")
  );

}


// ============================================================
// COUNT ELEMENT
// ============================================================

function updateCount(
  selectors,
  value
) {

  selectors.forEach(
    selector => {

      const element =
        $(selector);

      if (element) {

        element.textContent =
          String(value);

      }

    }
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


  const photo =
    user.photoURL ||
    createAvatar(
      name
    );


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


  if (photoElement) {

    photoElement.src =
      photo;

    photoElement.alt =
      name;

  }


  if (input) {

    input.value =
      user.displayName || "";

  }

}


// ============================================================
// LOGGED OUT
// ============================================================

function renderLoggedOut() {

  const needs =
    getNeedsContainer();


  const offers =
    getOffersContainer();


  if (needs) {

    needs.innerHTML = `

      <div class="loading-box">

        <div class="empty-icon">
          🔐
        </div>

        <strong>
          Silakan login terlebih dahulu
        </strong>

        <small>
          Login untuk melihat riwayat kebutuhan Anda.
        </small>

      </div>

    `;

  }


  if (offers) {

    offers.innerHTML = `

      <div class="loading-box">

        <div class="empty-icon">
          🔐
        </div>

        <strong>
          Silakan login terlebih dahulu
        </strong>

        <small>
          Login untuk melihat riwayat penawaran Anda.
        </small>

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

  if (
    !ownerId ||
    loadingNeeds
  ) {

    return;

  }


  loadingNeeds =
    true;


  const container =
    getNeedsContainer();


  setLoading(
    container,
    "Memuat riwayat kebutuhan..."
  );


  try {

    console.log(
      "Mengambil kebutuhan user:",
      ownerId
    );


    const needsRef =
      collection(
        db,
        "needs"
      );


    /*
      HANYA where.

      Tidak menggunakan orderBy.
    */

    const needsQuery =
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


    // Sort di browser
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
      "Kebutuhan saya:",
      needs.length
    );


    updateCount(
      [
        "#myNeedsCount",
        "#userNeedsCount",
        "#needCount",
        "#totalNeeds",
        "#jumlahKebutuhan"
      ],
      needs.length
    );


    renderMyNeeds(
      needs
    );


  } catch (error) {

    console.error(
      "LOAD MY NEEDS:",
      error
    );


    renderNeedsError(
      container,
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

    console.warn(
      "Container riwayat kebutuhan tidak ditemukan."
    );

    return;

  }


  if (
    needs.length === 0
  ) {

    container.innerHTML = `

      <div style="
        text-align:center;
        padding:35px 15px;
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

        <div style="
          margin-top:7px;
          font-size:14px;
        ">
          Kebutuhan yang Anda posting
          akan muncul di sini.
        </div>

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

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedHistoryCard(
  need
) {

  const title =
    need.title ||
    "Tanpa judul";


  const description =
    truncate(
      need.description ||
      "",
      150
    );


  const category =
    getCategory(
      need.category
    );


  const budget =
    formatRupiah(
      need.budget
    );


  const status =
    normalizeStatus(
      need.status
    );


  const needId =
    encodeURIComponent(
      need.id
    );


  return `

    <article
      class="profile-need-card"
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
          min-width:0;
          flex:1;
        ">

          <span style="
            display:inline-block;
            padding:5px 9px;
            background:#eff6ff;
            color:#2563eb;
            border-radius:999px;
            font-size:11px;
            font-weight:700;
          ">
            ${escapeHTML(category)}
          </span>

          <h3 style="
            margin:9px 0 0;
            font-size:17px;
            color:#111827;
          ">
            ${escapeHTML(title)}
          </h3>

        </div>

        <span style="
          flex-shrink:0;
          padding:6px 10px;
          border-radius:999px;
          background:${statusBackground(status)};
          color:${statusColor(status)};
          font-size:11px;
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
              color:#6b7280;
              font-size:14px;
              line-height:1.5;
            ">
              ${escapeHTML(description)}
            </p>
          `
          : ""
      }


      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        gap:12px;
        margin-top:15px;
      ">

        <div>

          <div style="
            font-size:11px;
            color:#6b7280;
          ">
            Budget
          </div>

          <strong style="
            display:block;
            margin-top:3px;
            color:#2563eb;
            font-size:17px;
          ">
            ${escapeHTML(budget)}
          </strong>

          <small style="
            display:block;
            margin-top:4px;
            color:#9ca3af;
          ">
            ${escapeHTML(
              formatDate(
                need.createdAt
              )
            )}
          </small>

        </div>


        <button
          type="button"
          class="profile-view-need-btn btn btn-primary"
          data-id="${escapeHTML(
            need.id
          )}"
        >
          Lihat Kebutuhan
        </button>

      </div>

    </article>

  `;

}


// ============================================================
// LOAD MY OFFERS
// ============================================================

async function loadMyOffers(
  providerId
) {

  if (
    !providerId ||
    loadingOffers
  ) {

    return;

  }


  loadingOffers =
    true;


  const container =
    getOffersContainer();


  setLoading(
    container,
    "Memuat riwayat penawaran..."
  );


  try {

    /*
      Struktur:

      needs/{needId}/offers/{offerId}

      Karena providerId berada di
      subcollection offers, kita
      membaca kebutuhan user terlebih
      dahulu, kemudian semua offers
      secara paralel.
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

        needs.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );


    if (
      needs.length === 0
    ) {

      updateOfferCount(
        0
      );

      renderMyOffers(
        []
      );

      return;

    }


    /*
      Ambil offers secara paralel.
    */

    const offerResults =
      await Promise.all(

        needs.map(
          async need => {

            try {

              const offersSnapshot =
                await getDocs(

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
                      providerId
                    ),

                    limit(
                      MAX_OFFERS_PER_NEED
                    )

                  )

                );


              const results = [];


              offersSnapshot.forEach(
                item => {

                  results.push({

                    id:
                      item.id,

                    needId:
                      need.id,

                    need:
                      need,

                    ...item.data()

                  });

                }
              );


              return results;

            } catch (error) {

              console.warn(
                "Gagal membaca offers:",
                need.id,
                error
              );

              return [];

            }

          }

        )

      );


    const offers =
      offerResults.flat();


    /*
      Sort client-side.
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
      "Penawaran saya:",
      offers.length
    );


    updateOfferCount(
      offers.length
    );


    renderMyOffers(
      offers
    );


  } catch (error) {

    console.error(
      "LOAD MY OFFERS:",
      error
    );


    renderOffersError(
      container,
      error
    );

  } finally {

    loadingOffers =
      false;

  }

}


// ============================================================
// RENDER MY OFFERS
// ============================================================

function renderMyOffers(
  offers
) {

  const container =
    getOffersContainer();


  if (!container) {

    console.warn(
      "Container riwayat penawaran tidak ditemukan."
    );

    return;

  }


  if (
    offers.length === 0
  ) {

    container.innerHTML = `

      <div style="
        text-align:center;
        padding:35px 15px;
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

        <div style="
          margin-top:7px;
          font-size:14px;
        ">
          Penawaran yang Anda kirim
          akan muncul di sini.
        </div>

      </div>

    `;

    return;

  }


  container.innerHTML =
    offers
      .map(
        createOfferHistoryCard
      )
      .join("");


  attachOfferButtons();

}


// ============================================================
// OFFER CARD
// ============================================================

function createOfferHistoryCard(
  offer
) {

  const need =
    offer.need || {};


  const title =
    need.title ||
    offer.needTitle ||
    "Kebutuhan";


  const description =
    truncate(
      need.description ||
      "",
      120
    );


  const price =
    formatRupiah(
      offer.price ??
      offer.offerPrice ??
      offer.amount ??
      offer.bidAmount ??
      0
    );


  const duration =
    offer.duration ||
    "-";


  const message =
    truncate(
      offer.message ||
      "",
      180
    );


  const status =
    normalizeStatus(
      offer.status
    );


  return `

    <article
      class="profile-offer-card"
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

          <span style="
            display:inline-block;
            padding:5px 9px;
            background:#eff6ff;
            color:#2563eb;
            border-radius:999px;
            font-size:11px;
            font-weight:700;
          ">
            PENAWARAN
          </span>

          <h3 style="
            margin:9px 0 0;
            font-size:17px;
            color:#111827;
          ">
            ${escapeHTML(title)}
          </h3>

        </div>


        <span style="
          flex-shrink:0;
          padding:6px 10px;
          border-radius:999px;
          background:${statusBackground(status)};
          color:${statusColor(status)};
          font-size:11px;
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
              color:#6b7280;
              font-size:14px;
              line-height:1.5;
            ">
              ${escapeHTML(description)}
            </p>
          `
          : ""
      }


      <div style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(130px,1fr)
          );
        gap:10px;
        margin-top:14px;
      ">


        <div style="
          padding:11px;
          border-radius:10px;
          background:#f0fdf4;
        ">

          <small style="
            color:#6b7280;
          ">
            Penawaran
          </small>

          <strong style="
            display:block;
            margin-top:3px;
            color:#16a34a;
          ">
            ${escapeHTML(price)}
          </strong>

        </div>


        <div style="
          padding:11px;
          border-radius:10px;
          background:#f9fafb;
        ">

          <small style="
            color:#6b7280;
          ">
            Pengerjaan
          </small>

          <strong style="
            display:block;
            margin-top:3px;
            color:#374151;
          ">
            ${escapeHTML(duration)}
          </strong>

        </div>


        <div style="
          padding:11px;
          border-radius:10px;
          background:#f9fafb;
        ">

          <small style="
            color:#6b7280;
          ">
            Waktu
          </small>

          <strong style="
            display:block;
            margin-top:3px;
            color:#374151;
            font-size:12px;
          ">
            ${escapeHTML(
              formatDate(
                offer.createdAt
              )
            )}
          </strong>

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


      <button
        type="button"
        class="profile-view-need-btn btn btn-primary"
        data-id="${escapeHTML(
          offer.needId
        )}"
        style="
          width:100%;
          margin-top:14px;
        "
      >
        👁️ Lihat Kebutuhan
      </button>

    </article>

  `;

}


// ============================================================
// VIEW NEED
// ============================================================

function attachOfferButtons() {

  document
    .querySelectorAll(
      ".profile-view-need-btn"
    )
    .forEach(
      button => {

        button.onclick =
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


            /*
              JANGAN menuju:

              detail.html?id=...

              karena menyebabkan 404.

              Gunakan index.html?need=ID.
            */

            window.location.href =
              "index.html?need=" +
              encodeURIComponent(
                needId
              );

          };

      }
    );

}


// ============================================================
// UPDATE OFFER COUNT
// ============================================================

function updateOfferCount(
  count
) {

  updateCount(

    [
      "#userOffersCount",
      "#offerCount",
      "#myOfferCount",
      "#totalOffers",
      "#jumlahPenawaran"
    ],

    count

  );

}


// ============================================================
// NEED ERROR
// ============================================================

function renderNeedsError(
  container,
  error
) {

  if (!container) {
    return;
  }


  const message =
    getFriendlyError(
      error
    );


  container.innerHTML = `

    <div style="
      text-align:center;
      padding:30px 15px;
    ">

      <div style="
        font-size:42px;
      ">
        ⚠️
      </div>

      <strong>
        Gagal memuat riwayat kebutuhan
      </strong>

      <p style="
        color:#6b7280;
        font-size:13px;
      ">
        ${escapeHTML(message)}
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
// OFFER ERROR
// ============================================================

function renderOffersError(
  container,
  error
) {

  if (!container) {
    return;
  }


  const message =
    getFriendlyError(
      error
    );


  container.innerHTML = `

    <div style="
      text-align:center;
      padding:30px 15px;
    ">

      <div style="
        font-size:42px;
      ">
        ⚠️
      </div>

      <strong>
        Gagal memuat riwayat penawaran
      </strong>

      <p style="
        color:#6b7280;
        font-size:13px;
      ">
        ${escapeHTML(message)}
      </p>

      <button
        id="retryOffersBtn"
        class="btn btn-primary"
        type="button"
      >
        🔄 Coba Lagi
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
// LOADING
// ============================================================

function setLoading(
  container,
  text
) {

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
        width:30px;
        height:30px;
        margin:0 auto 12px;
        border:3px solid #e5e7eb;
        border-top-color:#2563eb;
        border-radius:50%;
        animation:profileSpin .7s linear infinite;
      "></div>

      <strong>
        ${escapeHTML(text)}
      </strong>

      <small style="
        display:block;
        margin-top:6px;
      ">
        Mohon tunggu...
      </small>

    </div>

  `;


  if (
    !document.getElementById(
      "profileSpinStyle"
    )
  ) {

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "profileSpinStyle";

    style.textContent = `

      @keyframes profileSpin {

        to {
          transform:rotate(360deg);
        }

      }

    `;

    document.head.appendChild(
      style
    );

  }

}


// ============================================================
// FRIENDLY ERROR
// ============================================================

function getFriendlyError(
  error
) {

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

    return "Firestore Rules menolak akses.";

  }


  if (
    text.includes(
      "network"
    )
  ) {

    return "Koneksi internet bermasalah.";

  }


  if (
    text.includes(
      "terlalu lama"
    )
  ) {

    return "Koneksi ke Firestore terlalu lama.";

  }


  return (
    error?.message ||
    "Terjadi kesalahan."
  );

}


// ============================================================
// UPDATE PROFILE
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


  const original =
    button
      ? button.innerHTML
      : "";


  if (button) {

    button.disabled =
      true;

    button.innerHTML =
      "⏳ Menyimpan...";

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

      button.innerHTML =
        original ||
        "Simpan";

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


    showToast(
      "Gagal logout.",
      "error"
    );

  }

}


// ============================================================
// STATUS
// ============================================================

function normalizeStatus(
  status
) {

  return String(
    status ||
    "open"
  ).toLowerCase();

}


function statusText(
  status
) {

  switch (
    normalizeStatus(status)
  ) {

    case "open":
    case "active":
    case "aktif":
      return "Aktif";

    case "pending":
    case "menunggu":
      return "Menunggu";

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

    default:
      return status || "Aktif";

  }

}


function statusBackground(
  status
) {

  status =
    normalizeStatus(
      status
    );


  if (
    status === "accepted" ||
    status === "diterima" ||
    status === "completed" ||
    status === "selesai"
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
    status === "cancelled" ||
    status === "canceled" ||
    status === "dibatalkan"
  ) {

    return "#f3f4f6";

  }


  return "#fef3c7";

}


function statusColor(
  status
) {

  status =
    normalizeStatus(
      status
    );


  if (
    status === "accepted" ||
    status === "diterima" ||
    status === "completed" ||
    status === "selesai"
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
    status === "cancelled" ||
    status === "canceled" ||
    status === "dibatalkan"
  ) {

    return "#4b5563";

  }


  return "#a16207";

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


  if (
    value.length <=
    length
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
// AVATAR
// ============================================================

function createAvatar(
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


// ============================================================
// GLOBAL REFRESH
// ============================================================

window.reloadProfile =
  async function() {

    if (!currentUser) {

      showToast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;

    }


    await Promise.allSettled([

      loadMyNeeds(
        currentUser.uid
      ),

      loadMyOffers(
        currentUser.uid
      )

    ]);

  };


window.reloadOfferHistory =
  function() {

    if (!currentUser) {

      showToast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;

    }


    return loadMyOffers(
      currentUser.uid
    );

  };


window.reloadNeedHistory =
  function() {

    if (!currentUser) {

      showToast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;

    }


    return loadMyNeeds(
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

  reloadNeeds() {

    if (!currentUser) {
      return;
    }

    return loadMyNeeds(
      currentUser.uid
    );

  },

  reloadOffers() {

    if (!currentUser) {
      return;
    }

    return loadMyOffers(
      currentUser.uid
    );

  }

};


// ============================================================
// START
// ============================================================

console.log(
  "✅ BUTUH profile.js FAST aktif"
);

console.log(
  "📁 Firestore: needs/{needId}/offers/{offerId}"
);

console.log(
  "⚡ Tidak menggunakan orderBy / composite index"
);
