import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = user;

    renderProfileHeader(user);
    await loadProfileData(user.uid);
  });
});


/* =========================
   PROFILE HEADER
========================= */

function renderProfileHeader(user) {
  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";

  const email = user.email || "";

  const photo =
    user.photoURL ||
    "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/user.svg";

  if ($("profileName")) {
    $("profileName").textContent = name;
  }

  if ($("profileEmail")) {
    $("profileEmail").textContent = email;
  }

  if ($("profilePhoto")) {
    $("profilePhoto").src = photo;
  }

  if ($("userName")) {
    $("userName").textContent = name;
  }

  if ($("userEmail")) {
    $("userEmail").textContent = email;
  }

  if ($("userPhoto")) {
    $("userPhoto").src = photo;
  }
}


/* =========================
   LOAD ALL PROFILE DATA
========================= */

async function loadProfileData(uid) {
  try {
    showLoading();

    const [
      needs,
      offers
    ] = await Promise.all([
      loadNeeds(uid),
      loadOffers(uid)
    ]);

    renderStatistics(needs, offers);
    renderNeeds(needs);
    renderOffers(offers);

  } catch (error) {
    console.error(error);

    showError(
      "Gagal memuat data",
      friendlyError(error)
    );
  }
}


/* =========================
   LOAD NEEDS
========================= */

