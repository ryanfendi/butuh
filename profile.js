/* =========================================================
   BUTUH - PROFILE.JS
   ========================================================= */


/* =========================================================
   FIREBASE IMPORT
   ========================================================= */

import {
  initializeApp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  collectionGroup,
  onSnapshot
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

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


/* =========================================================
   INITIALIZE
   ========================================================= */

const app =
  initializeApp(
    firebaseConfig
  );

const auth =
  getAuth(
    app
  );

const db =
  getFirestore(
    app
  );


/* =========================================================
   GLOBAL DATA
   ========================================================= */

let currentUser =
  null;

let userNeeds =
  [];

let userOffers =
  [];

let unsubscribeNeeds =
  null;

let unsubscribeOffers =
  null;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {

  return document.getElementById(
    id
  );

}


/* =========================================================
   AUTH
   ========================================================= */

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


    console.log(
      "Profile user:",
      user.uid
    );


    /*
     * Tampilkan profil Google
     */

    displayProfile(
      user
    );


    /*
     * Ambil data profil Firestore
     */

    await loadUserProfile(
      user
    );


    /*
     * Riwayat kebutuhan
     */

    loadUserNeeds();


    /*
     * Riwayat penawaran
     */

    loadUserOffers();


    /*
     * Rating
     */

    loadRatings();

  }
);


/* =========================================================
   DISPLAY PROFILE
   ========================================================= */

function displayProfile(
  user
) {

  const name =
    user.displayName ||
    "User";

  const email =
    user.email ||
    "";

  const photo =
    user.photoURL ||
    createAvatar(
      name
    );


  /*
   * Header
   */

  setText(
    "userName",
    name
  );

  setText(
    "userEmail",
    email
  );

  setImage(
    "userPhoto",
    photo
  );


  /*
   * Main profile
   */

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


/* =========================================================
   LOAD USER PROFILE
   ========================================================= */

async function loadUserProfile(
  user
) {

  try {

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );


    const snapshot =
      await getDoc(
        userRef
      );


    if (
      !snapshot.exists()
    ) {

      setText(
        "memberSince",
        "Baru bergabung"
      );

      return;

    }


    const data =
      snapshot.data();


    const created =
      formatDate(
        data.createdAt
      );


    setText(
      "memberSince",
      created
    );


  } catch (error) {

    console.error(
      "Gagal membaca profil:",
      error
    );


    setText(
      "memberSince",
      "Pengguna BUTUH"
    );

  }

}


/* =========================================================
   LOAD USER NEEDS
   ========================================================= */

