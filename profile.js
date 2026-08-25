// ============================================================
// BUTUH - PROFILE.JS
// FINAL VERSION
// ============================================================


// ============================================================
// FIREBASE IMPORT
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",

  authDomain:
    "butuhin.firebaseapp.com",

  projectId:
    "butuhin",

  storageBucket:
    "butuhin.firebasestorage.app",

  messagingSenderId:
    "331896660506",

  appId:
    "1:331896660506:web:7a03f433101b81dd74e7a3"

};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ============================================================
// HTML ELEMENTS
// ============================================================

const profilePhoto =
  document.getElementById("profilePhoto");

const profileName =
  document.getElementById("profileName");

const profileEmail =
  document.getElementById("profileEmail");

const ratingStars =
  document.getElementById("ratingStars");

const ratingValue =
  document.getElementById("ratingValue");

const totalNeeds =
  document.getElementById("totalNeeds");

const totalOffers =
  document.getElementById("totalOffers");

const acceptedOffers =
  document.getElementById("acceptedOffers");

const completedOffers =
  document.getElementById("completedOffers");

const needsList =
  document.getElementById("needsList");

const offersList =
  document.getElementById("offersList");


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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ============================================================
// FORMAT RUPIAH
// ============================================================

function formatRupiah(value) {

  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "Rp0";
  }

  return "Rp" +
    number.toLocaleString("id-ID");

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

  if (!value) {
    return "-";
  }

  try {

    let date;


    if (
      typeof value.toDate === "function"
    ) {

      date = value.toDate();

    } else if (
      typeof value.seconds === "number"
    ) {

      date = new Date(
        value.seconds * 1000
      );

    } else {

      date = new Date(value);

    }


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }


    return date.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );

  } catch (error) {

    return "-";

  }

}


// ============================================================
// GET TIMESTAMP
// ============================================================

function getTimestamp(value) {

  if (!value) {
    return 0;
  }

  try {

    if (
      typeof value.toDate === "function"
    ) {

      return value
        .toDate()
        .getTime();

    }


    if (
      typeof value.seconds === "number"
    ) {

      return value.seconds * 1000;

    }


    const timestamp =
      new Date(value).getTime();


    if (
      Number.isNaN(timestamp)
    ) {
      return 0;
    }


    return timestamp;

  } catch (error) {

    return 0;

  }

}


// ============================================================
// SORT TERBARU
// ============================================================

function sortNewest(items) {

  return items.sort(
    (a, b) => {

      const timeA =
        getTimestamp(
          a.createdAt ||
          a.updatedAt ||
          a.timestamp
        );


      const timeB =
        getTimestamp(
          b.createdAt ||
          b.updatedAt ||
          b.timestamp
        );


      return timeB - timeA;

    }
  );

}


// ============================================================
// BUAT AVATAR CADANGAN
// ============================================================

function createAvatar(name) {

  const text =
    name ||
    "BUTUH";


  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(text) +
    "&size=200" +
    "&background=2563eb" +
    "&color=ffffff"
  );

}


// ============================================================
// STATUS CSS
// ============================================================

function getStatusClass(status) {

  const value =
    String(
      status || ""
    ).toLowerCase();


  if (
    value === "accepted" ||
    value === "diterima"
  ) {
    return "status-success";
  }


  if (
    value === "completed" ||
    value === "selesai" ||
    value === "done"
  ) {
    return "status-completed";
  }


  if (
    value === "cancelled" ||
    value === "canceled" ||
    value === "dibatalkan" ||
    value === "rejected" ||
    value === "ditolak"
  ) {
    return "status-danger";
  }


  return "status-pending";

}


// ============================================================
// FORMAT STATUS
// ============================================================

