/* =====================================================
   PROFILE.JS - BUTUH
   VERSI CEPAT
   Cocok dengan firebase.js / script.js
   Struktur Firestore:

   needs/{needId}
   needs/{needId}/offers/{offerId}

   Tidak menggunakan collectionGroup()
   Tidak membutuhkan Collection Group Index
===================================================== */

import {
  initializeApp,
  getApps,
  getApp
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


/* =====================================================
   FIREBASE CONFIG
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


/* =====================================================
   INIT FIREBASE
===================================================== */

/*
   Kalau firebase.js sudah pernah initializeApp(),
   gunakan app yang sudah ada.

   Kalau belum, buat baru.
*/

const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);


const auth =
  getAuth(app);


const db =
  getFirestore(app);


/* =====================================================
   GLOBAL
===================================================== */

let currentUser = null;

let allNeeds = [];

let allOffers = [];

let loadingNeeds = false;

let loadingOffers = false;


/* =====================================================
   HELPER DOM
===================================================== */

function $(id) {
  return document.getElementById(id);
}


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


    currentUser = user;


    updateProfileUI(user);


    /*
      Jalankan kebutuhan dan penawaran
      secara paralel supaya lebih cepat.
    */

    await Promise.all([
      loadMyNeeds(),
      loadMyOffers()
    ]);

  }
);


/* =====================================================
   PROFILE UI
===================================================== */

function updateProfileUI(user) {

  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Pengguna";


  const email =
    user.email ||
    "";


  const photo =
    user.photoURL ||
    createAvatar(name);


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
   LOAD MY NEEDS
===================================================== */

async function loadMyNeeds() {

  if (
    loadingNeeds ||
    !currentUser
  ) {
    return;
  }


  loadingNeeds = true;


  const container =
    $("needsList");


  if (!container) {

    loadingNeeds = false;

    return;

  }


  /*
    Tampilkan loading hanya sekali.
  */

  container.innerHTML = `

    <div class="loading-state">

      <div class="spinner"></div>

      Memuat kebutuhan...

    </div>

  `;


  try {

    /*
      Hanya query kebutuhan milik user.

      Tidak menggunakan orderBy
      agar tidak membutuhkan composite index.
    */

    const needsRef =
      collection(
        db,
        "needs"
      );


    const q =
      query(
        needsRef,
        where(
          "ownerId",
          "==",
          currentUser.uid
        )
      );


    const snapshot =
      await getDocs(q);


    allNeeds = [];


    snapshot.forEach(
      item => {

        allNeeds.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );


    /*
      Urutkan di browser.
    */

    allNeeds.sort(
      (a, b) =>
        getTime(
          b.createdAt
        ) -
        getTime(
          a.createdAt
        )
    );


    /*
      Statistik kebutuhan.
    */

    setText(
      "totalNeeds",
      allNeeds.length
    );


    renderNeeds(
      allNeeds
    );


  } catch (error) {

    console.error(
      "LOAD NEEDS ERROR:",
      error
    );


    container.innerHTML = `

      <div class="error-state">

        <div class="error-icon">
          ⚠️
        </div>

        <strong>
          Gagal memuat riwayat kebutuhan
        </strong>

        <p>
          ${escapeHTML(
            error.message
          )}
        </p>

        <button
          type="button"
          class="btn btn-primary"
          id="retryNeeds"
        >
          🔄 Coba Lagi
        </button>

      </div>

    `;


    $("retryNeeds")
      ?.addEventListener(
        "click",
        loadMyNeeds
      );

  } finally {

    loadingNeeds = false;

  }

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
    !needs.length
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📭
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


  container.innerHTML =
    needs
      .map(
        createNeedCard
      )
      .join("");


  /*
    Event tombol dipasang setelah
    HTML selesai dibuat.

    Tidak menggunakan window.location
    sehingga tidak ada Error 404.
  */

  container
    .querySelectorAll(
      "[data-view-need]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.viewNeed;

            openNeedDetail(
              id
            );

          }
        );

      }
    );

}


/* =====================================================
   NEED CARD
===================================================== */

function createNeedCard(
  need
) {

  const status =
    String(
      need.status ||
      "open"
    ).toLowerCase();


  const statusInfo =
    getNeedStatus(
      status
    );


  return `

    <article
      class="history-card"
    >

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
            📂
            ${escapeHTML(
              getCategory(
                need.category
              )
            )}
          </span>


          <span>
            💰
            Rp ${formatMoney(
              need.budget
            )}
          </span>


          <span>
            📅
            ${formatDate(
              need.createdAt
            )}
          </span>

        </div>

      </div>


      <div>

        <span
          class="status ${statusInfo.className}"
        >
          ${statusInfo.label}
        </span>


        <br>


        <button
          type="button"
          class="btn btn-primary"
          data-view-need="${escapeHTML(
            need.id
          )}"
          style="margin-top:12px"
        >
          👁️ Lihat Kebutuhan
        </button>

      </div>

    </article>

  `;

}