function loadUserNeeds() {

  if (
    !currentUser
  ) {

    return;

  }


  /*
   * Hapus listener sebelumnya
   */

  if (
    unsubscribeNeeds
  ) {

    unsubscribeNeeds();

  }


  const needsQuery =
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


  unsubscribeNeeds =
    onSnapshot(

      needsQuery,

      snapshot => {

        userNeeds =
          [];


        snapshot.forEach(
          item => {

            userNeeds.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        /*
         * Urutkan terbaru
         */

        userNeeds.sort(
          (a, b) => {

            return (
              getTimestamp(
                b.createdAt
              )
              -
              getTimestamp(
                a.createdAt
              )
            );

          }
        );


        /*
         * Update statistik
         */

        updateNeedStats();


        /*
         * Tampilkan riwayat
         */

        renderNeedsHistory();

      },

      error => {

        console.error(
          "Gagal membaca kebutuhan:",
          error
        );


        renderHistoryError(
          "needsHistoryList",
          error
        );

      }

    );

}


/* =========================================================
   UPDATE NEED STATISTICS
   ========================================================= */

function updateNeedStats() {

  const total =
    userNeeds.length;


  const active =
    userNeeds.filter(
      need => {

        const status =
          String(
            need.status ||
            "open"
          ).toLowerCase();


        return (

          status ===
            "open"

          ||

          status ===
            "active"

          ||

          status ===
            "aktif"

        );

      }
    ).length;


  setText(
    "totalNeeds",
    total
  );


  setText(
    "activeUserNeeds",
    active
  );


  setText(
    "tabNeedsCount",
    total
  );

}


/* =========================================================
   RENDER NEEDS HISTORY
   ========================================================= */

function renderNeedsHistory() {

  const container =
    $("needsHistoryList");


  if (
    !container
  ) {

    return;

  }


  if (
    userNeeds.length === 0
  ) {

    container.innerHTML = `

      <div class="history-empty">

        <div class="empty-icon">
          📭
        </div>

        <h3>
          Belum ada kebutuhan
        </h3>

        <p>
          Kebutuhan yang Anda posting
          akan muncul di sini.
        </p>

        <a
          href="index.html"
          class="btn btn-primary"
        >
          + Posting Kebutuhan
        </a>

      </div>

    `;

    return;

  }


  container.innerHTML =
    userNeeds.map(
      need => {

        return createNeedHistoryCard(
          need
        );

      }
    ).join(
      ""
    );

}


/* =========================================================
   CREATE NEED HISTORY CARD
   ========================================================= */

function createNeedHistoryCard(
  need
) {

  const status =
    getStatus(
      need.status
    );


  const title =
    escapeHTML(
      need.title ||
      "Tanpa judul"
    );


  const description =
    escapeHTML(
      truncate(
        need.description ||
        "",
        150
      )
    );


  return `

    <article class="history-card">

      <div class="history-card-top">

        <div>

          <span
            class="history-category"
          >
            ${escapeHTML(
              getCategory(
                need.category
              )
            )}
          </span>


          <h3>
            ${title}
          </h3>

        </div>


        <span
          class="status-badge status-${status.className}"
        >
          ${status.icon}
          ${status.label}
        </span>

      </div>


      <p class="history-description">
        ${description}
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


    </article>

  `;

}


/* =========================================================
   LOAD USER OFFERS
   ========================================================= */

function loadUserOffers() {

  if (
    !currentUser
  ) {

    return;

  }


  /*
   * collectionGroup membaca semua:
   *
   * needs/{needId}/offers/{offerId}
   */

  const offersQuery =
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


  unsubscribeOffers =
    onSnapshot(

      offersQuery,

      async snapshot => {

        const offers =
          [];


        snapshot.forEach(
          item => {

            offers.push({

              id:
                item.id,

              needId:
                item.ref.parent.parent.id,

              ...item.data()

            });

          }
        );


        /*
         * Urutkan terbaru
         */

        offers.sort(
          (a, b) => {

            return (
              getTimestamp(
                b.createdAt
              )
              -
              getTimestamp(
                a.createdAt
              )
            );

          }
        );


        userOffers =
          offers;


        /*
         * Update statistik
         */

        updateOfferStats();


        /*
         * Render awal
         */

        await renderOffersHistory();

      },

      error => {

        console.error(
          "Gagal membaca offers:",
          error
        );


        /*
         * Jika collectionGroup ditolak
         * oleh Rules, tampilkan info.
         */

        renderHistoryError(
          "offersHistoryList",
          error
        );

      }

    );

}


/* =========================================================
   UPDATE OFFER STATISTICS
   ========================================================= */

function updateOfferStats() {

  const total =
    userOffers.length;


  const accepted =
    userOffers.filter(
      offer => {

        const status =
          String(
            offer.status ||
            ""
          ).toLowerCase();


        return (

          status ===
            "accepted"

          ||

          status ===
            "accepted_offer"

          ||

          status ===
            "diterima"

        );

      }
    ).length;


  setText(
    "totalOffers",
    total
  );


  setText(
    "acceptedOffers",
    accepted
  );


  setText(
    "tabOffersCount",
    total
  );

}


/* =========================================================
   RENDER OFFERS HISTORY
   ========================================================= */

async function renderOffersHistory() {

  const container =
    $("offersHistoryList");


  if (
    !container
  ) {

    return;

  }


  if (
    userOffers.length === 0
  ) {

    container.innerHTML = `

      <div class="history-empty">

        <div class="empty-icon">
          💰
        </div>

        <h3>
          Belum ada penawaran
        </h3>

        <p>
          Penawaran yang Anda kirim
          akan muncul di sini.
        </p>

        <a
          href="index.html#needs"
          class="btn btn-primary"
        >
          🔥 Lihat Kebutuhan
        </a>

      </div>

    `;

    return;

  }


  container.innerHTML =
    `<div class="history-loading">
      <div class="loading-spinner"></div>
      Memuat detail kebutuhan...
    </div>`;


  const cards =
    await Promise.all(

      userOffers.map(
        async offer => {

          let need =
            null;


          try {

            const needRef =
              doc(
                db,
                "needs",
                offer.needId
              );


            const needSnapshot =
              await getDoc(
                needRef
              );


            if (
              needSnapshot.exists()
            ) {

              need =
                needSnapshot.data();

            }

          } catch (error) {

            console.error(
              "Gagal membaca kebutuhan offer:",
              error
            );

          }


          return createOfferHistoryCard(
            offer,
            need
          );

        }
      )

    );


  container.innerHTML =
    cards.join(
      ""
    );

}


/* =========================================================
   CREATE OFFER HISTORY CARD
   ========================================================= */

function createOfferHistoryCard(
  offer,
  need
) {

  const status =
    getOfferStatus(
      offer.status
    );


  const needTitle =
    escapeHTML(
      need?.title ||
      "Kebutuhan"
    );


  const message =
    escapeHTML(
      truncate(
        offer.message ||
        "",
        150
      )
    );


  const duration =
    escapeHTML(
      offer.duration ||
      "Tidak disebutkan"
    );


  return `

    <article class="history-card offer-history-card">

      <div class="history-card-top">

        <div>

          <span class="history-category">
            PENAWARAN
          </span>


          <h3>
            ${needTitle}
          </h3>

        </div>


        <span
          class="status-badge status-${status.className}"
        >
          ${status.icon}
          ${status.label}
        </span>

      </div>


      ${message
        ? `
          <p class="history-description">
            ${message}
          </p>
        `
        : ""
      }


      <div class="history-meta">

        <span>
          💰 Rp ${formatMoney(
            offer.price
          )}
        </span>


        <span>
          ⏱️ ${duration}
        </span>


        <span>
          📅 ${formatDate(
            offer.createdAt
          )}
        </span>

      </div>


    </article>

  `;

}


/* =========================================================
   LOAD RATINGS
   ========================================================= */

async function loadRatings() {

  if (
    !currentUser
  ) {

    return;

  }


  try {

    /*
     * Struktur:
     *
     * ratings/{ratingId}
     *
     * ratedUserId
     * rating
     */

    const ratingsQuery =
      query(

        collection(
          db,
          "ratings"
        ),

        where(
          "ratedUserId",
          "==",
          currentUser.uid
        )

      );


    const snapshot =
      await getDocs(
        ratingsQuery
      );


    const counts = {

      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0

    };


    let total =
      0;

    let sum =
      0;


    snapshot.forEach(
      item => {

        const data =
          item.data();


        const rating =
          Number(
            data.rating
          );


        if (
          rating >= 1 &&
          rating <= 5
        ) {

          counts[
            rating
          ]++;


          total++;


          sum +=
            rating;

        }

      }
    );


    const average =
      total > 0
        ? sum / total
        : 0;


    updateRatingUI(
      average,
      total,
      counts
    );


  } catch (error) {

    console.error(
      "Gagal membaca rating:",
      error
    );


    updateRatingUI(
      0,
      0,
      {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      }
    );

  }

}


/* =========================================================
   UPDATE RATING UI
   ========================================================= */

function updateRatingUI(
  average,
  total,
  counts
) {

  const averageText =
    Number(
      average
    ).toFixed(
      1
    );


  setText(
    "profileRating",
    averageText
  );

  setText(
    "ratingAverage",
    averageText
  );

  setText(
    "ratingCount",
    total
  );

  setText(
    "ratingTotal",
    total
  );


  /*
   * Stars
   */

  setText(
    "ratingStars",
    createStars(
      average
    )
  );


  /*
   * Breakdown
   */

  for (
    let star = 1;
    star <= 5;
    star++
  ) {

    const count =
      counts[
        star
      ] || 0;


    const percentage =
      total > 0
        ? (
            count / total
          ) * 100
        : 0;


    setText(
      `ratingCount${star}`,
      count
    );


    const bar =
      $(
        `ratingBar${star}`
      );


    if (
      bar
    ) {

      bar.style.width =
        `${percentage}%`;

    }

  }

}


/* =========================================================
   CREATE STARS
   ========================================================= */

function createStars(
  average
) {

  let stars =
    "";


  const rounded =
    Math.round(
      Number(
        average
      )
    );


  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    stars +=
      i <= rounded
        ? "★"
        : "☆";

  }


  return stars;

}


/* =========================================================
   HISTORY TABS
   ========================================================= */

function connectHistoryTabs() {

  const tabs =
    document.querySelectorAll(
      ".history-tab"
    );


  tabs.forEach(
    tab => {

      tab.addEventListener(
        "click",
        () => {

          const selected =
            tab.dataset.tab;


          /*
           * Update tab
           */

          tabs.forEach(
            item => {

              item.classList.remove(
                "active"
              );

            }
          );


          tab.classList.add(
            "active"
          );


          /*
           * Update panel
           */

          const needsPanel =
            $("needsHistoryPanel");

          const offersPanel =
            $("offersHistoryPanel");


          if (
            selected ===
            "needs"
          ) {

            needsPanel?.classList.add(
              "active"
            );

            offersPanel?.classList.remove(
              "active"
            );

          }


          if (
            selected ===
            "offers"
          ) {

            offersPanel?.classList.add(
              "active"
            );

            needsPanel?.classList.remove(
              "active"
            );

          }

        }
      );

    }
  );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function connectLogout() {

  const buttons =
    document.querySelectorAll(
      "#logoutBtn"
    );


  buttons.forEach(
    button => {

      button.addEventListener(
        "click",
        async () => {

          try {

            await signOut(
              auth
            );


            window.location.href =
              "login.html";


          } catch (error) {

            console.error(
              "Gagal logout:",
              error
            );


            alert(
              "Gagal keluar: " +
              error.message
            );

          }

        }
      );

    }
  );

}


/* =========================================================
   STATUS NEED
   ========================================================= */

function getStatus(
  value
) {

  const status =
    String(
      value ||
      "open"
    ).toLowerCase();


  if (
    status === "open" ||
    status === "active" ||
    status === "aktif"
  ) {

    return {

      className:
        "open",

      icon:
        "🔥",

      label:
        "Aktif"

    };

  }


  if (
    status === "completed" ||
    status === "selesai"
  ) {

    return {

      className:
        "completed",

      icon:
        "✓",

      label:
        "Selesai"

    };

  }


  if (
    status === "closed" ||
    status === "closed_need" ||
    status === "ditutup"
  ) {

    return {

      className:
        "closed",

      icon:
        "🔒",

      label:
        "Ditutup"

    };

  }


  return {

    className:
      "other",

    icon:
      "•",

    label:
      value ||
      "Aktif"

  };

}


/* =========================================================
   STATUS OFFER
   ========================================================= */

function getOfferStatus(
  value
) {

  const status =
    String(
      value ||
      "pending"
    ).toLowerCase();


  if (
    status === "pending" ||
    status === "menunggu"
  ) {

    return {

      className:
        "pending",

      icon:
        "⏳",

      label:
        "Menunggu"

    };

  }


  if (
    status === "accepted" ||
    status === "diterima"
  ) {

    return {

      className:
        "accepted",

      icon:
        "🤝",

      label:
        "Diterima"

    };

  }


  if (
    status === "rejected" ||
    status === "ditolak"
  ) {

    return {

      className:
        "rejected",

      icon:
        "✕",

      label:
        "Ditolak"

    };

  }


  return {

    className:
      "pending",

    icon:
      "⏳",

    label:
      "Menunggu"

  };

}


/* =========================================================
   CATEGORY
   ========================================================= */

function getCategory(
  category
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
    categories[
      category
    ] ||
    category ||
    "📦 Lainnya"
  );

}


/* =========================================================
   FORMAT MONEY
   ========================================================= */

function formatMoney(
  value
) {

  const number =
    Number(
      value
    ) || 0;


  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    number
  );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
  timestamp
) {

  const value =
    getTimestamp(
      timestamp
    );


  if (
    !value
  ) {

    return "Baru saja";

  }


  try {

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
      new Date(
        value
      )
    );

  } catch {

    return "Baru saja";

  }

}


