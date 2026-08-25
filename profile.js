// ============================================================
// BUTUH - PROFILE.JS FINAL
// Cocok dengan profile.html yang diberikan
//
// DATABASE:
// users/{uid}
// needs/{needId}
// needs/{needId}/offers/{offerId}
// ratings/{ratingId}
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
  collectionGroup,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ============================================================
// ELEMENT HTML
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
// HELPER
// ============================================================

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

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Rp0";
  }

  return "Rp" +
    number.toLocaleString("id-ID");
}


// ============================================================
// TANGGAL
// ============================================================

function formatDate(value) {

  if (!value) {
    return "-";
  }

  try {

    let date;

    if (
      value &&
      typeof value.toDate === "function"
    ) {

      date = value.toDate();

    } else if (
      value &&
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
      !date ||
      Number.isNaN(date.getTime())
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

  } catch {

    return "-";

  }

}


// ============================================================
// WAKTU UNTUK SORTING
// ============================================================

function getTimestamp(value) {

  if (!value) {
    return 0;
  }

  try {

    if (
      value &&
      typeof value.toDate === "function"
    ) {

      return value.toDate().getTime();

    }

    if (
      value &&
      typeof value.seconds === "number"
    ) {

      return value.seconds * 1000;

    }

    const result =
      new Date(value).getTime();

    return Number.isNaN(result)
      ? 0
      : result;

  } catch {

    return 0;

  }

}


// ============================================================
// SORT TERBARU
// ============================================================

function sortNewest(items) {

  return items.sort((a, b) => {

    const aDate =
      a.createdAt ||
      a.updatedAt ||
      a.timestamp;

    const bDate =
      b.createdAt ||
      b.updatedAt ||
      b.timestamp;

    return (
      getTimestamp(bDate) -
      getTimestamp(aDate)
    );

  });

}


// ============================================================
// AVATAR FALLBACK
// ============================================================

function createAvatar(name) {

  const letter =
    (name || "U")
      .trim()
      .charAt(0)
      .toUpperCase();

  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(letter) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=200"
  );

}


// ============================================================
// PROFIL GOOGLE
// ============================================================

function renderGoogleProfile(user) {

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

        profilePhoto.src =
          createAvatar(name);

      };

  }

}


// ============================================================
// LOGIN CHECK
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    console.log(
      "BUTUH Auth:",
      user
    );


    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    // ========================================================
    // TAMPILKAN PROFIL GOOGLE SECEPATNYA
    // ========================================================

    renderGoogleProfile(user);


    // ========================================================
    // LOAD DATA
    // ========================================================

    await Promise.allSettled([

      loadNeeds(user),

      loadOffers(user),

      loadRating(user)

    ]);

  }
);


// ============================================================
// LOAD KEBUTUHAN
// ============================================================

