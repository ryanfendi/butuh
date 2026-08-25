// ============================================================
// PROFILE.JS
// Marketplace Kebutuhan
// ============================================================

import {
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase.js";

// ============================================================
// CONFIG
// ============================================================

const MAX_OFFERS = 100;
const LOAD_TIMEOUT = 12000;

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

function escapeHTML(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
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

function timestampToDate(timestamp) {

  if (!timestamp) {
    return null;
  }

  try {

    if (
      typeof timestamp.toDate === "function"
    ) {
      return timestamp.toDate();
    }

    if (
      timestamp.seconds !== undefined
    ) {
      return new Date(
        timestamp.seconds * 1000
      );
    }

    if (
      timestamp instanceof Date
    ) {
      return timestamp;
    }

    const date =
      new Date(timestamp);

    if (
      isNaN(date.getTime())
    ) {
      return null;
    }

    return date;

  } catch (error) {

    console.warn(
      "Gagal membaca tanggal:",
      error
    );

    return null;
  }
}

function formatDate(timestamp) {

  const date =
    timestampToDate(timestamp);

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
// TIME VALUE
// ============================================================

function timestampValue(timestamp) {

  const date =
    timestampToDate(timestamp);

  if (!date) {
    return 0;
  }

  return date.getTime();
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

        setTimeout(() => {

          reject(
            new Error(
              "Permintaan terlalu lama."
            )
          );

        }, timeout);

      }
    )

  ]);
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
      "#ffffff";

    element.style.fontSize =
      "14px";

    element.style.fontWeight =
      "600";

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
// AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      currentUser = null;

      showNotLoggedIn();

      return;
    }

    currentUser =
      user;

    console.log(
      "User login:",
      user.uid
    );

    renderProfile(
      user
    );

    await loadOffers(
      user.uid
    );
  }
);

// ============================================================
// NOT LOGGED IN
// ============================================================

