// ============================================================
// BUTUH - PROFILE.JS
// Versi stabil tanpa composite index
// ============================================================

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


// ============================================================
// ELEMENT
// ============================================================

const profilePhoto = document.getElementById("profilePhoto");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");

const statNeeds = document.getElementById("statNeeds");
const statOffers = document.getElementById("statOffers");
const statRating = document.getElementById("statRating");

const needsList = document.getElementById("needsList");
const offersList = document.getElementById("offersList");

const loadingNeeds = document.getElementById("loadingNeeds");
const loadingOffers = document.getElementById("loadingOffers");


// ============================================================
// HELPER
// ============================================================

function escapeHTML(value) {

  if (value === null || value === undefined) {
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
// FORMAT RUPIAH
// ============================================================

function rupiah(value) {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Rp0";
  }

  return "Rp" + number.toLocaleString("id-ID");
}


// ============================================================
// FORMAT TANGGAL
// ============================================================

function formatDate(value) {

  if (!value) {
    return "-";
  }

  try {

    let date;

    if (value?.toDate) {
      date = value.toDate();
    } else if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  } catch (error) {

    return "-";
  }
}


// ============================================================
// SORT TERBARU
// ============================================================

function sortNewest(items) {

  return items.sort((a, b) => {

    const getTime = item => {

      const value =
        item.createdAt ||
        item.updatedAt ||
        item.timestamp;

      if (!value) return 0;

      if (value?.seconds) {
        return value.seconds * 1000;
      }

      if (value?.toDate) {
        return value.toDate().getTime();
      }

      const time = new Date(value).getTime();

      return Number.isNaN(time) ? 0 : time;
    };

    return getTime(b) - getTime(a);
  });
}


// ============================================================
// LOGIN USER
// ============================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href =
      "https://ryanfendi.github.io/butuh/login.html";

    return;
  }

  console.log("USER LOGIN:", user.uid);

  // tampilkan profil Gmail secepat mungkin
  renderUserProfile(user);

  // statistik awal
  if (statNeeds) statNeeds.textContent = "0";
  if (statOffers) statOffers.textContent = "0";
  if (statRating) statRating.textContent = "0";

  // load data secara terpisah
  await Promise.allSettled([
    loadNeeds(user),
    loadOffers(user)
  ]);

});


// ============================================================
// PROFIL GMAIL
// ============================================================

function renderUserProfile(user) {

  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna BUTUH";

  const email =
    user.email ||
    "";

  const photo =
    user.photoURL ||
    createAvatar(name);

  if (profileName) {
    profileName.textContent = name;
  }

  if (profileEmail) {
    profileEmail.textContent = email;
  }

  if (profilePhoto) {

    profilePhoto.src = photo;

    profilePhoto.onerror = () => {
      profilePhoto.src = createAvatar(name);
    };

  }

}


// ============================================================
// AVATAR FALLBACK
// ============================================================

function createAvatar(name) {

  const letter =
    encodeURIComponent(
      (name || "U").charAt(0).toUpperCase()
    );

  return `https://ui-avatars.com/api/?name=${letter}&background=2563eb&color=ffffff&size=200`;
}


// ============================================================
// LOAD KEBUTUHAN
// ============================================================

