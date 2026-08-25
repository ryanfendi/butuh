// ============================================================
// PROFILE.JS
// BUTUH - Profil Pengguna
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
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase.js";

// ============================================================
// CONFIG
// ============================================================

const MAX_OFFERS = 100;
const TIMEOUT = 12000;

// ============================================================
// STATE
// ============================================================

let currentUser = null;
let loading = false;

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
// TIMEOUT
// ============================================================

function timeoutPromise(
  promise,
  ms = TIMEOUT
) {

  return Promise.race([

    promise,

    new Promise(
      (_, reject) => {

        setTimeout(() => {

          reject(
            new Error(
              "Request timeout"
            )
          );

        }, ms);

      }
    )

  ]);
}

// ============================================================
// RUPIAH
// ============================================================

function rupiah(value) {

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

function getDate(value) {

  if (!value) {
    return null;
  }

  try {

    if (
      typeof value.toDate ===
      "function"
    ) {
      return value.toDate();
    }

    if (
      value.seconds !==
      undefined
    ) {
      return new Date(
        value.seconds * 1000
      );
    }

    const date =
      new Date(value);

    if (
      isNaN(date.getTime())
    ) {
      return null;
    }

    return date;

  } catch {

    return null;
  }
}

function formatDate(value) {

  const date =
    getDate(value);

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
        transform: "translateX(-50%)",
        zIndex: "999999",
        padding: "12px 18px",
        borderRadius: "12px",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "600",
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
      () => toast.remove(),
      3000
    );
}

// ============================================================
// PROFILE ELEMENT
// ============================================================

function profileNameElement() {

  return (
    $("#profileName") ||
    $("#userName") ||
    $("#displayName")
  );
}

function profileEmailElement() {

  return (
    $("#profileEmail") ||
    $("#userEmail")
  );
}

function profilePhotoElement() {

  return (
    $("#profilePhoto") ||
    $("#userPhoto") ||
    $("#userAvatar")
  );
}

function profileNameInput() {

  return (
    $("#nameInput") ||
    $("#displayNameInput") ||
    $("#profileNameInput")
  );
}

// ============================================================
// OFFER CONTAINER
// ============================================================