/* =====================================================
   NEED STATUS
===================================================== */

function getNeedStatus(
  status
) {

  if (
    status === "completed" ||
    status === "selesai"
  ) {

    return {

      label:
        "✓ Selesai",

      className:
        "status-completed"

    };

  }


  if (
    status === "cancelled" ||
    status === "canceled" ||
    status === "ditolak"
  ) {

    return {

      label:
        "Dibatalkan",

      className:
        "status-danger"

    };

  }


  if (
    status === "closed" ||
    status === "ditutup"
  ) {

    return {

      label:
        "Ditutup",

      className:
        "status-completed"

    };

  }


  return {

    label:
      "Aktif",

    className:
      "status-success"

  };

}


/* =====================================================
   OPEN NEED DETAIL
===================================================== */

function openNeedDetail(
  needId
) {

  const need =
    allNeeds.find(
      item =>
        item.id ===
        needId
    );


  if (!need) {

    alert(
      "Data kebutuhan tidak ditemukan."
    );

    return;

  }


  /*
    Buat modal sendiri.

    Tidak redirect ke:
    need.html?id=...
    atau halaman lain.

    Jadi tidak ada Error 404.
  */

  let modal =
    $("profileNeedModal");


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "profileNeedModal";

    modal.style.position =
      "fixed";

    modal.style.inset =
      "0";

    modal.style.zIndex =
      "9999";

    modal.style.background =
      "rgba(15,23,42,.65)";

    modal.style.display =
      "flex";

    modal.style.alignItems =
      "center";

    modal.style.justifyContent =
      "center";

    modal.style.padding =
      "20px";

    document.body.appendChild(
      modal
    );

  }


  modal.innerHTML = `

    <div
      style="
        background:#fff;
        width:min(650px,100%);
        max-height:90vh;
        overflow:auto;
        border-radius:20px;
        box-shadow:0 20px 60px rgba(0,0,0,.2);
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
          padding:22px;
          border-bottom:1px solid #e5e7eb;
        "
      >

        <div>

          <div
            style="
              font-size:12px;
              color:#2563eb;
              font-weight:800;
              margin-bottom:6px;
            "
          >
            DETAIL KEBUTUHAN
          </div>


          <h2
            style="
              margin:0;
            "
          >
            ${escapeHTML(
              need.title ||
              "Kebutuhan"
            )}
          </h2>

        </div>


        <button
          id="closeProfileNeedModal"
          type="button"
          style="
            border:0;
            background:#f3f4f6;
            width:40px;
            height:40px;
            border-radius:50%;
            font-size:25px;
            cursor:pointer;
          "
        >
          ×
        </button>

      </div>


      <div
        style="
          padding:22px;
        "
      >

        <p
          style="
            line-height:1.7;
            color:#475467;
          "
        >
          ${escapeHTML(
            need.description ||
            "Tidak ada deskripsi."
          )}
        </p>


        <div
          style="
            background:#eff6ff;
            border-radius:14px;
            padding:18px;
            margin:20px 0;
          "
        >

          <small>
            Budget
          </small>


          <div
            style="
              color:#2563eb;
              font-size:25px;
              font-weight:800;
              margin-top:4px;
            "
          >
            Rp ${formatMoney(
              need.budget
            )}
          </div>

        </div>


        <div
          style="
            display:grid;
            gap:10px;
            color:#475467;
          "
        >

          <div>
            📂
            <strong>
              Kategori:
            </strong>

            ${escapeHTML(
              getCategory(
                need.category
              )
            )}
          </div>


          <div>
            📅
            <strong>
              Deadline:
            </strong>

            ${escapeHTML(
              need.deadline ||
              "Tidak ditentukan"
            )}
          </div>


          <div>
            👤
            <strong>
              Pemilik:
            </strong>

            ${escapeHTML(
              need.ownerName ||
              "Pengguna"
            )}
          </div>


          <div>
            🕐
            <strong>
              Diposting:
            </strong>

            ${formatDate(
              need.createdAt
            )}
          </div>

        </div>


        <div
          style="
            margin-top:22px;
          "
        >

          <button
            type="button"
            class="btn btn-outline"
            id="closeProfileNeedBottom"
            style="width:100%"
          >
            Tutup
          </button>

        </div>

      </div>

    </div>

  `;


  $("closeProfileNeedModal")
    ?.addEventListener(
      "click",
      closeNeedDetail
    );


  $("closeProfileNeedBottom")
    ?.addEventListener(
      "click",
      closeNeedDetail
    );


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        modal
      ) {

        closeNeedDetail();

      }

    },
    {
      once:true
    }
  );


  function closeNeedDetail() {

    modal.remove();

  }

}


