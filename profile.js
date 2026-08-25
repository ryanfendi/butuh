// ============================================================
// PROFILE.JS
// Marketplace Kebutuhan & Penawaran
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
// KONFIGURASI
// ============================================================

const MAX_OFFERS = 100;
const LOAD_TIMEOUT = 12000;

// ============================================================
// ELEMENT
// ============================================================

const $ = (selector) => document.querySelector(selector);

const profileName =
  $("#profileName") ||
  $("#userName") ||
  $("#displayName");

const profileEmail =
  $("#profileEmail") ||
  $("#userEmail");

const profilePhoto =
  $("#profilePhoto") ||
  $("#userAvatar");

const profileForm =
  $("#profileForm");

const nameInput =
  $("#nameInput") ||
  $("#displayNameInput") ||
  $("#profileNameInput");

const saveProfileBtn =
  $("#saveProfileBtn") ||
  $("#btnSaveProfile");

const logoutBtn =
  $("#logoutBtn") ||
  $("#btnLogout");

const offersContainer =
  $("#offersContainer") ||
  $("#offerHistory") ||
  $("#offersList");

const loadingOffers =
  $("#loadingOffers");

const offerCount =
  $("#offerCount");

const emptyOffers =
  $("#emptyOffers");

// ============================================================
// STATE
// ============================================================

let currentUser = null;
let isLoadingOffers = false;

// ============================================================
// UTILITIES
// ============================================================

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRupiah(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

function formatDate(timestamp) {
  if (!timestamp) return "-";

  try {
    let date;

    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    return "-";
  }
}

function getInitial(name) {
  const text = String(name || "U").trim();

  if (!text) return "U";

  return text
    .charAt(0)
    .toUpperCase();
}

function getOfferStatus(offer) {
  const status =
    offer.status ||
    offer.offerStatus ||
    "pending";

  return String(status).toLowerCase();
}

function statusLabel(status) {
  switch (status) {
    case "accepted":
    case "diterima":
      return "Diterima";

    case "rejected":
    case "ditolak":
      return "Ditolak";

    case "cancelled":
    case "canceled":
    case "dibatalkan":
      return "Dibatalkan";

    case "completed":
    case "selesai":
      return "Selesai";

    case "pending":
    case "menunggu":
      return "Menunggu";

    default:
      return status;
  }
}

function statusClass(status) {
  switch (status) {
    case "accepted":
    case "diterima":
      return "accepted";

    case "rejected":
    case "ditolak":
      return "rejected";

    case "completed":
    case "selesai":
      return "completed";

    case "cancelled":
    case "canceled":
    case "dibatalkan":
      return "cancelled";

    default:
      return "pending";
  }
}

// ============================================================
// TIMEOUT
// ============================================================

function withTimeout(promise, ms = LOAD_TIMEOUT) {
  return Promise.race([
    promise,

    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Permintaan terlalu lama. Silakan coba lagi."
          )
        );
      }, ms);
    })
  ]);
}

// ============================================================
// TOAST
// ============================================================

function showMessage(message, type = "info") {
  let toast = document.getElementById("profileToast");

  if (!toast) {
    toast = document.createElement("div");

    toast.id = "profileToast";

    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "25px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "99999";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "12px";
    toast.style.background = "#222";
    toast.style.color = "#fff";
    toast.style.fontSize = "14px";
    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,.2)";
    toast.style.maxWidth = "90%";
    toast.style.textAlign = "center";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  if (type === "error") {
    toast.style.background = "#dc2626";
  } else if (type === "success") {
    toast.style.background = "#16a34a";
  } else {
    toast.style.background = "#222";
  }

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;

    // Jangan redirect secara agresif jika profile.js
    // dipakai pada halaman yang memiliki sistem auth sendiri.
    if (
      location.pathname.includes("profile") ||
      location.pathname.includes("profil")
    ) {
      window.location.href = "index.html";
    }

    return;
  }

  currentUser = user;

  renderProfile(user);

  await loadOffers(user.uid);
});

// ============================================================
// RENDER PROFILE
// ============================================================

function renderProfile(user) {
  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";

  if (profileName) {
    profileName.textContent = name;
  }

  if (profileEmail) {
    profileEmail.textContent =
      user.email || "-";
  }

  if (nameInput) {
    nameInput.value = user.displayName || "";
  }

  if (profilePhoto) {
    if (user.photoURL) {
      profilePhoto.src = user.photoURL;
      profilePhoto.style.display = "block";
    } else {
      profilePhoto.style.display = "none";

      const parent =
        profilePhoto.parentElement;

      if (parent && !parent.querySelector(".profile-initial")) {
        const initial =
          document.createElement("div");

        initial.className =
          "profile-initial";

        initial.textContent =
          getInitial(name);

        initial.style.width = "64px";
        initial.style.height = "64px";
        initial.style.borderRadius = "50%";
        initial.style.display = "flex";
        initial.style.alignItems = "center";
        initial.style.justifyContent = "center";
        initial.style.background = "#2563eb";
        initial.style.color = "#fff";
        initial.style.fontSize = "24px";
        initial.style.fontWeight = "700";

        parent.appendChild(initial);
      }
    }
  }
}