function formatStatus(status) {

  const value =
    String(
      status || "pending"
    ).toLowerCase();


  const statusMap = {

    active:
      "Aktif",

    open:
      "Aktif",

    pending:
      "Menunggu",

    accepted:
      "Diterima",

    diterima:
      "Diterima",

    completed:
      "Selesai",

    selesai:
      "Selesai",

    done:
      "Selesai",

    cancelled:
      "Dibatalkan",

    canceled:
      "Dibatalkan",

    dibatalkan:
      "Dibatalkan",

    rejected:
      "Ditolak",

    ditolak:
      "Ditolak"

  };


  return statusMap[value] || status;

}


// ============================================================
// LOADING NEEDS
// ============================================================

function showNeedsLoading() {

  if (!needsList) {
    return;
  }


  needsList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Memuat kebutuhan...</p>
    </div>
  `;

}


// ============================================================
// LOADING OFFERS
// ============================================================

function showOffersLoading() {

  if (!offersList) {
    return;
  }


  offersList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Memuat penawaran...</p>
    </div>
  `;

}


// ============================================================
// ERROR NEEDS
// ============================================================

function showNeedsError(message) {

  if (!needsList) {
    return;
  }


  needsList.innerHTML = `
    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

      <strong>
        Gagal memuat kebutuhan
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;

}


// ============================================================
// ERROR OFFERS
// ============================================================

function showOffersError(message) {

  if (!offersList) {
    return;
  }


  offersList.innerHTML = `
    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

      <strong>
        Gagal memuat penawaran
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;

}


// ============================================================
// EMPTY NEEDS
// ============================================================

function showEmptyNeeds() {

  if (!needsList) {
    return;
  }


  needsList.innerHTML = `
    <div class="empty-state">

      <div class="empty-icon">
        📋
      </div>

      <strong>
        Belum ada kebutuhan
      </strong>

      <p>
        Anda belum pernah memposting kebutuhan.
      </p>

    </div>
  `;

}


// ============================================================
// EMPTY OFFERS
// ============================================================

function showEmptyOffers() {

  if (!offersList) {
    return;
  }


  offersList.innerHTML = `
    <div class="empty-state">

      <div class="empty-icon">
        💰
      </div>

      <strong>
        Belum ada penawaran
      </strong>

      <p>
        Anda belum pernah mengirim penawaran.
      </p>

    </div>
  `;

}


// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds(needs) {

  if (!needsList) {
    return;
  }


  if (!needs.length) {

    showEmptyNeeds();

    return;

  }


  needsList.innerHTML =
    needs.map(
      (need) => {

        const title =
          need.title ||
          need.judul ||
          need.name ||
          "Kebutuhan";


        const description =
          need.description ||
          need.deskripsi ||
          need.details ||
          "";


        const budget =
          need.budget ??
          need.price ??
          need.harga ??
          need.amount ??
          0;


        const status =
          need.status ||
          "active";


        return `
          <article class="history-card">

            <div class="history-main">

              <h3>
                ${escapeHTML(title)}
              </h3>


              ${
                description
                  ? `
                    <p>
                      ${escapeHTML(description)}
                    </p>
                  `
                  : ""
              }


              <div class="history-meta">

                <span>
                  📅
                  ${formatDate(
                    need.createdAt
                  )}
                </span>

                <span>
                  💰
                  ${formatRupiah(
                    budget
                  )}
                </span>

              </div>

            </div>


            <span class="status ${getStatusClass(status)}">

              ${escapeHTML(
                formatStatus(status)
              )}

            </span>

          </article>
        `;

      }
    ).join("");

}


// ============================================================
// RENDER OFFERS
// ============================================================