/* =====================================================
   LOAD MY OFFERS
===================================================== */

/*
   PENTING:

   Kita TIDAK menggunakan:

   collectionGroup(db, "offers")

   karena itu membutuhkan Collection Group Index.

   Sebaliknya:

   1. Ambil kebutuhan milik user? TIDAK cukup.
   2. Karena user bisa menawarkan ke kebutuhan orang lain,
      kita ambil daftar kebutuhan yang tersedia.
   3. Untuk setiap kebutuhan, cek subcollection offers
      dengan providerId.

   Agar cepat, kita lakukan secara paralel.
*/

async function loadMyOffers() {

  if (
    loadingOffers ||
    !currentUser
  ) {
    return;

  }


  loadingOffers = true;


  const container =
    $("offersList");


  if (!container) {

    loadingOffers = false;

    return;

  }


  container.innerHTML = `

    <div class="loading-state">

      <div class="spinner"></div>

      Memuat penawaran...

    </div>

  `;


  try {

    /*
      Ambil semua kebutuhan.

      Tidak memakai orderBy.
    */

    const needsSnapshot =
      await getDocs(
        collection(
          db,
          "needs"
        )
      );


    const needs =
      [];


    needsSnapshot.forEach(
      item => {

        needs.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );


    /*
      Jika tidak ada kebutuhan,
      berarti otomatis tidak ada offer.
    */

    if (
      needs.length === 0
    ) {

      allOffers = [];

      setText(
        "totalOffers",
        "0"
      );

      setText(
        "acceptedOffers",
        "0"
      );

      setText(
        "completedOffers",
        "0"
      );

      renderOffers(
        []
      );

      loadingOffers = false;

      return;

    }


    /*
      Baca offers secara paralel.

      Promise.all membuat proses jauh
      lebih cepat daripada menunggu satu-satu.
    */

    const results =
      await Promise.all(

        needs.map(
          async need => {

            try {

              const offersRef =
                collection(
                  db,
                  "needs",
                  need.id,
                  "offers"
                );


              const q =
                query(
                  offersRef,
                  where(
                    "providerId",
                    "==",
                    currentUser.uid
                  )
                );


              const snapshot =
                await getDocs(q);


              return snapshot.docs.map(
                offerDoc => ({

                  id:
                    offerDoc.id,

                  needId:
                    need.id,

                  needTitle:
                    need.title ||
                    "Kebutuhan",

                  needBudget:
                    need.budget ||
                    0,

                  needOwnerId:
                    need.ownerId ||
                    "",

                  ...offerDoc.data()

                })
              );


            } catch (error) {

              /*
                Satu kebutuhan gagal tidak boleh
                membuat seluruh riwayat gagal.
              */

              console.warn(
                "Offer gagal:",
                need.id,
                error
              );


              return [];

            }

          }
        )

      );


    allOffers =
      results.flat();


    /*
      Urutkan terbaru.
    */

    allOffers.sort(
      (a, b) =>
        getTime(
          b.createdAt
        ) -
        getTime(
          a.createdAt
        )
    );


    /*
      Statistik.
    */

    const accepted =
      allOffers.filter(
        offer => {

          const status =
            String(
              offer.status ||
              ""
            ).toLowerCase();

          return (
            status === "accepted" ||
            status === "diterima" ||
            status === "approved"
          );

        }
      ).length;


    const completed =
      allOffers.filter(
        offer => {

          const status =
            String(
              offer.status ||
              ""
            ).toLowerCase();

          return (
            status === "completed" ||
            status === "complete" ||
            status === "selesai"
          );

        }
      ).length;


    setText(
      "totalOffers",
      allOffers.length
    );


    setText(
      "acceptedOffers",
      accepted
    );


    setText(
      "completedOffers",
      completed
    );


    renderOffers(
      allOffers
    );


  } catch (error) {

    console.error(
      "LOAD OFFERS ERROR:",
      error
    );


    /*
      Seharusnya tidak lagi terkena
      Collection Group Index karena
      kita tidak menggunakan collectionGroup().
    */

    container.innerHTML = `

      <div class="error-state">

        <div class="error-icon">
          ⚠️
        </div>

        <strong>
          Gagal memuat riwayat penawaran
        </strong>

        <p>
          ${escapeHTML(
            error.message
          )}
        </p>

        <button
          type="button"
          class="btn btn-primary"
          id="retryOffers"
        >
          🔄 Coba Lagi
        </button>

      </div>

    `;


    $("retryOffers")
      ?.addEventListener(
        "click",
        loadMyOffers
      );

  } finally {

    loadingOffers = false;

  }

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
    !offers.length
  ) {

    container.innerHTML = `

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


  container.innerHTML =
    offers
      .map(
        createOfferCard
      )
      .join("");


  /*
    Tombol buka kebutuhan
    menggunakan modal.
  */

  container
    .querySelectorAll(
      "[data-offer-need]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openOfferNeed(
              button.dataset.offerNeed
            );

          }
        );

      }
    );

}


/* =====================================================
   OFFER CARD
===================================================== */

function createOfferCard(
  offer
) {

  const status =
    String(
      offer.status ||
      "pending"
    ).toLowerCase();


  const statusInfo =
    getOfferStatus(
      status
    );


  return `

    <article
      class="history-card"
    >

      <div class="history-main">

        <h3>
          ${escapeHTML(
            offer.needTitle ||
            "Kebutuhan"
          )}
        </h3>


        <p>
          ${escapeHTML(
            truncate(
              offer.message ||
              "",
              180
            )
          )}
        </p>


        <div class="history-meta">

          <span
            class="offer-price"
          >
            💰 Rp ${formatMoney(
              offer.price
            )}
          </span>


          <span>
            ⏱️
            ${escapeHTML(
              offer.duration ||
              "-"
            )}
          </span>


          <span>
            📅
            ${formatDate(
              offer.createdAt
            )}
          </span>

        </div>

      </div>


      <div>

        <span
          class="status ${statusInfo.className}"
        >
          ${statusInfo.label}
        </span>


        <br>


        <button
          type="button"
          class="btn btn-primary"
          data-offer-need="${escapeHTML(
            offer.needId
          )}"
          style="margin-top:12px"
        >
          👁️ Lihat Kebutuhan
        </button>

      </div>

    </article>

  `;

}


/* =====================================================
   OFFER STATUS
===================================================== */

function getOfferStatus(
  status
) {

  switch (status) {

    case "accepted":

    case "diterima":

    case "approved":

      return {

        label:
          "✓ Diterima",

        className:
          "status-success"

      };


    case "completed":

    case "complete":

    case "selesai":

      return {

        label:
          "✓ Selesai",

        className:
          "status-completed"

      };


    case "rejected":

    case "declined":

    case "ditolak":

    case "cancelled":

    case "canceled":

      return {

        label:
          "Ditolak",

        className:
          "status-danger"

      };


    default:

      return {

        label:
          "Menunggu",

        className:
          "status-pending"

      };

  }

}


/* =====================================================
   OPEN OFFER'S NEED
===================================================== */

function openOfferNeed(
  needId
) {

  /*
    Cari dari cache allNeeds terlebih dahulu.
  */

  let need =
    allNeeds.find(
      item =>
        item.id ===
        needId
    );


  /*
    Jika kebutuhan bukan milik user,
    ambil langsung dari Firestore.
  */

  if (need) {

    showNeedModal(
      need
    );

    return;

  }


  loadNeedForOffer(
    needId
  );

}


/* =====================================================
   LOAD NEED FOR OFFER
===================================================== */

async function loadNeedForOffer(
  needId
) {

  try {

    /*
      Import dinamis agar file tetap ringan.
    */

    const {
      getDoc,
      doc
    } =
      await import(
        "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js"
      );


    const snapshot =
      await getDoc(
        doc(
          db,
          "needs",
          needId
        )
      );


    if (
      !snapshot.exists()
    ) {

      alert(
        "Kebutuhan sudah tidak tersedia."
      );

      return;

    }


    showNeedModal({

      id:
        snapshot.id,

      ...snapshot.data()

    });


  } catch (error) {

    console.error(
      error
    );


    alert(
      "Gagal membuka kebutuhan."
    );

  }

}


/* =====================================================
   NEED MODAL
===================================================== */

function showNeedModal(
  need
) {

  let modal =
    $("profileNeedModal");


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "profileNeedModal";

    modal.style.position =
      "fixed";

    modal.style.inset =
      "0";

    modal.style.zIndex =
      "9999";

    modal.style.background =
      "rgba(15,23,42,.65)";

    modal.style.display =
      "flex";

    modal.style.alignItems =
      "center";

    modal.style.justifyContent =
      "center";

    modal.style.padding =
      "20px";

    document.body.appendChild(
      modal
    );

  }


  modal.innerHTML = `

    <div
      style="
        background:#fff;
        width:min(650px,100%);
        max-height:90vh;
        overflow:auto;
        border-radius:20px;
      "
    >

      <div
        style="
          padding:22px;
          border-bottom:1px solid #e5e7eb;
          display:flex;
          justify-content:space-between;
          gap:15px;
        "
      >

        <div>

          <small
            style="
              color:#2563eb;
              font-weight:800;
            "
          >
            DETAIL KEBUTUHAN
          </small>


          <h2>
            ${escapeHTML(
              need.title ||
              "Kebutuhan"
            )}
          </h2>

        </div>


        <button
          type="button"
          id="closeNeedDetail"
          style="
            border:0;
            background:#f3f4f6;
            width:40px;
            height:40px;
            border-radius:50%;
            font-size:25px;
          "
        >
          ×
        </button>

      </div>


      <div
        style="
          padding:22px;
        "
      >

        <p
          style="
            line-height:1.7;
            color:#475467;
          "
        >
          ${escapeHTML(
            need.description ||
            "Tidak ada deskripsi."
          )}
        </p>


        <div
          style="
            background:#eff6ff;
            padding:18px;
            border-radius:14px;
            margin:20px 0;
          "
        >

          <small>
            Budget
          </small>


          <div
            style="
              font-size:25px;
              font-weight:800;
              color:#2563eb;
            "
          >
            Rp ${formatMoney(
              need.budget
            )}
          </div>

        </div>


        <div
          style="
            display:grid;
            gap:10px;
            color:#475467;
          "
        >

          <div>
            📂
            ${escapeHTML(
              getCategory(
                need.category
              )
            )}
          </div>


          <div>
            📅 Deadline:
            ${escapeHTML(
              need.deadline ||
              "Tidak ditentukan"
            )}
          </div>


          <div>
            👤 Pemilik:
            ${escapeHTML(
              need.ownerName ||
              "Pengguna"
            )}
          </div>


          <div>
            🕐
            ${formatDate(
              need.createdAt
            )}
          </div>

        </div>


        <button
          type="button"
          class="btn btn-outline"
          id="closeNeedDetailBottom"
          style="
            width:100%;
            margin-top:22px;
          "
        >
          Tutup
        </button>

      </div>

    </div>

  `;


  $("closeNeedDetail")
    ?.addEventListener(
      "click",
      () => modal.remove()
    );


  $("closeNeedDetailBottom")
    ?.addEventListener(
      "click",
      () => modal.remove()
    );


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        modal
      ) {

        modal.remove();

      }

    }
  );

}


/* =====================================================
   CATEGORY
===================================================== */

function getCategory(
  value
) {

  const categories = {

    design:
      "🎨 Desain",

    website:
      "🌐 Website",

    programming:
      "💻 Programming",

    marketing:
      "📢 Marketing",

    writing:
      "✍️ Penulisan",

    video:
      "🎬 Video",

    translation:
      "🌍 Terjemahan",

    other:
      "📦 Lainnya"

  };


  return (
    categories[value] ||
    categories.other
  );

}


/* =====================================================
   DATE
===================================================== */

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
    typeof value ===
    "object" &&
    value.seconds
  ) {

    return (
      value.seconds *
      1000
    );

  }


  const time =
    new Date(
      value
    ).getTime();


  return Number.isFinite(time)
    ? time
    : 0;

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
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric"
    }
  ).format(
    new Date(time)
  );

}


/* =====================================================
   MONEY
===================================================== */

function formatMoney(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(number)
  ) {

    return "0";

  }


  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    number
  );

}


/* =====================================================
   TEXT
===================================================== */

function truncate(
  text,
  length
) {

  const value =
    String(
      text ||
      ""
    );


  if (
    value.length <=
    length
  ) {

    return value;

  }


  return (
    value.substring(
      0,
      length
    ) +
    "..."
  );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

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


/* =====================================================
   IMAGE
===================================================== */

function setImage(
  id,
  src
) {

  const element =
    $(id);


  if (!element) {
    return;
  }


  element.src =
    src;


  element.onerror =
    () => {

      element.src =
        createAvatar(
          "U"
        );

    };

}


/* =====================================================
   TEXT SETTER
===================================================== */

function setText(
  id,
  value
) {

  const element =
    $(id);


  if (element) {

    element.textContent =
      value;

  }

}


/* =====================================================
   AVATAR
===================================================== */

function createAvatar(
  name
) {

  const letter =
    String(
      name ||
      "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();


  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(
      letter
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


/* =====================================================
   ESCAPE KEY
===================================================== */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      $("profileNeedModal")
        ?.remove();

    }

  }
);