async function loadNeeds(user) {

  if (loadingNeeds) {
    loadingNeeds.style.display = "block";
  }

  if (needsList) {
    needsList.innerHTML = "";
  }

  try {

    /*
      PENTING:

      Hanya where(ownerId == uid)

      Jangan gunakan:

      orderBy("createdAt")

      karena itu menyebabkan composite index.
    */

    const q = query(
      collection(db, "needs"),
      where("ownerId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    const needs = [];

    snapshot.forEach(docSnap => {

      needs.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });

    sortNewest(needs);

    console.log("KEBUTUHAN USER:", needs);

    if (statNeeds) {
      statNeeds.textContent = needs.length;
    }

    renderNeeds(needs);

  } catch (error) {

    console.error("Gagal memuat kebutuhan:", error);

    if (needsList) {

      needsList.innerHTML = `
        <div class="error-box">
          <strong>⚠️ Gagal memuat kebutuhan</strong>
          <p>${escapeHTML(error.message)}</p>
        </div>
      `;

    }

  } finally {

    if (loadingNeeds) {
      loadingNeeds.style.display = "none";
    }

  }
}


// ============================================================
// RENDER KEBUTUHAN
// ============================================================

function renderNeeds(needs) {

  if (!needsList) {
    return;
  }

  if (!needs.length) {

    needsList.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon">📋</div>
        <strong>Belum ada kebutuhan</strong>
        <p>Anda belum pernah memposting kebutuhan.</p>

        <a
          class="btn-primary"
          href="https://ryanfendi.github.io/butuh/index.html"
        >
          + Tambah Kebutuhan
        </a>
      </div>
    `;

    return;
  }

  needsList.innerHTML = needs.map(need => {

    const title =
      need.title ||
      need.judul ||
      need.name ||
      "Kebutuhan tanpa judul";

    const description =
      need.description ||
      need.deskripsi ||
      "";

    const budget =
      need.budget ??
      need.price ??
      need.harga ??
      0;

    const status =
      need.status ||
      "active";

    return `
      <article class="history-card">

        <div class="history-card-top">

          <div>

            <h3>
              ${escapeHTML(title)}
            </h3>

            <span class="date">
              ${formatDate(need.createdAt)}
            </span>

          </div>

          <span class="status ${escapeHTML(status)}">
            ${escapeHTML(status)}
          </span>

        </div>

        ${
          description
            ? `<p>${escapeHTML(description)}</p>`
            : ""
        }

        <div class="history-card-bottom">

          <strong>
            ${rupiah(budget)}
          </strong>

          <a
            href="index.html"
            class="detail-link"
          >
            Lihat →
          </a>

        </div>

      </article>
    `;

  }).join("");

}


// ============================================================
// LOAD PENAWARAN
// ============================================================

async function loadOffers(user) {

  if (loadingOffers) {
    loadingOffers.style.display = "block";
  }

  if (offersList) {
    offersList.innerHTML = "";
  }

  try {

    /*
      Jangan orderBy di sini.
      Hanya filter providerId.

      Setelah data diterima,
      sorting dilakukan dengan JavaScript.
    */

    const q = query(
      collection(db, "offers"),
      where("providerId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    const offers = [];

    snapshot.forEach(docSnap => {

      offers.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });

    sortNewest(offers);

    console.log("PENAWARAN USER:", offers);

    if (statOffers) {
      statOffers.textContent = offers.length;
    }

    renderOffers(offers);

  } catch (error) {

    console.error("Gagal memuat penawaran:", error);

    if (offersList) {

      offersList.innerHTML = `
        <div class="error-box">
          <strong>⚠️ Gagal memuat penawaran</strong>
          <p>${escapeHTML(error.message)}</p>
        </div>
      `;

    }

  } finally {

    if (loadingOffers) {
      loadingOffers.style.display = "none";
    }

  }
}


// ============================================================
// RENDER PENAWARAN
// ============================================================

function renderOffers(offers) {

  if (!offersList) {
    return;
  }

  if (!offers.length) {

    offersList.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon">💼</div>

        <strong>Belum ada penawaran</strong>

        <p>
          Anda belum pernah mengirim penawaran.
        </p>
      </div>
    `;

    return;
  }

  offersList.innerHTML = offers.map(offer => {

    const title =
      offer.needTitle ||
      offer.title ||
      offer.needName ||
      "Penawaran";

    const description =
      offer.message ||
      offer.description ||
      offer.catatan ||
      "";

    const price =
      offer.price ??
      offer.offerPrice ??
      offer.harga ??
      offer.amount ??
      0;

    const status =
      offer.status ||
      "pending";

    return `
      <article class="history-card">

        <div class="history-card-top">

          <div>

            <h3>
              ${escapeHTML(title)}
            </h3>

            <span class="date">
              ${formatDate(offer.createdAt)}
            </span>

          </div>

          <span class="status ${escapeHTML(status)}">
            ${escapeHTML(status)}
          </span>

        </div>

        ${
          description
            ? `
              <p>
                ${escapeHTML(description)}
              </p>
            `
            : ""
        }

        <div class="history-card-bottom">

          <strong>
            ${rupiah(price)}
          </strong>

        </div>

      </article>
    `;

  }).join("");

}


// ============================================================
// LOGOUT
// ============================================================

const logoutBtn =
  document.getElementById("logoutBtn");

if (logoutBtn) {

  logoutBtn.addEventListener("click", async () => {

    try {

      await auth.signOut();

      window.location.href =
        "https://ryanfendi.github.io/butuh/login.html";

    } catch (error) {

      console.error(error);

      alert(
        "Gagal logout: " +
        error.message
      );

    }

  });

}