async function loadNeeds(user) {

  try {

    console.log(
      "Mengambil kebutuhan user..."
    );


    const q =
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
      await getDocs(q);


    const needs = [];


    snapshot.forEach(
      docSnap => {

        needs.push({

          id: docSnap.id,

          ...docSnap.data()

        });

      }
    );


    sortNewest(needs);


    console.log(
      "KEBUTUHAN:",
      needs
    );


    // ========================================================
    // STATISTIK
    // ========================================================

    if (totalNeeds) {

      totalNeeds.textContent =
        needs.length;

    }


    // ========================================================
    // RENDER
    // ========================================================

    renderNeeds(needs);


  } catch (error) {

    console.error(
      "Gagal memuat kebutuhan:",
      error
    );


    if (needsList) {

      needsList.innerHTML = `

        <div class="error-state">

          <div class="error-icon">
            ⚠️
          </div>

          <strong>
            Gagal memuat kebutuhan
          </strong>

          <p>
            ${escapeHTML(
              error.message
            )}
          </p>

        </div>

      `;

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
    needs.map(need => {

      const title =
        need.title ||
        need.judul ||
        need.name ||
        "Kebutuhan";


      const description =
        need.description ||
        need.deskripsi ||
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


      const statusClass =
        getStatusClass(status);


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
                    ${escapeHTML(
                      description
                    )}
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


          <span
            class="status ${statusClass}"
          >
            ${escapeHTML(status)}
          </span>

        </div>

      `;

    }).join("");

}


// ============================================================
// LOAD PENAWARAN
// ============================================================

async function loadOffers(user) {

  try {

    console.log(
      "Mengambil penawaran user..."
    );


    /*
      STRUKTUR DATABASE:

      needs/{needId}/offers/{offerId}

      Karena offers adalah SUBCOLLECTION,
      kita menggunakan collectionGroup().
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
          user.uid
        )

      );


    const snapshot =
      await getDocs(q);


    const offers = [];


    snapshot.forEach(
      docSnap => {

        const data =
          docSnap.data();


        /*
          Mengambil needId dari path:

          needs/ABC123/offers/XYZ789
        */

        const needReference =
          docSnap.ref.parent.parent;


        const needId =
          needReference
            ? needReference.id
            : "";


        offers.push({

          id: docSnap.id,

          needId,

          ...data

        });

      }
    );


    sortNewest(offers);


    console.log(
      "PENAWARAN:",
      offers
    );


    // ========================================================
    // TOTAL PENAWARAN
    // ========================================================

    if (totalOffers) {

      totalOffers.textContent =
        offers.length;

    }


    // ========================================================
    // HITUNG STATUS
    // ========================================================

    let accepted = 0;

    let completed = 0;


    offers.forEach(
      offer => {

        const status =
          String(
            offer.status ||
            ""
          ).toLowerCase();


        if (
          status === "accepted" ||
          status === "diterima" ||
          status === "accepted_offer"
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


    // ========================================================
    // RENDER
    // ========================================================

    renderOffers(offers);


  } catch (error) {

    console.error(
      "Gagal memuat penawaran:",
      error
    );


    if (offersList) {

      offersList.innerHTML = `

        <div class="error-state">

          <div class="error-icon">
            ⚠️
          </div>

          <strong>
            Gagal memuat penawaran
          </strong>

          <p>
            ${escapeHTML(
              error.message
            )}
          </p>

        </div>

      `;

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
    offers.map(offer => {

      const title =
        offer.needTitle ||
        offer.title ||
        offer.needName ||
        "Kebutuhan";


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


      const statusClass =
        getStatusClass(status);


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
                    ${escapeHTML(
                      message
                    )}
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

              ${
                offer.needId
                  ? `
                    <span>
                      ID:
                      ${escapeHTML(
                        offer.needId
                      )}
                    </span>
                  `
                  : ""
              }

            </div>

          </div>


          <div>

            <div class="offer-price">
              ${formatRupiah(price)}
            </div>

            <span
              class="status ${statusClass}"
            >
              ${escapeHTML(status)}
            </span>

          </div>

        </div>

      `;

    }).join("");

}


// ============================================================
// STATUS CLASS
// ============================================================

function getStatusClass(status) {

  const value =
    String(status || "")
      .toLowerCase();


  if (
    value === "accepted" ||
    value === "diterima" ||
    value === "success"
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
    value === "rejected" ||
    value === "ditolak" ||
    value === "cancelled" ||
    value === "canceled"
  ) {

    return "status-danger";

  }


  return "status-pending";

}


// ============================================================
// LOAD RATING
// ============================================================

async function loadRating(user) {

  try {

    /*
      Untuk sementara kita cari rating
      berdasarkan field reviewerId.

      Jika database rating Anda mempunyai
      field penerima seperti receiverId,
      ratedUserId, targetUserId, dll,
      nanti bisa kita sesuaikan.
    */


    const q =
      query(

        collection(
          db,
          "ratings"
        ),

        where(
          "reviewerId",
          "==",
          user.uid
        )

      );


    const snapshot =
      await getDocs(q);


    let total = 0;

    let count = 0;


    snapshot.forEach(
      docSnap => {

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
          Number.isFinite(rating) &&
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
      "Gagal memuat rating:",
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
