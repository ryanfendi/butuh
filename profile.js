// ============================================================
// BUTUH - PROFILE.JS
// FINAL
// Database:
//
// users/{uid}
// needs/{needId}
// needs/{needId}/offers/{offerId}
// ratings/{ratingId}
//
// ============================================================

import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  collectionGroup,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ============================================================
// ELEMENT
// ============================================================

const profilePhoto =
  document.getElementById("profilePhoto");

const profileName =
  document.getElementById("profileName");

const profileEmail =
  document.getElementById("profileEmail");

const statNeeds =
  document.getElementById("statNeeds");

const statOffers =
  document.getElementById("statOffers");

const statRating =
  document.getElementById("statRating");

const needsList =
  document.getElementById("needsList");

const offersList =
  document.getElementById("offersList");

const loadingNeeds =
  document.getElementById("loadingNeeds");

const loadingOffers =
  document.getElementById("loadingOffers");

const logoutBtn =
  document.getElementById("logoutBtn");


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

  if (value === undefined || value === null) {
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

  return "Rp" + number.toLocaleString("id-ID");
}


// ============================================================
// DATE
// ============================================================

function formatDate(value) {

  if (!value) {
    return "-";
  }

  try {

    let date;

    if (value.toDate) {

      date = value.toDate();

    } else if (value.seconds) {

      date =
        new Date(value.seconds * 1000);

    } else {

      date =
        new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
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
// TIME
// ============================================================

function getTime(value) {

  if (!value) {
    return 0;
  }

  try {

    if (value.toDate) {
      return value.toDate().getTime();
    }

    if (value.seconds) {
      return value.seconds * 1000;
    }

    const time =
      new Date(value).getTime();

    return Number.isNaN(time)
      ? 0
      : time;

  } catch {

    return 0;
  }
}


// ============================================================
// SORT TERBARU
// ============================================================

function sortNewest(array) {

  return array.sort((a, b) => {

    const dateA =
      a.createdAt ||
      a.updatedAt ||
      a.timestamp;

    const dateB =
      b.createdAt ||
      b.updatedAt ||
      b.timestamp;

    return getTime(dateB) - getTime(dateA);

  });

}


// ============================================================
// AVATAR
// ============================================================

function createAvatar(name) {

  const first =
    (name || "U")
      .trim()
      .charAt(0)
      .toUpperCase();

  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(first) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=200"
  );
}


// ============================================================
// PROFIL USER
// ============================================================

function renderProfile(user) {

  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna BUTUH";

  const email =
    user.email || "";

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
      () => {

        profilePhoto.src =
          createAvatar(name);

      };

  }

}


// ============================================================
// LOAD USER
// ============================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }


    console.log(
      "BUTUH PROFILE USER:",
      user.uid
    );


    // Tampilkan Gmail langsung
    renderProfile(user);


    // Jalankan semuanya
    await Promise.allSettled([

      loadNeeds(user),

      loadOffers(user),

      loadRating(user)

    ]);

  }
);


// ============================================================
// LOAD KEBUTUHAN USER
// ============================================================