function offerContainer() {

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
  async (user) => {

    console.log(
      "Auth state:",
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

    renderUser(
      user
    );

    await loadOffers(
      user.uid
    );
  }
);

// ============================================================
// RENDER USER
// ============================================================

function renderUser(user) {

  const name =
    user.displayName ||
    (
      user.email
        ? user.email.split("@")[0]
        : "Pengguna"
    );

  const nameEl =
    profileNameElement();

  const emailEl =
    profileEmailElement();

  const photoEl =
    profilePhotoElement();

  const input =
    profileNameInput();

  if (nameEl) {

    nameEl.textContent =
      name;
  }

  if (emailEl) {

    emailEl.textContent =
      user.email || "-";
  }

  if (input) {

    input.value =
      user.displayName || "";
  }

  if (
    photoEl &&
    user.photoURL
  ) {

    photoEl.src =
      user.photoURL;

    photoEl.style.display =
      "block";
  }
}

// ============================================================
// LOGIN MESSAGE
// ============================================================

function showLoginMessage() {

  const container =
    offerContainer();

  if (!container) {
    return;
  }

  container.innerHTML = `

    <div style="
      text-align:center;
      padding:40px 15px;
    ">

      <div style="
        font-size:42px;
      ">
        🔐
      </div>

      <h3>
        Silakan Login
      </h3>

      <p>
        Login untuk melihat
        riwayat penawaran Anda.
      </p>

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

  if (loading) {
    return;
  }

  const container =
    offerContainer();

  if (!container) {

    console.warn(
      "Element riwayat penawaran tidak ditemukan."
    );

    return;
  }

  loading =
    true;

  container.innerHTML = `

    <div style="
      text-align:center;
      padding:30px;
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

  try {

    /*
      PENTING:

      Tidak menggunakan orderBy().

      Query hanya menggunakan providerId.
      Jadi tidak membutuhkan composite index.
    */

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
      await timeoutPromise(
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

    // ========================================================
    // SORT
    // ========================================================

    offers.sort(
      (a, b) => {

        const dateA =
          getDate(
            a.createdAt ||
            a.timestamp
          );

        const dateB =
          getDate(
            b.createdAt ||
            b.timestamp
          );

        return (
          (dateB?.getTime() || 0) -
          (dateA?.getTime() || 0)
        );

      }
    );

    // ========================================================
    // COUNT
    // ========================================================

    updateOfferCount(
      offers.length
    );

    // ========================================================
    // EMPTY
    // ========================================================

    if (
      offers.length === 0
    ) {

      showEmptyOffers();

      return;
    }

    // ========================================================
    // RENDER
    // ========================================================

    container.innerHTML =
      offers
        .map(
          createOfferCard
        )
        .join("");

  } catch (error) {

    console.error(
      "LOAD OFFERS ERROR:",
      error
    );

    showOfferError(
      error
    );

  } finally {

    loading =
      false;
  }
}

// ============================================================
// EMPTY
// ============================================================

function showEmptyOffers() {

  const container =
    offerContainer();

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
        margin-bottom:12px;
      ">
        💰
      </div>

      <h3 style="
        color:#374151;
        margin:0;
      ">
        Belum ada penawaran
      </h3>

      <p>
        Penawaran yang Anda kirim
        akan muncul di sini.
      </p>

    </div>

  `;
}

// ============================================================
// ERROR
// ============================================================

function showOfferError(
  error
) {

  const container =
    offerContainer();

  if (!container) {
    return;
  }

  console.error(
    error?.message
  );

  container.innerHTML = `

    <div style="
      text-align:center;
      padding:40px 15px;
    ">

      <div style="
        font-size:44px;
      ">
        ⚠️
      </div>

      <h3>
        Gagal memuat penawaran
      </h3>

      <p style="
        color:#6b7280;
      ">
        Silakan coba lagi.
      </p>

      <button
        id="retryOffers"
        class="btn btn-primary"
        type="button"
      >
        🔄 Coba Lagi
      </button>

    </div>

  `;

  const button =
    $("#retryOffers");

  if (button) {

    button.onclick =
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

  const ids = [

    "offerCount",

    "totalOffers",

    "myOfferCount",

    "jumlahPenawaran"

  ];

  ids.forEach(
    (id) => {

      const element =
        document.getElementById(
          id
        );

      if (element) {

        element.textContent =
          count;

      }

    }
  );
}

// ============================================================
// OFFER CARD
// ============================================================

function createOfferCard(
  offer
) {

  const title =
    offer.requirementTitle ||
    offer.needTitle ||
    offer.title ||
    "Kebutuhan";

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

  const status =
    String(
      offer.status ||
      "pending"
    ).toLowerCase();

  const statusLabel =
    getStatusLabel(
      status
    );

  const date =
    offer.createdAt ||
    offer.timestamp;

  return `

    <div
      class="offer-card"
      style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:16px;
        margin-bottom:14px;
        box-shadow:
          0 4px 15px
          rgba(0,0,0,.05);
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:flex-start;
      ">

        <h3 style="
          margin:0;
          font-size:17px;
          color:#111827;
        ">
          ${escapeHTML(title)}
        </h3>

        <span style="
          padding:6px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:700;
          background:
            ${getStatusBg(status)};
          color:
            ${getStatusColor(status)};
        ">
          ${escapeHTML(statusLabel)}
        </span>

      </div>

      <div style="
        display:flex;
        gap:10px;
        margin-top:14px;
        flex-wrap:wrap;
      ">

        <div style="
          flex:1;
          min-width:140px;
          padding:12px;
          border-radius:10px;
          background:#f0fdf4;
        ">

          <small>
            Penawaran
          </small>

          <strong style="
            display:block;
            margin-top:4px;
            color:#16a34a;
          ">
            ${rupiah(price)}
          </strong>

        </div>

        <div style="
          flex:1;
          min-width:140px;
          padding:12px;
          border-radius:10px;
          background:#f8fafc;
        ">

          <small>
            Dikirim
          </small>

          <strong style="
            display:block;
            margin-top:4px;
            font-size:13px;
          ">
            ${escapeHTML(
              formatDate(date)
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
              background:#f8fafc;
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

  `;
}

// ============================================================
// STATUS
// ============================================================

function getStatusLabel(
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

function getStatusBg(
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

  return "#a16207";
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
    profileNameInput();

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
      : "";

  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Menyimpan...";
  }

  try {

    await timeoutPromise(
      updateProfile(
        currentUser,
        {
          displayName:
            name
        }
      )
    );

    renderUser(
      currentUser
    );

    showToast(
      "Profil berhasil diperbarui.",
      "success"
    );

  } catch (error) {

    console.error(
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
        oldText ||
        "Simpan";
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

        const {
          signOut
        } = await import(
          "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
        );

        await signOut(
          auth
        );

        window.location.href =
          "index.html";

      } catch (error) {

        console.error(
          error
        );

        logoutButton.disabled =
          false;

        showToast(
          "Gagal keluar.",
          "error"
        );
      }
    }
  );
}

// ============================================================
// GLOBAL
// ============================================================

window.reloadOfferHistory =
  function () {

    if (
      currentUser
    ) {

      loadOffers(
        currentUser.uid
      );

    }

  };

console.log(
  "✅ profile.js berhasil dimuat"
);
