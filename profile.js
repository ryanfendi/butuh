// ============================================================
// BUTUH - PROFILE.JS
// VERSI ANTI LOADING TERUS
// ============================================================

const profilePhoto = document.getElementById("profilePhoto");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");

const ratingStars = document.getElementById("ratingStars");
const ratingValue = document.getElementById("ratingValue");

const totalNeeds = document.getElementById("totalNeeds");
const totalOffers = document.getElementById("totalOffers");
const acceptedOffers = document.getElementById("acceptedOffers");
const completedOffers = document.getElementById("completedOffers");

const needsList = document.getElementById("needsList");
const offersList = document.getElementById("offersList");


// ============================================================
// HELPER
// ============================================================

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatRupiah(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "Rp0";

  return "Rp" + number.toLocaleString("id-ID");
}


function formatDate(value) {
  if (!value) return "-";

  try {
    let date;

    if (typeof value.toDate === "function") {
      date = value.toDate();
    } else if (typeof value.seconds === "number") {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  } catch (error) {
    return "-";
  }
}


function getTime(value) {
  if (!value) return 0;

  try {
    if (typeof value.toDate === "function") {
      return value.toDate().getTime();
    }

    if (typeof value.seconds === "number") {
      return value.seconds * 1000;
    }

    const time = new Date(value).getTime();

    return Number.isNaN(time) ? 0 : time;

  } catch (error) {
    return 0;
  }
}


function sortNewest(data) {
  return data.sort((a, b) => {
    const timeA = getTime(
      a.createdAt || a.updatedAt || a.timestamp
    );

    const timeB = getTime(
      b.createdAt || b.updatedAt || b.timestamp
    );

    return timeB - timeA;
  });
}


function createAvatar(name) {
  const initial = (name || "B")
    .trim()
    .charAt(0)
    .toUpperCase();

  return "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(initial) +
    "&size=200&background=2563eb&color=ffffff";
}


// ============================================================
// ERROR TAMPILKAN DI HALAMAN
// ============================================================

function showNeedsError(message) {
  if (!needsList) return;

  needsList.innerHTML = `
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <strong>Gagal memuat kebutuhan</strong>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}


function showOffersError(message) {
  if (!offersList) return;

  offersList.innerHTML = `
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <strong>Gagal memuat penawaran</strong>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}


// ============================================================
// DEFAULT JIKA FIREBASE LAMBAT / ERROR
// ============================================================

let appStarted = false;

const loadingTimeout = setTimeout(() => {

  if (appStarted) return;

  if (profileName) {
    profileName.textContent = "Gagal memuat profil";
  }

  if (profileEmail) {
    profileEmail.textContent =
      "Firebase belum merespons. Periksa firebase.js.";
  }

  showNeedsError(
    "Profile.js tidak berhasil terhubung ke Firebase."
  );

  showOffersError(
    "Profile.js tidak berhasil terhubung ke Firebase."
  );

}, 10000);


// ============================================================
// JALANKAN APLIKASI
// ============================================================

async function startProfile() {

  try {

    console.log("1. Memulai profile.js...");


    // ========================================================
    // IMPORT FIREBASE.JS
    // ========================================================

    const firebaseModule =
      await import("./firebase.js");


    const auth = firebaseModule.auth;
    const db = firebaseModule.db;


    if (!auth) {
      throw new Error(
        "firebase.js tidak mengekspor auth."
      );
    }

    if (!db) {
      throw new Error(
        "firebase.js tidak mengekspor db."
      );
    }


    console.log("2. firebase.js berhasil dimuat");


    // ========================================================
    // IMPORT AUTH
    // ========================================================

    const authModule =
      await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
      );


    // ========================================================
    // IMPORT FIRESTORE
    // ========================================================

    const firestoreModule =
      await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );


    const onAuthStateChanged =
      authModule.onAuthStateChanged;

    const collection =
      firestoreModule.collection;

    const collectionGroup =
      firestoreModule.collectionGroup;

    const getDocs =
      firestoreModule.getDocs;

    const query =
      firestoreModule.query;

    const where =
      firestoreModule.where;


    console.log("3. Firebase modules berhasil dimuat");


    // ========================================================
    // CEK LOGIN
    // ========================================================

    onAuthStateChanged(
      auth,
      async (user) => {

        appStarted = true;

        clearTimeout(loadingTimeout);


        console.log(
          "4. Auth selesai:",
          user ? user.uid : "Belum login"
        );


        // ====================================================
        // BELUM LOGIN
        // ====================================================

        if (!user) {

          window.location.href =
            "login.html";

          return;

        }


        // ====================================================
        // PROFIL
        // ====================================================

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

          profilePhoto.alt = name;

          profilePhoto.onerror = function () {
            profilePhoto.onerror = null;
            profilePhoto.src =
              createAvatar(name);
          };

        }


        console.log(
          "5. Profil Gmail berhasil ditampilkan"
        );


        // ====================================================
        // LOAD SEMUA DATA
        // ====================================================

        await Promise.all([
          loadNeeds(
            user,
            db,
            collection,
            query,
            where,
            getDocs
          ),

          loadOffers(
            user,
            db,
            collectionGroup,
            query,
            where,
            getDocs
          ),

          loadRating(
            user,
            db,
            collection,
            query,
            where,
            getDocs
          )
        ]);

      }
    );

  } catch (error) {

    clearTimeout(loadingTimeout);

    appStarted = true;

    console.error(
      "PROFILE START ERROR:",
      error
    );


    if (profileName) {
      profileName.textContent =
        "Gagal memuat profil";
    }


    if (profileEmail) {
      profileEmail.textContent =
        error.message;
    }


    if (profilePhoto) {
      profilePhoto.src =
        createAvatar("BUTUH");
    }


    showNeedsError(error.message);

    showOffersError(error.message);

  }

}