async function loadNeeds(user) {

  if (loadingNeeds) {

    loadingNeeds.style.display =
      "block";

  }


  if (needsList) {

    needsList.innerHTML = "";

  }


  try {

    console.log(
      "Mengambil kebutuhan..."
    );


    // HANYA ownerId
    // Tidak menggunakan orderBy
    // Tidak membutuhkan composite index

    const q = query(

      collection(db, "needs"),

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
      doc => {

        needs.push({

          id: doc.id,

          ...doc.data()

        });

      }
    );


    sortNewest(needs);


    console.log(
      "Jumlah kebutuhan:",
      needs.length
    );


    if (statNeeds) {

      statNeeds.textContent =
        needs.length;

    }


    renderNeeds(needs);


  } catch (error) {

    console.error(
      "ERROR NEEDS:",
      error
    );


    if (needsList) {

      needsList.innerHTML = `

        <div class="error-box">

          <strong>
            ⚠️ Gagal memuat kebutuhan
          </strong>

          <p>
            ${escapeHTML(error.message)}
          </p>

        </div>

      `;

    }

  } finally {

    if (loadingNeeds) {

      loadingNeeds.style.display =
        "none";

    }

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

      <div class="empty-box">

        <div class="empty-icon">
          📋
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <p>
          Anda belum memposting kebutuhan.
        </p>

        <a
          href="index.html"
          class="btn-primary"
        >
          + Posting Kebutuhan
        </a>

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
                ${formatDate(
                  need.createdAt
                )}
              </span>

            </div>

            <span class="status">
              ${escapeHTML(status)}
            </span>

          </div>


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


          <div class="history-card-bottom">

            <strong>
              ${formatRupiah(budget)}
            </strong>

          </div>

        </article>

      `;

    }).join("");

}


// ============================================================
// LOAD OFFERS
// ============================================================

async function loadOffers(user) {

  if (loadingOffers) {

    loadingOffers.style.display =
      "block";

  }


  if (offersList) {

    offersList.innerHTML = "";

  }


  try {

    console.log(
      "Mengambil riwayat penawaran..."
    );


    /*
      PENTING:

      offers berada di:

      needs/{needId}/offers/{offerId}

      Karena itu harus collectionGroup.
    */

    const q = query(

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
      doc => {

        const data =
          doc.data();


        offers.push({

          id: doc.id,

          ...data,

          // Ambil needId
          // dari path dokumen
          needId:
            doc.ref.parent.parent?.id ||
            data.needId ||
            ""

        });

      }
    );


    sortNewest(offers);


    console.log(
      "Jumlah penawaran:",
      offers.length
    );


    if (statOffers) {

      statOffers.textContent =
        offers.length;

    }


    renderOffers(offers);


  } catch (error) {

    console.error(
      "ERROR OFFERS:",
      error
    );


    if (offersList) {

      offersList.innerHTML = `

        <div class="error-box">

          <strong>
            ⚠️ Gagal memuat penawaran
          </strong>

          <p>
            ${escapeHTML(
              error.message
            )}
          </p>

        </div>

      `;

    }

  } finally {

    if (loadingOffers) {

      loadingOffers.style.display =
        "none";

    }

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

      <div class="empty-box">

        <div class="empty-icon">
          💼
        </div>

        <strong>
          Belum ada penawaran
        </strong>

        <p>
          Anda belum mengirim penawaran.
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

          <div class="history-card-top">

            <div>

              <h3>
                ${escapeHTML(title)}
              </h3>

              <span class="date">

                ${formatDate(
                  offer.createdAt
                )}

              </span>

            </div>


            <span class="status">

              ${escapeHTML(status)}

            </span>

          </div>


          ${
            message
              ? `
                <p>
                  ${escapeHTML(message)}
                </p>
              `
              : ""
          }


          <div class="history-card-bottom">

            <strong>
              ${formatRupiah(price)}
            </strong>

          </div>

        </article>

      `;

    }).join("");

}


// ============================================================
// LOAD RATING
// ============================================================

async function loadRating(user) {

  if (!statRating) {
    return;
  }


  try {

    /*
      Karena struktur ratings Anda:

      ratings/{ratingId}

      dan reviewerId adalah pemberi rating.

      Kita ambil rating yang diberikan user.

      Jika nanti ingin menghitung rating
      yang DITERIMA user, kita perlu mengetahui
      field penerimanya.
    */

    const q = query(

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
      doc => {

        const data =
          doc.data();


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

      statRating.textContent =
        "0";

      return;

    }


    const average =
      total / count;


    statRating.textContent =
      average.toFixed(1);


  } catch (error) {

    console.error(
      "ERROR RATING:",
      error
    );


    statRating.textContent =
      "0";

  }

}


// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);

        window.location.href =
          "login.html";

      } catch (error) {

        console.error(error);

        alert(
          "Gagal keluar: " +
          error.message
        );

      }

    }
  );

}