function showNotLoggedIn() {

  const container =
    getOffersContainer();

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div style="
      padding:30px 15px;
      text-align:center;
      color:#6b7280;
    ">
      <div style="
        font-size:40px;
        margin-bottom:10px;
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
// PROFILE ELEMENTS
// ============================================================

function getProfileNameElement() {

  return (
    $("#profileName") ||
    $("#userName") ||
    $("#displayName")
  );
}

function getProfileEmailElement() {

  return (
    $("#profileEmail") ||
    $("#userEmail")
  );
}

function getProfilePhotoElement() {

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
      user.email || "-";
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

    photoElement.style.display =
      "block";
  }
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

  if (loadingOffers) {
    return;
  }

  loadingOffers =
    true;

  const container =
    getOffersContainer();

  const loading =
    $("#loadingOffers");

  const empty =
    $("#emptyOffers");

  if (loading) {

    loading.style.display =
      "block";

    loading.textContent =
      "Memuat riwayat penawaran...";
  }

  if (empty) {

    empty.style.display =
      "none";
  }

  if (container) {

    container.innerHTML =
      "";
  }

  try {

    console.log(
      "Mengambil offers untuk:",
      providerId
    );

    // ========================================================
    // QUERY UTAMA
    // ========================================================
    //
    // TIDAK memakai orderBy().
    //
    // Jadi query ini hanya:
    //
    // providerId == UID
    //
    // Hal ini menghindari kebutuhan composite index.
    //
    // ========================================================

    const offersRef =
      collection(
        db,
        "offers"
      );

    const offersQuery =
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
        getDocs(
          offersQuery
        )
      );

    const offers = [];

    snapshot.forEach(
      (item) => {

        offers.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );

    console.log(
      "Jumlah offers:",
      offers.length
    );

    // ========================================================
    // SORT DI CLIENT
    // ========================================================

    offers.sort(
      (a, b) => {

        const aTime =
          timestampValue(
            a.createdAt ||
            a.timestamp ||
            a.updatedAt
          );

        const bTime =
          timestampValue(
            b.createdAt ||
            b.timestamp ||
            b.updatedAt
          );

        return bTime - aTime;
      }
    );

    updateOfferCount(
      offers.length
    );

    if (!offers.length) {

      showEmptyOffers();

      return;
    }

    if (loading) {

      loading.style.display =
        "none";
    }

    await renderOffers(
      offers
    );

  } catch (error) {

    console.error(
      "ERROR LOAD OFFERS:",
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

  const loading =
    $("#loadingOffers");

  const empty =
    $("#emptyOffers");

  if (loading) {

    loading.style.display =
      "none";
  }

  if (container) {

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
          font-size:16px;
          font-weight:700;
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

  if (empty) {

    empty.style.display =
      "none";
  }
}

// ============================================================
// ERROR
// ============================================================

function showOffersError(
  error
) {

  const container =
    getOffersContainer();

  const loading =
    $("#loadingOffers");

  if (loading) {

    loading.style.display =
      "none";
  }

  if (!container) {
    return;
  }

  let message =
    "Gagal memuat riwayat penawaran.";

  const errorText =
    String(
      error?.message || ""
    ).toLowerCase();

  if (
    errorText.includes(
      "permission"
    )
  ) {

    message =
      "Firestore menolak akses. Periksa Firestore Rules.";
  }

  else if (
    errorText.includes(
      "network"
    )
  ) {

    message =
      "Koneksi internet bermasalah.";
  }

  else if (
    errorText.includes(
      "terlalu lama"
    )
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
        font-weight:700;
        color:#374151;
      ">
        ${escapeHTML(message)}
      </div>

      <button
        id="retryOffersBtn"
        style="
          margin-top:15px;
          padding:10px 18px;
          border:0;
          border-radius:10px;
          background:#2563eb;
          color:white;
          font-weight:600;
          cursor:pointer;
        "
      >
        Coba Lagi
      </button>

    </div>
  `;

  const retry =
    $("#retryOffersBtn");

  if (retry) {

    retry.onclick =
      () => {

        if (
          currentUser
        ) {

          loadOffers(
            currentUser.uid
          );
        }
      };
  }
}

// ============================================================
// COUNT
// ============================================================

function updateOfferCount(
  count
) {

  const elements = [

    $("#offerCount"),

    $("#totalOffers"),

    $("#myOfferCount"),

    $("#jumlahPenawaran")

  ];

  elements.forEach(
    (element) => {

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

    console.warn(
      "Container offers tidak ditemukan."
    );

    return;
  }

  const cards =
    await Promise.all(

      offers.map(
        async (offer) => {

          let requirement =
            null;

          const requirementId =
            offer.requirementId ||
            offer.needId ||
            offer.requestId ||
            offer.postId;

          if (
            requirementId
          ) {

            requirement =
              await getRequirement(
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
// GET REQUIREMENT
// ============================================================

async function getRequirement(
  requirementId
) {

  const collections = [

    "needs",

    "requirements",

    "requests"

  ];

  for (
    const collectionName
    of collections
  ) {

    try {

      const reference =
        doc(
          db,
          collectionName,
          requirementId
        );

      const snapshot =
        await getDoc(
          reference
        );

      if (
        snapshot.exists()
      ) {

        return {

          id:
            snapshot.id,

          ...snapshot.data()

        };
      }

    } catch (error) {

      console.warn(
        `Gagal membaca ${collectionName}:`,
        error
      );
    }
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
      return status;
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

  const requirementId =
    requirement?.id ||

    offer.requirementId ||

    offer.needId ||

    offer.requestId ||

    offer.postId;

  return `

    <div
      class="offer-card"
      data-offer-id="${escapeHTML(
        offer.id
      )}"
      style="
        background:#ffffff;
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
        align-items:flex-start;
        gap:12px;
      ">

        <div style="
          flex:1;
          min-width:0;
        ">

          <div style="
            font-size:17px;
            font-weight:700;
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
                  📍
                  ${escapeHTML(location)}
                </div>
              `
              : ""
          }

        </div>

        <div style="
          flex-shrink:0;
          padding:6px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:700;
          background:${getStatusBackground(
            status
          )};
          color:${getStatusColor(
            status
          )};
        ">
          ${escapeHTML(
            statusText(status)
          )}
        </div>

      </div>

      ${
        description
          ? `
            <div style="
              margin-top:12px;
              font-size:14px;
              line-height:1.5;
              color:#4b5563;
            ">
              ${escapeHTML(description)}
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
          min-width:140px;
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
            font-weight:800;
            color:#16a34a;
          ">
            ${formatRupiah(price)}
          </div>

        </div>

        <div style="
          flex:1;
          min-width:140px;
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
              font-size:13px;
              color:#4b5563;
              line-height:1.5;
            ">
              <strong>Pesan:</strong>
              ${escapeHTML(message)}
            </div>
          `
          : ""
      }

      ${
        requirementId
          ? `
            <button
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
              Lihat Kebutuhan
            </button>
          `
          : ""
      }

    </div>

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
// BUTTONS
// ============================================================

function attachOfferButtons() {

  document
    .querySelectorAll(
      ".view-requirement-btn"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            const id =
              button.dataset.id;

            if (!id) {
              return;
            }

            window.location.href =
              "detail.html?id=" +
              encodeURIComponent(
                id
              );
          };

      }
    );
}

// ============================================================
// UPDATE PROFILE
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
    button
      ? button.textContent
      : "";

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

    toast(
      "Profil berhasil diperbarui.",
      "success"
    );

  } catch (error) {

    console.error(
      "Update profile error:",
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
        oldText ||
        "Simpan";
    }
  }
}

// ============================================================
// FORM
// ============================================================

const profileForm =
  $("#profileForm");

if (profileForm) {

  profileForm.addEventListener(
    "submit",
    (event) => {

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

        await auth.signOut();

        window.location.href =
          "index.html";

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

        logoutButton.disabled =
          false;

        toast(
          "Gagal logout.",
          "error"
        );
      }
    }
  );
}

// ============================================================
// GLOBAL REFRESH
// ============================================================

window.reloadOfferHistory =
  function () {

    if (!currentUser) {

      toast(
        "Silakan login terlebih dahulu.",
        "error"
      );

      return;
    }

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

    if (
      currentUser
    ) {

      return loadOffers(
        currentUser.uid
      );
    }

  }

};

console.log(
  "✅ profile.js aktif"
);
