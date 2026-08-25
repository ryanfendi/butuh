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
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =====================================================
   FIREBASE
===================================================== */

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


const app =
  initializeApp(
    firebaseConfig
  );


const auth =
  getAuth(app);


const db =
  getFirestore(app);


/* =====================================================
   GLOBAL
===================================================== */

let currentUser = null;

const $ = id =>
  document.getElementById(id);


/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    currentUser =
      user;


    renderProfile(
      user
    );


    await loadProfile();

  }
);


/* =====================================================
   PROFILE HEADER
===================================================== */

function renderProfile(
  user
) {

  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";


  const email =
    user.email ||
    "";


  const photo =
    user.photoURL ||
    avatar(
      name
    );


  setText(
    "profileName",
    name
  );


  setText(
    "profileEmail",
    email
  );


  setImage(
    "profilePhoto",
    photo
  );

}


/* =====================================================
   LOAD PROFILE
===================================================== */

async function loadProfile() {

  try {

    showLoading();


    /*
      1. Kebutuhan milik user
    */

    const needs =
      await loadNeeds();


    /*
      2. Penawaran milik user

      Collection:
      needs/{needId}/offers/{offerId}

      collectionGroup("offers")
      memungkinkan kita mengambil
      semua subcollection offers.
    */

    const offers =
      await loadOffers();


    /*
      3. Statistik
    */

    renderStatistics(
      needs,
      offers
    );


    /*
      4. Riwayat
    */

    renderNeeds(
      needs
    );


    renderOffers(
      offers
    );


  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );


    showError(
      error
    );

  }

}


/* =====================================================
   LOAD NEEDS
===================================================== */

async function loadNeeds() {

  const result = [];


  const q =
    query(

      collection(
        db,
        "needs"
      ),

      where(
        "ownerId",
        "==",
        currentUser.uid
      )

    );


  const snapshot =
    await getDocs(
      q
    );


  snapshot.forEach(
    item => {

      result.push({

        id:
          item.id,

        ...item.data()

      });

    }
  );


  /*
    Urutkan di browser.
    Tidak membutuhkan composite index.
  */

  result.sort(
    (a, b) =>
      getTime(
        b.createdAt
      ) -
      getTime(
        a.createdAt
      )
  );


  return result;

}


/* =====================================================
   LOAD OFFERS
===================================================== */

async function loadOffers() {

  const result = [];


  /*
    PENTING:

    Database:
    needs/{needId}/offers/{offerId}

    Jadi kita memakai collectionGroup.
  */

  const q =
    query(

      collectionGroup(
        db,
        "offers"
      ),

      where(
        "providerId",
        "==",
        currentUser.uid
      )

    );


  const snapshot =
    await getDocs(
      q
    );


  snapshot.forEach(
    item => {

      const data =
        item.data();


      /*
        Ambil needId
        dari parent path.

        Path:
        needs / NEED_ID / offers / OFFER_ID
      */

      const path =
        item.ref.path.split("/");


      const needId =
        path[1];


      result.push({

        id:
          item.id,

        needId,

        ...data

      });

    }
  );


  /*
    Urutkan lokal.
  */

  result.sort(
    (a, b) =>
      getTime(
        b.createdAt
      ) -
      getTime(
        a.createdAt
      )
  );


  /*
    Ambil judul kebutuhan
    untuk setiap penawaran.
  */

  await Promise.all(

    result.map(
      async offer => {

        try {

          const needQuery =
            query(
              collection(
                db,
                "needs"
              ),
              where(
                "__name__",
                "==",
                offer.needId
              )
            );


          const needSnapshot =
            await getDocs(
              needQuery
            );


          if (
            !needSnapshot.empty
          ) {

            const need =
              needSnapshot.docs[0].data();


            offer.needTitle =
              need.title ||
              "Kebutuhan";

          } else {

            offer.needTitle =
              "Kebutuhan";

          }

        } catch {

          offer.needTitle =
            "Kebutuhan";

        }

      }
    )

  );


  return result;

}