// ============================================================
// LOAD OFFER HISTORY
// ============================================================

async function loadOffers(providerId) {
  if (!providerId) return;

  if (isLoadingOffers) return;

  isLoadingOffers = true;

  showOffersLoading();

  try {
    /*
      PENTING:

      Kita sengaja TIDAK menggunakan:

      orderBy("createdAt")

      pada query utama.

      Tujuannya supaya riwayat penawaran tidak kembali
      membutuhkan composite/collection-group index.

      Setelah data diperoleh, sorting dilakukan di browser.
    */

    const offersRef =
      collection(db, "offers");

    const q =
      query(
        offersRef,
        where("providerId", "==", providerId),
        limit(MAX_OFFERS)
      );

    const snapshot =
      await withTimeout(
        getDocs(q)
      );

    const offers = [];

    snapshot.forEach((docSnap) => {
      offers.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // ========================================================
    // SORT TERBARU
    // ========================================================

    offers.sort((a, b) => {
      const dateA =
        getTimestampValue(
          a.createdAt ||
          a.updatedAt ||
          a.timestamp
        );

      const dateB =
        getTimestampValue(
          b.createdAt ||
          b.updatedAt ||
          b.timestamp
        );

      return dateB - dateA;
    });

    updateOfferCount(offers.length);

    if (!offers.length) {
      showEmptyOffers();
      return;
    }

    hideOffersLoading();

    await renderOffers(offers);

  } catch (error) {
    console.error(
      "Gagal memuat riwayat penawaran:",
      error
    );

    hideOffersLoading();

    showOffersError(error);

  } finally {
    isLoadingOffers = false;
  }
}

// ============================================================
// TIMESTAMP
// ============================================================

function getTimestampValue(timestamp) {
  if (!timestamp) return 0;

  try {
    if (timestamp?.toMillis) {
      return timestamp.toMillis();
    }

    if (timestamp?.seconds) {
      return timestamp.seconds * 1000;
    }

    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }

    const value =
      new Date(timestamp).getTime();

    return isNaN(value) ? 0 : value;

  } catch {
    return 0;
  }
}

// ============================================================
// LOADING
// ============================================================

function showOffersLoading() {
  if (loadingOffers) {
    loadingOffers.style.display = "block";
    loadingOffers.innerHTML =
      "Memuat riwayat penawaran...";
  }

  if (offersContainer) {
    offersContainer.innerHTML = "";
  }

  if (emptyOffers) {
    emptyOffers.style.display = "none";
  }
}

function hideOffersLoading() {
  if (loadingOffers) {
    loadingOffers.style.display = "none";
  }
}

// ============================================================
// EMPTY
// ============================================================

function showEmptyOffers() {
  hideOffersLoading();

  if (emptyOffers) {
    emptyOffers.style.display = "block";

    emptyOffers.innerHTML = `
      <div style="
        text-align:center;
        padding:30px 15px;
        color:#6b7280;
      ">
        <div style="
          font-size:40px;
          margin-bottom:10px;
        ">💰</div>

        <strong>
          Belum ada penawaran
        </strong>

        <div style="
          margin-top:6px;
          font-size:14px;
        ">
          Penawaran yang Anda kirim akan
          muncul di sini.
        </div>
      </div>
    `;
  }

  if (offersContainer) {
    offersContainer.innerHTML = "";
  }
}

// ============================================================
// ERROR
// ============================================================

function showOffersError(error) {
  if (!offersContainer) return;

  let message =
    "Gagal memuat riwayat penawaran.";

  const text =
    String(error?.message || "").toLowerCase();

  if (
    text.includes("permission") ||
    text.includes("permission-denied")
  ) {
    message =
      "Anda tidak memiliki izin untuk membaca riwayat penawaran.";
  }

  if (
    text.includes("network") ||
    text.includes("offline")
  ) {
    message =
      "Koneksi internet bermasalah. Silakan coba lagi.";
  }

  if (
    text.includes("terlalu lama")
  ) {
    message =
      "Pengambilan data terlalu lama. Silakan coba lagi.";
  }

  offersContainer.innerHTML = `
    <div style="
      text-align:center;
      padding:30px 15px;
    ">
      <div style="
        font-size:40px;
        margin-bottom:10px;
      ">⚠️</div>

      <strong>
        ${escapeHTML(message)}
      </strong>

      <button
        id="retryOffersBtn"
        style="
          display:block;
          margin:15px auto 0;
          padding:10px 18px;
          border:0;
          border-radius:10px;
          background:#2563eb;
          color:white;
          cursor:pointer;
        "
      >
        Coba Lagi
      </button>
    </div>
  `;

  const retry =
    document.getElementById(
      "retryOffersBtn"
    );

  if (retry) {
    retry.addEventListener(
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
}

// ============================================================
// COUNT
// ============================================================

function updateOfferCount(count) {
  if (offerCount) {
    offerCount.textContent =
      String(count);
  }

  const possibleCounters = [
    "#totalOffers",
    "#myOfferCount",
    "#jumlahPenawaran"
  ];

  possibleCounters.forEach((selector) => {
    const element =
      document.querySelector(selector);

    if (element) {
      element.textContent =
        String(count);
    }
  });
}

// ============================================================
// RENDER OFFERS
// ============================================================

async function renderOffers(offers) {
  if (!offersContainer) return;

  hideOffersLoading();

  offersContainer.innerHTML = "";

  /*
    Ambil kebutuhan terkait secara paralel.

    Jika field requirementId/requestId/postId tidak ada,
    kartu tetap ditampilkan menggunakan data yang tersimpan
    di offer.
  */

  const rendered =
    await Promise.all(
      offers.map(async (offer) => {

        let requirement = null;

        const requirementId =
          offer.requirementId ||
          offer.needId ||
          offer.requestId ||
          offer.postId;

        if (requirementId) {
          requirement =
            await getRequirement(
              requirementId
            );
        }

        return createOfferCard(
          offer,
          requirement
        );
      })
    );

  offersContainer.innerHTML =
    rendered.join("");
}

// ============================================================
// GET REQUIREMENT
// ============================================================

async function getRequirement(requirementId) {
  try {
    const possibleCollections = [
      "needs",
      "requirements",
      "requests"
    ];

    for (
      const collectionName
      of possibleCollections
    ) {
      try {
        const ref =
          doc(
            db,
            collectionName,
            requirementId
          );

        const snap =
          await getDoc(ref);

        if (snap.exists()) {
          return {
            id: snap.id,
            ...snap.data()
          };
        }

      } catch (error) {
        console.warn(
          `Tidak dapat membaca ${collectionName}:`,
          error
        );
      }
    }

  } catch (error) {
    console.warn(
      "Gagal mengambil kebutuhan:",
      error
    );
  }

  return null;
}

// ============================================================
// CREATE OFFER CARD
// ============================================================

function createOfferCard(
  offer,
  requirement
) {
  const status =
    getOfferStatus(offer);

  const statusText =
    statusLabel(status);

  const statusCSS =
    statusClass(status);

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
    offer.description ||
    "";

  const createdAt =
    offer.createdAt ||
    offer.timestamp ||
    offer.updatedAt;

  const location =
    requirement?.location ||
    requirement?.city ||
    offer.location ||
    "";

  return `
    <div
      class="offer-card"
      data-offer-id="${escapeHTML(offer.id)}"
      style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:16px;
        margin-bottom:14px;
        box-shadow:0 3px 12px rgba(0,0,0,.05);
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:flex-start;
      ">

        <div style="
          flex:1;
          min-width:0;
        ">

          <div style="
            font-size:17px;
            font-weight:700;
            color:#111827;
            margin-bottom:6px;
          ">
            ${escapeHTML(title)}
          </div>

          ${
            location
              ? `
                <div style="
                  font-size:13px;
                  color:#6b7280;
                  margin-bottom:8px;
                ">
                  📍 ${escapeHTML(location)}
                </div>
              `
              : ""
          }

        </div>

        <span
          class="offer-status ${statusCSS}"
          style="
            flex-shrink:0;
            padding:6px 10px;
            border-radius:999px;
            font-size:12px;
            font-weight:600;
            background:#f3f4f6;
          "
        >
          ${escapeHTML(statusText)}
        </span>

      </div>

      ${
        description
          ? `
            <div style="
              margin-top:10px;
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
        flex-wrap:wrap;
        gap:10px;
        margin-top:14px;
      ">

        <div style="
          flex:1;
          min-width:130px;
          background:#f8fafc;
          border-radius:10px;
          padding:10px;
        ">
          <div style="
            font-size:11px;
            color:#6b7280;
          ">
            Penawaran
          </div>

          <div style="
            margin-top:3px;
            font-size:16px;
            font-weight:700;
            color:#16a34a;
          ">
            ${formatRupiah(price)}
          </div>
        </div>

        <div style="
          flex:1;
          min-width:130px;
          background:#f8fafc;
          border-radius:10px;
          padding:10px;
        ">
          <div style="
            font-size:11px;
            color:#6b7280;
          ">
            Dikirim
          </div>

          <div style="
            margin-top:3px;
            font-size:13px;
            font-weight:600;
            color:#374151;
          ">
            ${escapeHTML(formatDate(createdAt))}
          </div>
        </div>

      </div>

      ${
        message
          ? `
            <div style="
              margin-top:12px;
              padding:10px;
              background:#f9fafb;
              border-radius:10px;
              font-size:13px;
              color:#4b5563;
            ">
              <strong>Pesan:</strong>
              ${escapeHTML(message)}
            </div>
          `
          : ""
      }

      ${
        requirement?.id ||
        offer.requirementId ||
        offer.needId ||
        offer.requestId
          ? `
            <button
              class="view-offer-requirement"
              data-id="${escapeHTML(
                requirement?.id ||
                offer.requirementId ||
                offer.needId ||
                offer.requestId
              )}"
              style="
                margin-top:14px;
                width:100%;
                padding:10px;
                border:1px solid #dbeafe;
                border-radius:10px;
                background:#eff6ff;
                color:#2563eb;
                font-weight:600;
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
// VIEW REQUIREMENT
// ============================================================

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        ".view-offer-requirement"
      );

    if (!button) return;

    const id =
      button.dataset.id;

    if (!id) return;

    /*
      Sesuaikan jika halaman detail kebutuhan
      di proyek Anda menggunakan nama file berbeda.
    */

    window.location.href =
      `detail.html?id=${encodeURIComponent(id)}`;
  }
);

// ============================================================
// UPDATE PROFILE
// ============================================================

if (profileForm) {

  profileForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      if (!currentUser) {
        showMessage(
          "Silakan login terlebih dahulu.",
          "error"
        );
        return;
      }

      const newName =
        String(
          nameInput?.value || ""
        ).trim();

      if (!newName) {
        showMessage(
          "Nama tidak boleh kosong.",
          "error"
        );
        return;
      }

      if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        saveProfileBtn.dataset.oldText =
          saveProfileBtn.textContent;

        saveProfileBtn.textContent =
          "Menyimpan...";
      }

      try {

        await withTimeout(
          updateProfile(
            currentUser,
            {
              displayName: newName
            }
          )
        );

        renderProfile(
          currentUser
        );

        showMessage(
          "Profil berhasil diperbarui.",
          "success"
        );

      } catch (error) {

        console.error(
          "Gagal update profil:",
          error
        );

        showMessage(
          "Gagal memperbarui profil.",
          "error"
        );

      } finally {

        if (saveProfileBtn) {
          saveProfileBtn.disabled =
            false;

          saveProfileBtn.textContent =
            saveProfileBtn.dataset.oldText ||
            "Simpan";
        }

      }
    }
  );
}

// ============================================================
// SAVE BUTTON JIKA BUKAN FORM
// ============================================================

if (
  saveProfileBtn &&
  !profileForm
) {

  saveProfileBtn.addEventListener(
    "click",
    async () => {

      if (!currentUser) {
        showMessage(
          "Silakan login terlebih dahulu.",
          "error"
        );
        return;
      }

      const newName =
        String(
          nameInput?.value || ""
        ).trim();

      if (!newName) {
        showMessage(
          "Nama tidak boleh kosong.",
          "error"
        );
        return;
      }

      saveProfileBtn.disabled =
        true;

      const oldText =
        saveProfileBtn.textContent;

      saveProfileBtn.textContent =
        "Menyimpan...";

      try {

        await withTimeout(
          updateProfile(
            currentUser,
            {
              displayName: newName
            }
          )
        );

        renderProfile(
          currentUser
        );

        showMessage(
          "Profil berhasil diperbarui.",
          "success"
        );

      } catch (error) {

        console.error(error);

        showMessage(
          "Gagal menyimpan profil.",
          "error"
        );

      } finally {

        saveProfileBtn.disabled =
          false;

        saveProfileBtn.textContent =
          oldText;
      }
    }
  );
}

// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        logoutBtn.disabled = true;

        await auth.signOut();

        window.location.href =
          "index.html";

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

        logoutBtn.disabled =
          false;

        showMessage(
          "Gagal logout. Silakan coba lagi.",
          "error"
        );
      }
    }
  );
}

// ============================================================
// REFRESH RIWAYAT
// ============================================================

window.reloadOfferHistory =
  function () {

    if (!currentUser) {
      showMessage(
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
    if (currentUser) {
      return loadOffers(
        currentUser.uid
      );
    }
  }
};

console.log(
  "✅ profile.js berhasil dimuat"
);