// ============================================================
// LOAD NEEDS
// ============================================================

async function loadNeeds(
  user,
  db,
  collection,
  query,
  where,
  getDocs
) {

  try {

    console.log(
      "Memuat kebutuhan..."
    );


    const needsQuery =
      query(
        collection(db, "needs"),
        where(
          "ownerId",
          "==",
          user.uid
        )
      );


    const snapshot =
      await getDocs(needsQuery);


    const needs = [];


    snapshot.forEach((docSnap) => {

      needs.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });


    sortNewest(needs);


    console.log(
      "Kebutuhan ditemukan:",
      needs.length
    );


    if (totalNeeds) {
      totalNeeds.textContent =
        needs.length;
    }


    renderNeeds(needs);

  } catch (error) {

    console.error(
      "NEEDS ERROR:",
      error
    );

    showNeedsError(error.message);

  }

}


// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds(needs) {

  if (!needsList) return;


  if (needs.length === 0) {

    needsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <strong>Belum ada kebutuhan</strong>
        <p>
          Anda belum pernah memposting kebutuhan.
        </p>
      </div>
    `;

    return;

  }


  needsList.innerHTML =
    needs.map((need) => {

      const title =
        need.title ||
        need.judul ||
        "Kebutuhan";

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
        <div class="history-card">

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
                📅 ${formatDate(need.createdAt)}
              </span>

              <span>
                💰 ${formatRupiah(budget)}
              </span>

            </div>

          </div>

          <span class="status status-pending">
            ${escapeHTML(status)}
          </span>

        </div>
      `;

    }).join("");

}


// ============================================================
// LOAD OFFERS
// ============================================================

async function loadOffers(
  user,
  db,
  collectionGroup,
  query,
  where,
  getDocs
) {

  try {

    console.log(
      "Memuat penawaran..."
    );


    // offers berada di:
    // needs/{needId}/offers/{offerId}

    const offersQuery =
      query(
        collectionGroup(db, "offers"),
        where(
          "providerId",
          "==",
          user.uid
        )
      );


    const snapshot =
      await getDocs(offersQuery);


    const offers = [];


    snapshot.forEach((docSnap) => {

      const parentNeed =
        docSnap.ref.parent.parent;


      offers.push({

        id: docSnap.id,

        needId:
          parentNeed
            ? parentNeed.id
            : "",

        ...docSnap.data()

      });

    });


    sortNewest(offers);


    console.log(
      "Penawaran ditemukan:",
      offers.length
    );


    if (totalOffers) {
      totalOffers.textContent =
        offers.length;
    }


    let accepted = 0;
    let completed = 0;


    offers.forEach((offer) => {

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

    });


    if (acceptedOffers) {
      acceptedOffers.textContent =
        accepted;
    }


    if (completedOffers) {
      completedOffers.textContent =
        completed;
    }


    renderOffers(offers);

  } catch (error) {

    console.error(
      "OFFERS ERROR:",
      error
    );


    // Jika membutuhkan index,
    // error akan tampil di halaman
    showOffersError(error.message);

  }

}


// ============================================================
// RENDER OFFERS
// ============================================================

function renderOffers(offers) {

  if (!offersList) return;


  if (offers.length === 0) {

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

    return;

  }


  offersList.innerHTML =
    offers.map((offer) => {

      const title =
        offer.needTitle ||
        offer.title ||
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
        <div class="history-card">

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
                📅 ${formatDate(offer.createdAt)}
              </span>

            </div>

          </div>

          <div>

            <div class="offer-price">
              ${formatRupiah(price)}
            </div>

            <span class="status status-pending">
              ${escapeHTML(status)}
            </span>

          </div>

        </div>
      `;

    }).join("");

}


// ============================================================
// LOAD RATING
// ============================================================

async function loadRating(
  user,
  db,
  collection,
  query,
  where,
  getDocs
) {

  try {

    const ratingQuery =
      query(
        collection(db, "ratings"),
        where(
          "reviewerId",
          "==",
          user.uid
        )
      );


    const snapshot =
      await getDocs(ratingQuery);


    let total = 0;
    let count = 0;


    snapshot.forEach((docSnap) => {

      const data =
        docSnap.data();

      const rating =
        Number(
          data.rating ||
          data.stars ||
          data.score ||
          0
        );


      if (rating > 0) {
        total += rating;
        count++;
      }

    });


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
      Math.round(average);


    if (ratingStars) {

      ratingStars.textContent =
        "★".repeat(rounded) +
        "☆".repeat(5 - rounded);

    }


    if (ratingValue) {

      ratingValue.textContent =
        average.toFixed(1) +
        " / 5";

    }

  } catch (error) {

    console.error(
      "RATING ERROR:",
      error
    );

  }

}


// ============================================================
// START
// ============================================================

startProfile();