/* =====================================================
   STATISTICS
===================================================== */

function renderStatistics(
  needs,
  offers
) {

  const accepted =
    offers.filter(
      offer => {

        const status =
          String(
            offer.status ||
            ""
          ).toLowerCase();


        return (
          status === "accepted" ||
          status === "diterima"
        );

      }
    ).length;


  const completed =
    offers.filter(
      offer => {

        const status =
          String(
            offer.status ||
            ""
          ).toLowerCase();


        return (
          status === "completed" ||
          status === "selesai"
        );

      }
    ).length;


  setText(
    "totalNeeds",
    needs.length
  );


  setText(
    "totalOffers",
    offers.length
  );


  setText(
    "acceptedOffers",
    accepted
  );


  setText(
    "completedOffers",
    completed
  );


  /*
    Rating.

    Jika belum ada field rating
    pada database, tampilkan
    "Belum ada rating".
  */

  const ratings = [];


  needs.forEach(
    item => {

      if (
        typeof item.rating ===
        "number"
      ) {

        ratings.push(
          item.rating
        );

      }

    }
  );


  offers.forEach(
    item => {

      if (
        typeof item.rating ===
        "number"
      ) {

        ratings.push(
          item.rating
        );

      }

    }
  );


  if (
    ratings.length === 0
  ) {

    setText(
      "ratingValue",
      "Belum ada rating"
    );

    setText(
      "ratingStars",
      "☆☆☆☆☆"
    );

    return;

  }


  const average =
    ratings.reduce(
      (a, b) =>
        a + b,
      0
    ) /
    ratings.length;


  setText(
    "ratingValue",
    average.toFixed(1) +
    " / 5"
  );


  const rounded =
    Math.round(
      average
    );


  setText(
    "ratingStars",

    "★".repeat(
      rounded
    ) +

    "☆".repeat(
      5 - rounded
    )

  );

}


/* =====================================================
   RENDER NEEDS
===================================================== */

function renderNeeds(
  needs
) {

  const container =
    $("needsList");


  if (!container) {
    return;
  }


  if (
    needs.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📋
        </div>

        <h3>
          Belum ada kebutuhan
        </h3>

        <p>
          Anda belum pernah memposting kebutuhan.
        </p>

        <a
          href="index.html"
          class="btn btn-primary"
        >
          + Tambah Kebutuhan
        </a>

      </div>

    `;

    return;

  }


  container.innerHTML =
    needs.map(
      need => `

        <div class="history-card">

          <div class="history-main">

            <h3>
              ${escapeHTML(
                need.title ||
                "Tanpa judul"
              )}
            </h3>

            <p>
              ${escapeHTML(
                truncate(
                  need.description ||
                  "",
                  180
                )
              )}
            </p>

            <div class="history-meta">

              <span>
                💰 Rp ${formatMoney(
                  need.budget
                )}
              </span>

              <span>
                📅 ${formatDate(
                  need.createdAt
                )}
              </span>

            </div>

          </div>


          <div
            class="status
              ${statusClass(
                need.status
              )}"
          >
            ${statusLabel(
              need.status
            )}
          </div>

        </div>

      `
    ).join("");

}


/* =====================================================
   RENDER OFFERS
===================================================== */

function renderOffers(
  offers
) {

  const container =
    $("offersList");


  if (!container) {
    return;
  }


  if (
    offers.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          💬
        </div>

        <h3>
          Belum ada penawaran
        </h3>

        <p>
          Anda belum pernah mengirim penawaran.
        </p>

        <a
          href="index.html#needs"
          class="btn btn-primary"
        >
          🔎 Cari Kebutuhan
        </a>

      </div>

    `;

    return;

  }


  container.innerHTML =
    offers.map(
      offer => `

        <div class="history-card">

          <div class="history-main">

            <h3>
              ${escapeHTML(
                offer.needTitle ||
                "Kebutuhan"
              )}
            </h3>


            <div class="offer-price">
              💰 Rp ${formatMoney(
                offer.price
              )}
            </div>


            <p>
              ${escapeHTML(
                offer.message ||
                ""
              )}
            </p>


            <div class="history-meta">

              <span>
                ⏱️ ${escapeHTML(
                  offer.duration ||
                  "-"
                )}
              </span>

              <span>
                📅 ${formatDate(
                  offer.createdAt
                )}
              </span>

            </div>

          </div>


          <div
            class="status
              ${statusClass(
                offer.status
              )}"
          >
            ${statusLabel(
              offer.status
            )}
          </div>

        </div>

      `
    ).join("");

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

  if ($("needsList")) {

    $("needsList").innerHTML = `

      <div class="loading-state">

        <div class="spinner"></div>

        Memuat kebutuhan...

      </div>

    `;

  }


  if ($("offersList")) {

    $("offersList").innerHTML = `

      <div class="loading-state">

        <div class="spinner"></div>

        Memuat penawaran...

      </div>

    `;

  }

}