async function loadNeeds(uid) {
  const result = [];

  try {
    const q = query(
      collection(db, "needs"),
      where("ownerId", "==", uid)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {
      result.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Urutkan di JavaScript
    result.sort((a, b) => {
      return getTimestamp(b.createdAt) -
             getTimestamp(a.createdAt);
    });

    return result;

  } catch (error) {
    console.error("loadNeeds:", error);

    throw new Error(
      "Gagal memuat riwayat kebutuhan: " +
      friendlyError(error)
    );
  }
}


/* =========================
   LOAD OFFERS
========================= */

async function loadOffers(uid) {
  const result = [];

  try {
    const q = query(
      collection(db, "offers"),
      where("providerId", "==", uid)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {
      result.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Urutkan di JavaScript
    result.sort((a, b) => {
      return getTimestamp(b.createdAt) -
             getTimestamp(a.createdAt);
    });

    return result;

  } catch (error) {
    console.error("loadOffers:", error);

    throw new Error(
      "Gagal memuat riwayat penawaran: " +
      friendlyError(error)
    );
  }
}


/* =========================
   STATISTICS
========================= */

function renderStatistics(needs, offers) {

  const totalNeeds = needs.length;
  const totalOffers = offers.length;

  const acceptedOffers =
    offers.filter(o =>
      o.status === "accepted" ||
      o.status === "diterima"
    ).length;

  const completedOffers =
    offers.filter(o =>
      o.status === "completed" ||
      o.status === "selesai"
    ).length;

  const ratingValues = [];

  needs.forEach(n => {
    if (typeof n.rating === "number") {
      ratingValues.push(n.rating);
    }

    if (typeof n.ratingValue === "number") {
      ratingValues.push(n.ratingValue);
    }
  });

  offers.forEach(o => {
    if (typeof o.rating === "number") {
      ratingValues.push(o.rating);
    }

    if (typeof o.ratingValue === "number") {
      ratingValues.push(o.ratingValue);
    }
  });

  const rating =
    ratingValues.length > 0
      ? ratingValues.reduce((a, b) => a + b, 0) /
        ratingValues.length
      : 0;

  setText("totalNeeds", totalNeeds);
  setText("totalOffers", totalOffers);
  setText("acceptedOffers", acceptedOffers);
  setText("completedOffers", completedOffers);

  setText(
    "userRating",
    rating > 0
      ? rating.toFixed(1)
      : "—"
  );

  renderStars(rating);
}


/* =========================
   RENDER NEEDS
========================= */

function renderNeeds(needs) {

  const container =
    $("needsList") ||
    $("needsContainer") ||
    $("riwayatKebutuhan");

  if (!container) return;

  if (needs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Belum ada kebutuhan</h3>
        <p>Anda belum pernah memposting kebutuhan.</p>

        <a href="index.html" class="btn-primary">
          + Tambah Kebutuhan
        </a>
      </div>
    `;

    return;
  }

  container.innerHTML = needs.map(need => {

    const title =
      escapeHTML(
        need.title ||
        need.nama ||
        need.name ||
        "Tanpa judul"
      );

    const description =
      escapeHTML(
        need.description ||
        need.deskripsi ||
        ""
      );

    const budget =
      formatRupiah(
        need.budget ??
        need.price ??
        need.anggaran
      );

    const status =
      need.status ||
      "aktif";

    return `
      <div class="history-card">

        <div class="history-main">

          <h3>${title}</h3>

          ${
            description
              ? `<p>${description}</p>`
              : ""
          }

          <div class="history-meta">

            <span>
              💰 ${budget}
            </span>

            <span>
              📅 ${formatDate(need.createdAt)}
            </span>

          </div>

        </div>

        <div class="status ${statusClass(status)}">
          ${statusLabel(status)}
        </div>

      </div>
    `;

  }).join("");
}


/* =========================
   RENDER OFFERS
========================= */

function renderOffers(offers) {

  const container =
    $("offersList") ||
    $("offersContainer") ||
    $("riwayatPenawaran");

  if (!container) return;

  if (offers.length === 0) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">💬</div>

        <h3>Belum ada penawaran</h3>

        <p>
          Anda belum pernah mengirim penawaran.
        </p>

        <a href="index.html" class="btn-primary">
          🔎 Cari Kebutuhan
        </a>

      </div>
    `;

    return;
  }

  container.innerHTML = offers.map(offer => {

    const title =
      escapeHTML(
        offer.needTitle ||
        offer.title ||
        offer.needName ||
        "Kebutuhan"
      );

    const price =
      formatRupiah(
        offer.price ??
        offer.amount ??
        offer.offerPrice ??
        offer.harga
      );

    const message =
      escapeHTML(
        offer.message ||
        offer.description ||
        offer.pesan ||
        ""
      );

    const status =
      offer.status ||
      "menunggu";

    return `
      <div class="history-card">

        <div class="history-main">

          <h3>${title}</h3>

          <div class="offer-price">
            💰 ${price}
          </div>

          ${
            message
              ? `<p>${message}</p>`
              : ""
          }

          <div class="history-meta">

            <span>
              📅 ${formatDate(offer.createdAt)}
            </span>

          </div>

        </div>

        <div class="status ${statusClass(status)}">
          ${statusLabel(status)}
        </div>

      </div>
    `;

  }).join("");
}


/* =========================
   LOADING
========================= */

function showLoading() {

  [
    "needsList",
    "needsContainer",
    "riwayatKebutuhan",
    "offersList",
    "offersContainer",
    "riwayatPenawaran"
  ].forEach(id => {

    const el = $(id);

    if (el) {
      el.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Memuat data...</p>
        </div>
      `;
    }

  });
}


/* =========================
   ERROR
========================= */

function showError(title, message) {

  const html = `
    <div class="error-state">

      <div class="error-icon">⚠️</div>

      <h3>${escapeHTML(title)}</h3>

      <p>${escapeHTML(message)}</p>

      <button
        class="btn-primary"
        onclick="location.reload()">
        Coba Lagi
      </button>

    </div>
  `;

  const needs =
    $("needsList") ||
    $("needsContainer") ||
    $("riwayatKebutuhan");

  const offers =
    $("offersList") ||
    $("offersContainer") ||
    $("riwayatPenawaran");

  if (needs) needs.innerHTML = html;
  if (offers) offers.innerHTML = html;
}


/* =========================
   HELPERS
========================= */

function setText(id, value) {

  const el = $(id);

  if (el) {
    el.textContent = value;
  }
}


function getTimestamp(value) {

  if (!value) return 0;

  if (
    typeof value === "object" &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value === "object" &&
    value.seconds
  ) {
    return value.seconds * 1000;
  }

  const date = new Date(value);

  return isNaN(date.getTime())
    ? 0
    : date.getTime();
}


function formatDate(value) {

  const timestamp = getTimestamp(value);

  if (!timestamp) return "-";

  return new Date(timestamp).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


function formatRupiah(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Tidak ditentukan";
  }

  const number =
    Number(
      String(value)
        .replace(/[^\d.-]/g, "")
    );

  if (isNaN(number)) {
    return escapeHTML(String(value));
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


function statusLabel(status) {

  const s =
    String(status)
      .toLowerCase();

  const labels = {
    aktif: "Aktif",
    open: "Aktif",
    pending: "Menunggu",
    menunggu: "Menunggu",
    accepted: "Diterima",
    diterima: "Diterima",
    rejected: "Ditolak",
    ditolak: "Ditolak",
    completed: "Selesai",
    selesai: "Selesai",
    cancelled: "Dibatalkan",
    dibatalkan: "Dibatalkan"
  };

  return labels[s] || escapeHTML(status);
}


function statusClass(status) {

  const s =
    String(status)
      .toLowerCase();

  if (
    s === "accepted" ||
    s === "diterima"
  ) {
    return "status-success";
  }

  if (
    s === "completed" ||
    s === "selesai"
  ) {
    return "status-completed";
  }

  if (
    s === "rejected" ||
    s === "ditolak" ||
    s === "cancelled" ||
    s === "dibatalkan"
  ) {
    return "status-danger";
  }

  return "status-pending";
}


function renderStars(rating) {

  const container =
    $("ratingStars");

  if (!container) return;

  if (!rating) {
    container.textContent = "☆☆☆☆☆";
    return;
  }

  const rounded =
    Math.round(rating);

  container.textContent =
    "★".repeat(rounded) +
    "☆".repeat(5 - rounded);
}


function friendlyError(error) {

  const code =
    error?.code || "";

  if (
    code === "permission-denied"
  ) {
    return "Akses Firestore ditolak. Periksa Firestore Rules.";
  }

  if (
    String(error?.message)
      .toLowerCase()
      .includes("index")
  ) {
    return "Query Firestore masih membutuhkan index. Versi ini seharusnya tidak menggunakan composite index.";
  }

  return (
    error?.message ||
    "Terjadi kesalahan."
  );
}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   GLOBAL
========================= */

window.loadProfileData =
  () => {
    if (currentUser) {
      loadProfileData(currentUser.uid);
    }
  };