/* =========================================================
   GET TIMESTAMP
   ========================================================= */

function getTimestamp(
  timestamp
) {

  if (
    !timestamp
  ) {

    return 0;

  }


  if (
    typeof timestamp.toMillis ===
    "function"
  ) {

    return timestamp.toMillis();

  }


  if (
    timestamp.seconds
  ) {

    return (
      Number(
        timestamp.seconds
      ) * 1000
    );

  }


  if (
    timestamp instanceof Date
  ) {

    return timestamp.getTime();

  }


  if (
    typeof timestamp ===
    "number"
  ) {

    return timestamp;

  }


  return 0;

}


/* =========================================================
   TRUNCATE
   ========================================================= */

function truncate(
  text,
  max
) {

  const value =
    String(
      text ||
      ""
    );


  if (
    value.length <= max
  ) {

    return value;

  }


  return (
    value.slice(
      0,
      max
    ) +
    "..."
  );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

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


/* =========================================================
   CREATE AVATAR
   ========================================================= */

function createAvatar(
  name
) {

  const initial =
    (
      name ||
      "U"
    )
    .charAt(
      0
    )
    .toUpperCase();


  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(
      initial
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    $(id);


  if (
    element
  ) {

    element.textContent =
      value ??
      "";

  }

}


/* =========================================================
   SET IMAGE
   ========================================================= */

function setImage(
  id,
  src
) {

  const element =
    $(id);


  if (
    element
  ) {

    element.src =
      src ||
      createAvatar(
        "U"
      );

  }

}


/* =========================================================
   HISTORY ERROR
   ========================================================= */

function renderHistoryError(
  containerId,
  error
) {

  const container =
    $(
      containerId
    );


  if (
    !container
  ) {

    return;

  }


  container.innerHTML = `

    <div class="history-empty">

      <div class="empty-icon">
        ⚠️
      </div>

      <h3>
        Gagal memuat data
      </h3>

      <p>
        ${escapeHTML(
          error.message
        )}
      </p>

    </div>

  `;

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    connectHistoryTabs();

    connectLogout();

  }
);


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (
      unsubscribeNeeds
    ) {

      unsubscribeNeeds();

    }


    if (
      unsubscribeOffers
    ) {

      unsubscribeOffers();

    }

  }
);