function renderOffers(offers) {

  if (!offersList) {
    return;
  }


  if (!offers.length) {

    showEmptyOffers();

    return;

  }


  offersList.innerHTML =
    offers.map(
      (offer) => {

        const title =
          offer.needTitle ||
          offer.title ||
          offer.needName ||
          "Penawaran";


        const message =
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

            <div class="history-main">

              <h3>
                ${escapeHTML(title)}
              </h3>


              ${
                message
                  ? `
                    <p>
                      ${escapeHTML(message)}
                    </p>
                  `
                  : ""
              }


              <div class="history-meta">

                <span>
                  📅
                  ${formatDate(
                    offer.createdAt
                  )}
                </span>

              </div>

            </div>


            <div class="offer-side">

              <div class="offer-price">

                ${formatRupiah(price)}

              </div>


              <span class="status ${getStatusClass(status)}">

                ${escapeHTML(
                  formatStatus(status)
                )}

              </span>

            </div>

          </article>
        `;

      }
    ).join("");

}


// ============================================================
// LOAD NEEDS
// ============================================================

async function loadNeeds(user) {

  showNeedsLoading();


  try {

    const needsQuery = query(

      collection(
        db,
        "needs"
      ),

      where(
        "ownerId",
        "==",
        user.uid
      )

    );


    const snapshot =
      await getDocs(needsQuery);


    const needs = [];


    snapshot.forEach(
      (docSnap) => {

        needs.push({

          id:
            docSnap.id,

          ...docSnap.data()

        });

      }
    );


    sortNewest(needs);


    if (totalNeeds) {

      totalNeeds.textContent =
        String(needs.length);

    }


    renderNeeds(needs);


    console.log(
      "Kebutuhan berhasil dimuat:",
      needs.length
    );


  } catch (error) {

    console.error(
      "ERROR NEEDS:",
      error
    );


    if (totalNeeds) {

      totalNeeds.textContent = "0";

    }


    showNeedsError(
      error.message ||
      "Terjadi kesalahan saat memuat kebutuhan."
    );

  }

}


// ============================================================
// LOAD OFFERS
// ============================================================

async function loadOffers(user) {

  showOffersLoading();


  try {

    console.log(
      "Memulai Collection Group offers..."
    );


    const offersQuery = query(

      collectionGroup(
        db,
        "offers"
      ),

      where(
        "providerId",
        "==",
        user.uid
      )

    );


    const snapshot =
      await getDocs(
        offersQuery
      );


    const offers = [];


    snapshot.forEach(
      (docSnap) => {

        const parentNeed =
          docSnap.ref.parent.parent;


        offers.push({

          id:
            docSnap.id,

          needId:
            parentNeed
              ? parentNeed.id
              : "",

          ...docSnap.data()

        });

      }
    );


    sortNewest(offers);


    // ========================================================
    // UPDATE STATISTIK
    // ========================================================

    if (totalOffers) {

      totalOffers.textContent =
        String(offers.length);

    }


    let accepted = 0;

    let completed = 0;


    offers.forEach(
      (offer) => {

        const status =
          String(
            offer.status || ""
          ).toLowerCase();


        if (
          status === "accepted" ||
          status === "diterima"
        ) {

          accepted++;

        }


        if (
          status === "completed" ||
          status === "selesai" ||
          status === "done"
        ) {

          completed++;

        }

      }
    );


    if (acceptedOffers) {

      acceptedOffers.textContent =
        String(accepted);

    }


    if (completedOffers) {

      completedOffers.textContent =
        String(completed);

    }


    renderOffers(offers);


    console.log(
      "Penawaran berhasil dimuat:",
      offers.length
    );


  } catch (error) {

    console.error(
      "ERROR OFFERS:",
      error
    );


    if (totalOffers) {

      totalOffers.textContent = "0";

    }


    if (acceptedOffers) {

      acceptedOffers.textContent = "0";

    }


    if (completedOffers) {

      completedOffers.textContent = "0";

    }


    const errorMessage =
      error.message ||
      "Terjadi kesalahan saat memuat penawaran.";


    // ========================================================
    // KHUSUS ERROR INDEX
    // ========================================================

    if (
      errorMessage.includes(
        "index"
      ) ||
      errorMessage.includes(
        "INDEX"
      ) ||
      errorMessage.includes(
        "FAILED_PRECONDITION"
      )
    ) {

      if (offersList) {

        offersList.innerHTML = `
          <div class="error-state">

            <div class="error-icon">
              ⚠️
            </div>

            <strong>
              Index Firestore belum aktif
            </strong>

            <p>
              Riwayat penawaran membutuhkan
              Collection Group Index untuk "offers"
              berdasarkan providerId.
            </p>

            <p>
              Buka link Create Index yang muncul
              di Firebase Console, buat index,
              lalu tunggu status menjadi Enabled.
            </p>

          </div>
        `;

      }

      return;

    }


    showOffersError(
      errorMessage
    );

  }

}


// ============================================================
// LOAD RATING
// ============================================================

async function loadRating(user) {

  try {

    const ratingQuery = query(

      collection(
        db,
        "ratings"
      ),

      where(
        "ratedUserId",
        "==",
        user.uid
      )

    );


    const snapshot =
      await getDocs(
        ratingQuery
      );


    let total = 0;

    let count = 0;


    snapshot.forEach(
      (docSnap) => {

        const data =
          docSnap.data();


        const rating =
          Number(
            data.rating ??
            data.stars ??
            data.score ??
            0
          );


        if (
          rating > 0
        ) {

          total += rating;

          count++;

        }

      }
    );


    if (count === 0) {

      if (ratingStars) {

        ratingStars.textContent =
          "☆☆☆☆☆";

      }


      if (ratingValue) {

        ratingValue.textContent =
          "Belum ada rating";

      }


      return;

    }


    const average =
      total / count;


    const rounded =
      Math.min(
        5,
        Math.max(
          0,
          Math.round(average)
        )
      );


    if (ratingStars) {

      ratingStars.textContent =

        "★".repeat(rounded) +

        "☆".repeat(
          5 - rounded
        );

    }


    if (ratingValue) {

      ratingValue.textContent =

        average.toFixed(1) +

        " / 5 (" +

        count +

        " rating)";

    }


  } catch (error) {

    console.error(
      "ERROR RATING:",
      error
    );


    if (ratingStars) {

      ratingStars.textContent =
        "☆☆☆☆☆";

    }


    if (ratingValue) {

      ratingValue.textContent =
        "Belum ada rating";

    }

  }

}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
  auth,

  async (user) => {

    try {

      // ======================================================
      // BELUM LOGIN
      // ======================================================

      if (!user) {

        window.location.href =
          "login.html";

        return;

      }


      // ======================================================
      // PROFIL GOOGLE
      // ======================================================

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

        profileName.textContent =
          name;

      }


      if (profileEmail) {

        profileEmail.textContent =
          email;

      }


      if (profilePhoto) {

        profilePhoto.src =
          photo;


        profilePhoto.alt =
          name;


        profilePhoto.onerror =
          function () {

            profilePhoto.onerror =
              null;

            profilePhoto.src =
              createAvatar(name);

          };

      }


      // ======================================================
      // NILAI AWAL STATISTIK
      // ======================================================

      if (totalNeeds) {

        totalNeeds.textContent = "0";

      }


      if (totalOffers) {

        totalOffers.textContent = "0";

      }


      if (acceptedOffers) {

        acceptedOffers.textContent = "0";

      }


      if (completedOffers) {

        completedOffers.textContent = "0";

      }


      // ======================================================
      // LOAD SEMUA DATA
      // Setiap proses independen agar satu error
      // tidak membuat semuanya berhenti
      // ======================================================

      loadNeeds(user);

      loadOffers(user);

      loadRating(user);


    } catch (error) {

      console.error(
        "PROFILE ERROR:",
        error
      );


      if (profileName) {

        profileName.textContent =
          "Gagal memuat profil";

      }


      if (profileEmail) {

        profileEmail.textContent =
          error.message ||
          "Terjadi kesalahan.";

      }


      showNeedsError(
        error.message
      );

      showOffersError(
        error.message
      );

    }

  }
);


// ============================================================
// END PROFILE.JS
// ============================================================
