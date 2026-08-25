// ============================================================
// BUTUH - PROFILE.JS FINAL
// TIDAK MEMBUTUHKAN firebase.js
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

const app =
  initializeApp(firebaseConfig);


const auth =
  getAuth(app);


const db =
  getFirestore(app);


// ============================================================
// ELEMENTS
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

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
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

      date =
        value.toDate();

    } else if (
      typeof value.seconds === "number"
    ) {

      date =
        new Date(
          value.seconds * 1000
        );

    } else {

      date =
        new Date(value);

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


    const time =
      new Date(value).getTime();


    return Number.isNaN(time)
      ? 0
      : time;

  } catch (error) {

    return 0;

  }

}


// ============================================================
// SORT DATA
// ============================================================

function sortNewest(items) {

  return items.sort(
    (a, b) => {

      const timeA =
        getTimestamp(
          a.createdAt ||
          a.updatedAt
        );


      const timeB =
        getTimestamp(
          b.createdAt ||
          b.updatedAt
        );


      return timeB - timeA;

    }
  );

}


// ============================================================
// CREATE AVATAR
// ============================================================

function createAvatar(name) {

  const letter =
    (name || "B")
      .trim()
      .charAt(0)
      .toUpperCase();


  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(letter) +
    "&size=200" +
    "&background=2563eb" +
    "&color=ffffff"
  );

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
// AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,

  async (user) => {

    console.log(
      "AUTH:",
      user
    );


    // ========================================================
    // BELUM LOGIN
    // ========================================================

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    // ========================================================
    // PROFIL
    // ========================================================

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


    // Nama
    if (profileName) {

      profileName.textContent =
        name;

    }


    // Email
    if (profileEmail) {

      profileEmail.textContent =
        email;

    }


    // Foto
    if (profilePhoto) {

      profilePhoto.src =
        photo;


      profilePhoto.onerror =
        function () {

          profilePhoto.onerror =
            null;


          profilePhoto.src =
            createAvatar(name);

        };

    }


    console.log(
      "Profil berhasil dimuat:",
      name
    );


    // ========================================================
    // LOAD DATA SECARA TERPISAH
    // ========================================================

    loadNeeds(user);

    loadOffers(user);

    loadRating(user);

  }
);


// ============================================================
// LOAD NEEDS
// ============================================================

async function loadNeeds(user) {

  try {

    console.log(
      "Mulai memuat kebutuhan..."
    );


    const needsQuery =
      query(

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
      await getDocs(
        needsQuery
      );


    const needs =
      [];


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


    console.log(
      "Jumlah kebutuhan:",
      needs.length
    );


    if (totalNeeds) {

      totalNeeds.textContent =
        needs.length;

    }


    renderNeeds(needs);


  } catch (error) {

    console.error(
      "ERROR NEEDS:",
      error
    );


    showNeedsError(
      error.message
    );

  }

}


// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds(needs) {

  if (!needsList) {
    return;
  }


  if (needs.length === 0) {

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

    return;

  }


  needsList.innerHTML =
    needs.map(
      (need) => {

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


            <span class="status status-pending">

              ${escapeHTML(status)}

            </span>

          </article>

        `;

      }
    ).join("");

}


// ============================================================
// LOAD OFFERS
// ============================================================

async function loadOffers(user) {

  try {

    console.log("Mulai memuat penawaran tanpa Collection Group...");


    // Ambil semua kebutuhan terlebih dahulu
    const needsQuery = query(
      collection(db, "needs"),
      where("ownerId", "==", user.uid)
    );


    const needsSnapshot =
      await getDocs(needsQuery);


    const needIds = [];


    needsSnapshot.forEach((needDoc) => {

      needIds.push(
        needDoc.id
      );

    });


    const offers = [];


    // ========================================================
    // AMBIL PENAWARAN DARI SETIAP KEBUTUHAN
    // needs/{needId}/offers/{offerId}
    // ========================================================

    for (const needId of needIds) {

      try {

        const offersSnapshot =
          await getDocs(
            collection(
              db,
              "needs",
              needId,
              "offers"
            )
          );


        offersSnapshot.forEach((offerDoc) => {

          const data =
            offerDoc.data();


          // Hanya ambil penawaran milik user login
          if (
            data.providerId === user.uid
          ) {

            offers.push({

              id:
                offerDoc.id,

              needId:
                needId,

              ...data

            });

          }

        });

      } catch (offerError) {

        console.error(
          "Gagal membaca offers dari need:",
          needId,
          offerError
        );

      }

    }


    // Urutkan terbaru
    sortNewest(offers);


    console.log(
      "Jumlah penawaran:",
      offers.length
    );


    // ========================================================
    // STATISTIK
    // ========================================================

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


    // ========================================================
    // TAMPILKAN PENAWARAN
    // ========================================================

    renderOffers(offers);


  } catch (error) {

    console.error(
      "ERROR LOAD OFFERS:",
      error
    );


    if (totalOffers) {

      totalOffers.textContent =
        "0";

    }


    if (acceptedOffers) {

      acceptedOffers.textContent =
        "0";

    }


    if (completedOffers) {

      completedOffers.textContent =
        "0";

    }


    showOffersError(
      error.message
    );

  }

}


    // ========================================================
    // STATISTIK
    // ========================================================

    if (totalOffers) {

      totalOffers.textContent =
        offers.length;

    }


    let accepted =
      0;


    let completed =
      0;


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
        accepted;

    }


    if (completedOffers) {

      completedOffers.textContent =
        completed;

    }


    renderOffers(offers);


  } catch (error) {

    console.error(
      "ERROR OFFERS:",
      error
    );


    showOffersError(
      error.message
    );

  }

}


// ============================================================
// RENDER OFFERS
// ============================================================

function renderOffers(offers) {

  if (!offersList) {
    return;
  }


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
    offers.map(
      (offer) => {

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


            <div>

              <div class="offer-price">

                ${formatRupiah(price)}

              </div>


              <span class="status status-pending">

                ${escapeHTML(status)}

              </span>

            </div>

          </article>

        `;

      }
    ).join("");

}


// ============================================================
// LOAD RATING
// ============================================================

async function loadRating(user) {

  try {

    const ratingsQuery =
      query(

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
        ratingsQuery
      );


    let total =
      0;


    let count =
      0;


    snapshot.forEach(
      (docSnap) => {

        const data =
          docSnap.data();


        const rating =
          Number(
            data.rating ||
            data.stars ||
            data.score ||
            0
          );


        if (
          rating > 0
        ) {

          total +=
            rating;

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
      Math.round(average);


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

  }

}
