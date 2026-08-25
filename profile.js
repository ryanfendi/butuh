// ============================================================
// PROFILE.JS
// BUTUH - Profil Pengguna
// ============================================================

import {
  onAuthStateChanged,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase.js";

// ============================================================
// CONFIG
// ============================================================

const MAX_NEEDS = 1000;
const MAX_OFFERS_PER_NEED = 100;

// ============================================================
// STATE
// ============================================================

let currentUser = null;

let loadingOffers = false;

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

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}


// ============================================================
// RUPIAH
// ============================================================

function formatRupiah(value) {

  const number =
    Number(value || 0);

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

function getTimestampValue(value) {

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
      value.seconds !==
      undefined
    ) {

      return (
        Number(value.seconds) *
        1000
      );

    }

    const date =
      new Date(value);

    if (
      isNaN(
        date.getTime()
      )
    ) {

      return 0;

    }

    return date.getTime();

  } catch {

    return 0;

  }
}


function formatDate(value) {

  const time =
    getTimestampValue(
      value
    );

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

    Object.assign(
      toast.style,
      {
        position: "fixed",
        left: "50%",
        bottom: "20px",
        transform:
          "translateX(-50%)",
        zIndex: "999999",
        padding:
          "13px 18px",
        borderRadius:
          "12px",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "700",
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

  toast.style.background =
    type === "success"
      ? "#16a34a"
      : type === "error"
        ? "#dc2626"
        : "#111827";

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
    $("#userPhoto") ||
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


// ============================================================
// OFFERS CONTAINER
// ============================================================

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

    console.log(
      "Profile auth:",
      user
        ? user.uid
        : "logout"
    );

    if (!user) {

      currentUser =
        null;

      showLoginMessage();

      return;
    }

    currentUser =
      user;

    renderProfile(
      user
    );

    await loadMyOffers(
      user.uid
    );

  }
);


// ============================================================
// RENDER PROFILE
// ============================================================

function renderProfile(
  user
) {

  const name =
    user.displayName ||
    (
      user.email
        ? user.email.split("@")[0]
        : "Pengguna"
    );

  const nameElement =
    getNameElement();

  const emailElement =
    getEmailElement();

  const photoElement =
    getPhotoElement();

  const nameInput =
    getNameInput();


  if (nameElement) {

    nameElement.textContent =
      name;

  }


  if (emailElement) {

    emailElement.textContent =
      user.email || "-";

  }


  if (
    photoElement &&
    user.photoURL
  ) {

    photoElement.src =
      user.photoURL;

    photoElement.style.display =
      "block";

  }


  if (nameInput) {

    nameInput.value =
      user.displayName || "";

  }

}


// ============================================================
// LOGIN MESSAGE
// ============================================================

function showLoginMessage() {

  const container =
    getOffersContainer();

  if (!container) {
    return;
  }

  container.innerHTML = `

    <div style="
      text-align:center;
      padding:40px 15px;
      color:#6b7280;
    ">

      <div style="
        font-size:44px;
        margin-bottom:10px;
      ">
        🔐
      </div>

      <h3 style="
        color:#374151;
        margin:0 0 8px;
      ">
        Silakan login terlebih dahulu
      </h3>

      <p>
        Login untuk melihat riwayat
        penawaran Anda.
      </p>

    </div>

  `;
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

  const container =
    getOffersContainer();

  if (!container) {

    console.warn(
      "Container offers tidak ditemukan."
    );

    return;
  }

  loadingOffers =
    true;


  container.innerHTML = `

    <div style="
      text-align:center;
      padding:35px 15px;
      color:#6b7280;
    ">

      <div style="
        font-size:32px;
        margin-bottom:10px;
      ">
        ⏳
      </div>

      <strong>
        Memuat riwayat penawaran...
      </strong>

      <div style="
        margin-top:5px;
        font-size:13px;
      ">
        Mengambil data dari Firestore
      </div>

    </div>

  `;


  try {

    // ========================================================
    // 1. AMBIL NEEDS
    // ========================================================

    const needsSnapshot =
      await getDocs(
        collection(
          db,
          "needs"
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


    // ========================================================
    // 2. BATASI DATA
    // ========================================================

    const limitedNeeds =
      needs.slice(
        0,
        MAX_NEEDS
      );


    // ========================================================
    // 3. AMBIL OFFERS
    // ========================================================

    const allOffers = [];


    await Promise.all(

      limitedNeeds.map(
        async need => {

          try {

            const offersRef =
              collection(
                db,
                "needs",
                need.id,
                "offers"
              );


            const offersQuery =
              query(

                offersRef,

                where(
                  "providerId",
                  "==",
                  providerId
                )

              );


            const snapshot =
              await getDocs(
                offersQuery
              );


            snapshot.forEach(
              item => {

                allOffers.push({

                  id:
                    item.id,

                  needId:
                    need.id,

                  needTitle:
                    need.title ||
                    "Kebutuhan",

                  needDescription:
                    need.description ||
                    "",

                  needBudget:
                    need.budget ||
                    0,

                  ...item.data()

                });

              }
            );

          } catch (error) {

            console.warn(
              "Gagal membaca offers:",
              need.id,
              error
            );

          }

        }
      )

    );


    // ========================================================
    // 4. SORT
    // ========================================================

    allOffers.sort(
      (a, b) => {

        return (
          getTimestampValue(
            b.createdAt
          ) -
          getTimestampValue(
            a.createdAt
          )
        );

      }
    );


    // ========================================================
    // 5. COUNT
    // ========================================================

    updateOfferCount(
      allOffers.length
    );


    // ========================================================
    // 6. RENDER
    // ========================================================

    if (
      allOffers.length === 0
    ) {

      showEmptyOffers();

      return;
    }


    container.innerHTML =
      allOffers
        .map(
          createOfferCard
        )
        .join("");


    attachOfferButtons();


  } catch (error) {

    console.error(
      "LOAD MY OFFERS ERROR:",
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
      padding:40px 15px;
      color:#6b7280;
    ">

      <div style="
        font-size:46px;
        margin-bottom:10px;
      ">
        💰
      </div>

      <h3 style="
        margin:0;
        color:#374151;
      ">
        Belum ada penawaran
      </h3>

      <p style="
        margin-top:8px;
      ">
        Penawaran yang Anda kirim
        akan muncul di sini.
      </p>

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
      error?.message ||
      ""
    ).toLowerCase();


  if (
    text.includes(
      "permission"
    )
  ) {

    message =
      "Firestore menolak akses. Periksa Firestore Rules.";

  }


  if (
    text.includes(
      "network"
    )
  ) {

    message =
      "Koneksi internet bermasalah.";

  }


  container.innerHTML = `

    <div style="
      text-align:center;
      padding:35px 15px;
    ">

      <div style="
        font-size:42px;
      ">
        ⚠️
      </div>

      <h3>
        ${escapeHTML(message)}
      </h3>

      <button
        id="retryOffers"
        class="btn btn-primary"
        type="button"
      >
        🔄 Coba Lagi
      </button>

    </div>

  `;


  $("#retryOffers")
    ?.addEventListener(
      "click",
      () => {

        if (
          currentUser
        ) {

          loadMyOffers(
            currentUser.uid
          );

        }

      }
    );

}


// ============================================================
// OFFER COUNT
// ============================================================

function updateOfferCount(
  count
) {

  const ids = [

    "offerCount",

    "totalOffers",

    "myOfferCount",

    "jumlahPenawaran"

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
// CREATE OFFER CARD
// ============================================================

function createOfferCard(
  offer
) {

  const title =
    offer.needTitle ||
    "Kebutuhan";


  const description =
    offer.needDescription ||
    "";


  const price =
    offer.price ??
    0;


  const budget =
    offer.needBudget ??
    0;


  const duration =
    offer.duration ||
    "-";


  const message =
    offer.message ||
    "";


  const status =
    String(
      offer.status ||
      "pending"
    ).toLowerCase();


  const statusText =
    getStatusText(
      status
    );


  const needId =
    offer.needId;


  return `

    <article
      class="offer-card"
      style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:16px;
        margin-bottom:14px;
        box-shadow:
          0 4px 14px
          rgba(0,0,0,.05);
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
        ">

          <h3 style="
            margin:0;
            font-size:17px;
            color:#111827;
          ">
            ${escapeHTML(title)}
          </h3>

          <div style="
            margin-top:6px;
            color:#6b7280;
            font-size:13px;
          ">
            📌 Kebutuhan
          </div>

        </div>


        <span style="
          flex-shrink:0;
          padding:6px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:700;
          background:
            ${getStatusBackground(status)};
          color:
            ${getStatusColor(status)};
        ">
          ${escapeHTML(statusText)}
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
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(
              130px,
              1fr
            )
          );
        gap:10px;
        margin-top:14px;
      ">


        <div style="
          background:#f0fdf4;
          padding:11px;
          border-radius:10px;
        ">

          <small style="
            color:#6b7280;
          ">
            Penawaran Anda
          </small>

          <strong style="
            display:block;
            margin-top:4px;
            color:#16a34a;
            font-size:16px;
          ">
            ${formatRupiah(price)}
          </strong>

        </div>


        <div style="
          background:#eff6ff;
          padding:11px;
          border-radius:10px;
        ">

          <small style="
            color:#6b7280;
          ">
            Budget
          </small>

          <strong style="
            display:block;
            margin-top:4px;
            color:#2563eb;
            font-size:16px;
          ">
            ${formatRupiah(budget)}
          </strong>

        </div>


        <div style="
          background:#f9fafb;
          padding:11px;
          border-radius:10px;
        ">

          <small style="
            color:#6b7280;
          ">
            Durasi
          </small>

          <strong style="
            display:block;
            margin-top:4px;
            color:#374151;
            font-size:14px;
          ">
            ${escapeHTML(duration)}
          </strong>

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

              <strong>
                Pesan:
              </strong>

              ${escapeHTML(message)}

            </div>

          `
          : ""
      }


      <div style="
        margin-top:12px;
        font-size:12px;
        color:#9ca3af;
      ">

        Dikirim:
        ${escapeHTML(
          formatDate(
            offer.createdAt
          )
        )}

      </div>


      ${
        needId
          ? `

            <button
              class="view-need-btn"
              data-id="${escapeHTML(
                needId
              )}"
              type="button"
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
          : ""
      }

    </article>

  `;

}


// ============================================================
// STATUS
// ============================================================

function getStatusText(
  status
) {

  const map = {

    pending:
      "Menunggu",

    accepted:
      "Diterima",

    rejected:
      "Ditolak",

    completed:
      "Selesai",

    cancelled:
      "Dibatalkan",

    canceled:
      "Dibatalkan"

  };


  return (
    map[status] ||
    status
  );

}


function getStatusBackground(
  status
) {

  if (
    status === "accepted"
  ) {

    return "#dcfce7";

  }


  if (
    status === "rejected"
  ) {

    return "#fee2e2";

  }


  if (
    status === "completed"
  ) {

    return "#dbeafe";

  }


  if (
    status === "cancelled" ||
    status === "canceled"
  ) {

    return "#f3f4f6";

  }


  return "#fef3c7";

}


function getStatusColor(
  status
) {

  if (
    status === "accepted"
  ) {

    return "#15803d";

  }


  if (
    status === "rejected"
  ) {

    return "#b91c1c";

  }


  if (
    status === "completed"
  ) {

    return "#1d4ed8";

  }


  if (
    status === "cancelled" ||
    status === "canceled"
  ) {

    return "#4b5563";

  }


  return "#a16207";

}


// ============================================================
// VIEW NEED
// ============================================================

function attachOfferButtons() {

  document
    .querySelectorAll(
      ".view-need-btn"
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
    button
      ? button.textContent
      : "Simpan";


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Menyimpan...";

  }


  try {

    await updateProfile(
      currentUser,
      {
        displayName:
          name
      }
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

const profileForm =
  $("#profileForm");


if (profileForm) {

  profileForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      saveProfile();

    }
  );

}


// ============================================================
// SAVE BUTTON
// ============================================================

const saveButton =
  $("#saveProfileBtn") ||
  $("#btnSaveProfile");


if (
  saveButton &&
  !profileForm
) {

  saveButton.addEventListener(
    "click",
    saveProfile
  );

}


// ============================================================
// LOGOUT
// ============================================================

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

        showToast(
          "Gagal logout.",
          "error"
        );

      }

    }
  );

}


// ============================================================
// GLOBAL DEBUG
// ============================================================

window.reloadOfferHistory =
  function() {

    if (
      currentUser
    ) {

      return loadMyOffers(
        currentUser.uid
      );

    }

    showToast(
      "Silakan login terlebih dahulu.",
      "error"
    );

  };


window.profileDebug = {

  getUser() {

    return currentUser;

  },

  reloadOffers() {

    if (
      currentUser
    ) {

      return loadMyOffers(
        currentUser.uid
      );

    }

  }

};


console.log(
  "✅ profile.js aktif"
);