/* =====================================================
   ERROR
===================================================== */

function showError(
  error
) {

  const message =
    error?.message ||
    "Terjadi kesalahan.";


  const html = `

    <div class="error-state">

      <div class="error-icon">
        ⚠️
      </div>

      <h3>
        Gagal memuat data
      </h3>

      <p>
        ${escapeHTML(
          message
        )}
      </p>

      <button
        class="btn btn-primary"
        onclick="location.reload()"
      >
        Coba Lagi
      </button>

    </div>

  `;


  if ($("needsList")) {

    $("needsList").innerHTML =
      html;

  }


  if ($("offersList")) {

    $("offersList").innerHTML =
      html;

  }

}


/* =====================================================
   HELPERS
===================================================== */

function setText(
  id,
  value
) {

  const el =
    $(id);

  if (el) {

    el.textContent =
      value;

  }

}


function setImage(
  id,
  value
) {

  const el =
    $(id);

  if (el) {

    el.src =
      value;

  }

}


function getTime(
  value
) {

  if (!value) {
    return 0;
  }


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
    value.seconds
  ) {

    return (
      value.seconds *
      1000
    );

  }


  const date =
    new Date(
      value
    );


  return isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();

}


function formatDate(
  value
) {

  const time =
    getTime(
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
      year: "numeric"
    }
  ).format(
    new Date(time)
  );

}


function formatMoney(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return "0";

  }


  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    number
  );

}


function statusLabel(
  status
) {

  const value =
    String(
      status ||
      "pending"
    ).toLowerCase();


  const labels = {

    open:
      "Aktif",

    active:
      "Aktif",

    aktif:
      "Aktif",

    pending:
      "Menunggu",

    accepted:
      "Diterima",

    diterima:
      "Diterima",

    rejected:
      "Ditolak",

    ditolak:
      "Ditolak",

    completed:
      "Selesai",

    selesai:
      "Selesai",

    cancelled:
      "Dibatalkan",

    dibatalkan:
      "Dibatalkan"

  };


  return (
    labels[value] ||
    escapeHTML(
      status ||
      "Menunggu"
    )
  );

}


function statusClass(
  status
) {

  const value =
    String(
      status ||
      "pending"
    ).toLowerCase();


  if (
    value === "accepted" ||
    value === "diterima"
  ) {

    return "status-success";

  }


  if (
    value === "completed" ||
    value === "selesai"
  ) {

    return "status-completed";

  }


  if (
    value === "rejected" ||
    value === "ditolak" ||
    value === "cancelled" ||
    value === "dibatalkan"
  ) {

    return "status-danger";

  }


  return "status-pending";

}


function truncate(
  text,
  length
) {

  const value =
    String(
      text ||
      ""
    );


  return value.length >
    length

    ? value.substring(
        0,
        length
      ) + "..."

    : value;

}


function escapeHTML(
  value
) {

  return String(
    value ??
    ""
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


function avatar(
  name
) {

  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(
      String(
        name ||
        "U"
      ).charAt(0)
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}
