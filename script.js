/* =========================================================
   BUTUH - SCRIPT.JS
   INDEX VERSION
   ========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  collectionGroup,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE
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
   GLOBAL
   ========================================================= */

let currentUser =
  null;

let allNeeds =
  [];

let unsubscribeNeeds =
  null;

let unsubscribeOffers =
  null;

let selectedNeed =
  null;

let submittingNeed =
  false;

let submittingOffer =
  false;


/* =========================================================
   DOM HELPER
   ========================================================= */

const $ =
  id =>
    document.getElementById(
      id
    );


/* =========================================================
   AUTH
   ========================================================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user;


    updateUserUI(
      user
    );


    loadNeeds();


    if (
      user
    ) {

      loadUserOfferCount(
        user.uid
      );

    } else {

      setText(
        "userNeedsCount",
        "0"
      );

      setText(
        "userOffersCount",
        "0"
      );

    }

  }
);


/* =========================================================
   USER UI
   ========================================================= */

function updateUserUI(
  user
) {

  const guest =
    $("headerGuest");

  const logged =
    $("headerLogged");


  if (
    !user
  ) {

    guest?.classList.remove(
      "hidden"
    );

    logged?.classList.add(
      "hidden"
    );

    return;

  }


  guest?.classList.add(
    "hidden"
  );

  logged?.classList.remove(
    "hidden"
  );


  const name =
    user.displayName ||
    "Pengguna";


  const email =
    user.email ||
    "";


  const photo =
    user.photoURL ||
    avatar(
      name
    );


  setImage(
    "userPhoto",
    photo
  );

  setImage(
    "menuUserPhoto",
    photo
  );


  setText(
    "userName",
    name
  );

  setText(
    "userEmail",
    email
  );

  setText(
    "menuUserName",
    name
  );

  setText(
    "menuUserEmail",
    email
  );

}


/* =========================================================
   LOAD NEEDS
   ========================================================= */

function loadNeeds() {

  const container =
    $("needsList");


  if (
    !container
  ) {

    return;

  }


  if (
    unsubscribeNeeds
  ) {

    unsubscribeNeeds();

  }


  container.innerHTML = `

    <div class="loading-box">

      <div class="loading-spinner"></div>

      <strong>
        Memuat kebutuhan...
      </strong>

      <small>
        Menghubungkan ke Firestore
      </small>

    </div>

  `;


  const needsRef =
    collection(
      db,
      "needs"
    );


  /*
   * Tidak menggunakan where status
   * supaya kebutuhan lama tetap dapat
   * terbaca.
   */

  const q =
    query(
      needsRef,
      orderBy(
        "createdAt",
        "desc"
      )
    );


  unsubscribeNeeds =
    onSnapshot(

      q,

      snapshot => {

        allNeeds =
          [];


        snapshot.forEach(
          item => {

            const data =
              item.data();


            /*
             * Kebutuhan yang aktif.
             */

            if (
              data.status ===
                "completed" ||
              data.status ===
                "cancelled"
            ) {

              return;

            }


            allNeeds.push({

              id:
                item.id,

              ...data

            });

          }
        );


        renderNeeds();


        updateStatistics();

      },

      error => {

        console.error(
          "Firestore needs error:",
          error
        );


        container.innerHTML = `

          <div class="error-box">

            <div>
              ⚠️
            </div>

            <strong>
              Gagal memuat kebutuhan
            </strong>

            <small>
              ${escapeHTML(
                error.message
              )}
            </small>

          </div>

        `;

      }

    );

}


/* =========================================================
   RENDER NEEDS
   ========================================================= */

function renderNeeds() {

  const container =
    $("needsList");


  if (
    !container
  ) {

    return;

  }


  const search =
    (
      $("searchInput")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const category =
    $("categoryFilter")?.value ||
    "all";


  const filtered =
    allNeeds.filter(
      need => {

        const title =
          String(
            need.title ||
            ""
          )
            .toLowerCase();


        const description =
          String(
            need.description ||
            ""
          )
            .toLowerCase();


        const matchesSearch =
          !search ||
          title.includes(
            search
          ) ||
          description.includes(
            search
          );


        const matchesCategory =
          category ===
            "all" ||
          need.category ===
            category;


        return (
          matchesSearch &&
          matchesCategory
        );

      }
    );


  if (
    filtered.length ===
    0
  ) {

    container.innerHTML = `

      <div class="empty-box">

        <div class="empty-icon">
          📭
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <small>
          ${
            search
              ? "Tidak ada kebutuhan yang cocok dengan pencarian."
              : "Jadilah yang pertama memposting kebutuhan."
          }
        </small>

      </div>

    `;

    return;

  }


  container.innerHTML =
    filtered
      .map(
        createNeedCard
      )
      .join(
        ""
      );

}


/* =========================================================
   NEED CARD
   ========================================================= */

function createNeedCard(
  need
) {

  const title =
    escapeHTML(
      need.title ||
      "Tanpa judul"
    );


  const description =
    escapeHTML(
      truncate(
        need.description ||
        "Tidak ada deskripsi.",
        180
      )
    );


  const budget =
    formatMoney(
      need.budget
    );


  const category =
    getCategory(
      need.category
    );


  const ownerName =
    escapeHTML(
      need.ownerName ||
      "Pengguna"
    );


  const ownerPhoto =
    need.ownerPhoto ||
    avatar(
      need.ownerName
    );


  const location =
    [
      need.city,
      need.province
    ]
      .filter(Boolean)
      .join(
        ", "
      );


  const owner =
    currentUser &&
    need.ownerId ===
      currentUser.uid;


  return `

    <article class="need-card">

      <div class="need-card-top">

        <div class="need-category">
          ${escapeHTML(
            category
          )}
        </div>


        <span class="status-pill">
          🟢 Aktif
        </span>

      </div>


      <h3>
        ${title}
      </h3>


      <p class="need-description">
        ${description}
      </p>


      <div class="need-budget">

        <span>
          Budget
        </span>

        <strong>
          Rp ${budget}
        </strong>

      </div>


      <div class="need-meta">

        ${
          location
            ? `
              <span>
                📍 ${escapeHTML(
                  location
                )}
              </span>
            `
            : ""
        }


        ${
          need.location
            ? `
              <span>
                🏠 ${escapeHTML(
                  need.location
                )}
              </span>
            `
            : ""
        }


        <span>
          📅 ${formatDate(
            need.createdAt
          )}
        </span>

      </div>


      <div class="need-owner">

        <img
          src="${escapeAttribute(
            ownerPhoto
          )}"
          alt=""
          referrerpolicy="no-referrer"
        >


        <div>

          <small>
            Diposting oleh
          </small>

          <strong>
            ${ownerName}
          </strong>

        </div>

      </div>


      <div class="need-actions">

        <button
          class="btn btn-outline"
          type="button"
          data-detail-id="${escapeAttribute(
            need.id
          )}"
        >
          👁 Detail
        </button>


        ${
          owner
            ? `
              <button
                class="btn btn-secondary"
                type="button"
                disabled
              >
                👤 Kebutuhan Saya
              </button>
            `
            : `
              <button
                class="btn btn-primary"
                type="button"
                data-offer-id="${escapeAttribute(
                  need.id
                )}"
              >
                💰 Saya Bisa
              </button>
            `
        }

      </div>

    </article>

  `;

}


/* =========================================================
   CARD CLICK DELEGATION
   ========================================================= */

$("needsList")
  ?.addEventListener(
    "click",
    event => {

      const detailButton =
        event.target.closest(
          "[data-detail-id]"
        );


      const offerButton =
        event.target.closest(
          "[data-offer-id]"
        );


      if (
        detailButton
      ) {

        const id =
          detailButton.dataset.detailId;


        const need =
          allNeeds.find(
            item =>
              item.id ===
              id
          );


        if (
          need
        ) {

          showNeedDetail(
            need
          );

        }

      }


      if (
        offerButton
      ) {

        const id =
          offerButton.dataset.offerId;


        const need =
          allNeeds.find(
            item =>
              item.id ===
              id
          );


        if (
          need
        ) {

          openOfferModal(
            need
          );

        }

      }

    }
  );


/* =========================================================
   NEED DETAIL
   ========================================================= */

function showNeedDetail(
  need
) {

  const owner =
    currentUser &&
    need.ownerId ===
      currentUser.uid;


  const modal =
    createSimpleModal(
      "detailModal"
    );


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      data-close-detail
    ></div>


    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            DETAIL KEBUTUHAN
          </span>

          <h2>
            ${escapeHTML(
              need.title ||
              "Kebutuhan"
            )}
          </h2>

        </div>


        <button
          class="modal-close"
          data-close-detail
          type="button"
        >
          ×
        </button>

      </div>


      <div class="detail-content">

        <div class="detail-category">
          ${escapeHTML(
            getCategory(
              need.category
            )
          )}
        </div>


        <p class="detail-description">
          ${escapeHTML(
            need.description ||
            "Tidak ada deskripsi."
          )}
        </p>


        <div class="detail-budget">

          <small>
            Budget
          </small>

          <strong>
            Rp ${formatMoney(
              need.budget
            )}
          </strong>

        </div>


        <div class="detail-grid">

          <div>

            <small>
              Lokasi
            </small>

            <strong>
              ${
                escapeHTML(
                  [
                    need.city,
                    need.province
                  ]
                    .filter(Boolean)
                    .join(
                      ", "
                    ) ||
                  "-"
                )
              }
            </strong>

          </div>


          <div>

            <small>
              Diposting
            </small>

            <strong>
              ${formatDate(
                need.createdAt
              )}
            </strong>

          </div>

        </div>


        ${
          owner
            ? `
              <div class="owner-note">
                👤 Ini adalah kebutuhan yang
                Anda posting.
              </div>
            `
            : `
              <button
                id="detailOfferBtn"
                class="btn btn-primary btn-large full-width"
                type="button"
              >
                💰 Saya Bisa Membantu
              </button>
            `
        }

      </div>

    </div>

  `;


  modal.classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "modal-open"
  );


  modal
    .querySelectorAll(
      "[data-close-detail]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            closeModal(
              "detailModal"
            );

          }
        );

      }
    );


  if (
    !owner
  ) {

    $("detailOfferBtn")
      ?.addEventListener(
        "click",
        () => {

          closeModal(
            "detailModal"
          );

          openOfferModal(
            need
          );

        }
      );

  }

}


/* =========================================================
   OFFER MODAL
   ========================================================= */

function openOfferModal(
  need
) {

  if (
    !currentUser
  ) {

    showToast(
      "Silakan login dengan Google terlebih dahulu."
    );


    setTimeout(
      () => {

        window.location.href =
          "login.html";

      },
      800
    );


    return;

  }


  if (
    need.ownerId ===
    currentUser.uid
  ) {

    showToast(
      "Anda tidak dapat menawarkan pada kebutuhan sendiri."
    );

    return;

  }


  selectedNeed =
    need;


  $("offerNeedId").value =
    need.id;


  $("offerNeedTitle").textContent =
    need.title ||
    "Kebutuhan";


  $("offerPrice").value =
    "";


  $("offerDuration").value =
    "";


  $("offerMessage").value =
    "";


  openModal(
    "offerModal"
  );

}


/* =========================================================
   POST MODAL
   ========================================================= */

function openNeedModal() {

  if (
    !currentUser
  ) {

    showToast(
      "Silakan login dengan Google terlebih dahulu."
    );


    setTimeout(
      () => {

        window.location.href =
          "login.html";

      },
      700
    );


    return;

  }


  $("needForm")
    ?.reset();


  openModal(
    "needModal"
  );

}


function openModal(
  id
) {

  const modal =
    $(id);


  if (
    !modal
  ) {

    return;

  }


  modal.classList.remove(
    "hidden"
  );


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "modal-open"
  );

}


function closeModal(
  id
) {

  const modal =
    $(id);


  if (
    !modal
  ) {

    return;

  }


  modal.classList.add(
    "hidden"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  if (
    !document.querySelector(
      ".modal:not(.hidden)"
    )
  ) {

    document.body.classList.remove(
      "modal-open"
    );

  }

}


/* =========================================================
   CREATE DYNAMIC MODAL
   ========================================================= */

function createSimpleModal(
  id
) {

  let modal =
    $(id);


  if (
    !modal
  ) {

    modal =
      document.createElement(
        "div"
      );


    modal.id =
      id;


    modal.className =
      "modal hidden";


    document.body.appendChild(
      modal
    );

  }


  return modal;

}


/* =========================================================
   POST NEED
   ========================================================= */

$("needForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        submittingNeed
      ) {

        return;

      }


      if (
        !currentUser
      ) {

        showToast(
          "Silakan login terlebih dahulu."
        );

        return;

      }


      const title =
        $("needTitle")
          .value
          .trim();


      const category =
        $("needCategory")
          .value;


      const description =
        $("needDescription")
          .value
          .trim();


      const budget =
        Number(
          $("needBudget")
            .value
        );


      const duration =
        Number(
          $("needDuration")
            .value
        ) || 24;


      const province =
        $("needProvince")
          .value
          .trim();


      const city =
        $("needCity")
          .value
          .trim();


      const location =
        $("needLocation")
          .value
          .trim();


      if (
        !title ||
        !description
      ) {

        showToast(
          "Lengkapi judul dan deskripsi."
        );

        return;

      }


      if (
        !Number.isFinite(
          budget
        ) ||
        budget <= 0
      ) {

        showToast(
          "Budget harus lebih dari 0."
        );

        return;

      }


      const button =
        $("submitNeed");


      try {

        submittingNeed =
          true;


        button.disabled =
          true;


        button.innerHTML = `

          <span class="button-spinner"></span>

          Menyimpan...

        `;


        const now =
          Date.now();


        const expiresAt =
          now +
          duration *
          60 *
          60 *
          1000;


        /*
         * Tutup popup SEBELUM proses Firestore.
         */

        closeModal(
          "needModal"
        );


        showToast(
          "⏳ Kebutuhan sedang diposting..."
        );


        /*
         * Simpan ke Firestore.
         */

        await addDoc(
          collection(
            db,
            "needs"
          ),
          {

            title,

            category,

            description,

            budget,

            province,

            city,

            location,

            ownerId:
              currentUser.uid,

            ownerName:
              currentUser.displayName ||
              "Pengguna",

            ownerEmail:
              currentUser.email ||
              "",

            ownerPhoto:
              currentUser.photoURL ||
              "",

            createdAt:
              serverTimestamp(),

            createdAtMs:
              now,

            expiresAt,

            status:
              "active"

          }
        );


        $("needForm")
          .reset();


        showToast(
          "✅ Kebutuhan berhasil diposting!"
        );


      } catch (
        error
      ) {

        console.error(
          "POST NEED ERROR:",
          error
        );


        showToast(
          "❌ Gagal menyimpan: " +
          error.message
        );


      } finally {

        submittingNeed =
          false;


        button.disabled =
          false;


        button.innerHTML =
          "🚀 Posting Kebutuhan";

      }

    }
  );


/* =========================================================
   OFFER SUBMIT
   ========================================================= */

$("offerForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        submittingOffer
      ) {

        return;

      }


      if (
        !currentUser
      ) {

        showToast(
          "Silakan login terlebih dahulu."
        );

        return;

      }


      if (
        !selectedNeed
      ) {

        showToast(
          "Kebutuhan tidak ditemukan."
        );

        return;

      }


      const priceRaw =
        $("offerPrice")
          .value
          .trim();


      /*
       * FIX:
       * Jangan memakai parseInt pada string
       * yang kosong / format tidak valid.
       */

      const price =
        Number(
          priceRaw
        );


      const duration =
        $("offerDuration")
          .value
          .trim();


      const message =
        $("offerMessage")
          .value
          .trim();


      if (
        priceRaw === "" ||
        !Number.isFinite(
          price
        ) ||
        price <= 0
      ) {

        showToast(
          "Masukkan harga penawaran yang valid."
        );

        $("offerPrice")
          .focus();

        return;

      }


      if (
        !duration
      ) {

        showToast(
          "Masukkan estimasi pengerjaan."
        );

        $("offerDuration")
          .focus();

        return;

      }


      const button =
        $("submitOffer");


      try {

        submittingOffer =
          true;


        button.disabled =
          true;


        button.innerHTML = `

          <span class="button-spinner"></span>

          Mengirim...

        `;


        await addDoc(

          collection(
            db,
            "needs",
            selectedNeed.id,
            "offers"
          ),

          {

            needId:
              selectedNeed.id,

            providerId:
              currentUser.uid,

            providerName:
              currentUser.displayName ||
              "Pengguna",

            providerEmail:
              currentUser.email ||
              "",

            providerPhoto:
              currentUser.photoURL ||
              "",

            price,

            duration,

            message,

            status:
              "pending",

            createdAt:
              serverTimestamp(),

            createdAtMs:
              Date.now()

          }

        );


        closeModal(
          "offerModal"
        );


        showToast(
          "✅ Penawaran berhasil dikirim!"
        );


      } catch (
        error
      ) {

        console.error(
          "OFFER ERROR:",
          error
        );


        showToast(
          "❌ Gagal mengirim penawaran: " +
          error.message
        );


      } finally {

        submittingOffer =
          false;


        button.disabled =
          false;


        button.innerHTML =
          "💰 Kirim Penawaran";

      }

    }
  );


/* =========================================================
   USER OFFER COUNT
   ========================================================= */

function loadUserOfferCount(
  uid
) {

  if (
    unsubscribeOffers
  ) {

    unsubscribeOffers();

  }


  try {

    const offers =
      collectionGroup(
        db,
        "offers"
      );


    const q =
      query(
        offers,
        where(
          "providerId",
          "==",
          uid
        )
      );


    unsubscribeOffers =
      onSnapshot(
        q,
        snapshot => {

          setText(
            "userOffersCount",
            snapshot.size
          );

        },
        error => {

          console.warn(
            "Offer count:",
            error
          );


          setText(
            "userOffersCount",
            "0"
          );

        }
      );

  } catch (
    error
  ) {

    console.warn(
      error
    );

  }

}


/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics() {

  const active =
    allNeeds.length;


  setText(
    "activeNeedsCount",
    active
  );


  if (
    !currentUser
  ) {

    setText(
      "userNeedsCount",
      "0"
    );

    return;

  }


  const mine =
    allNeeds.filter(
      need =>
        need.ownerId ===
        currentUser.uid
    );


  setText(
    "userNeedsCount",
    mine.length
  );

}


/* =========================================================
   SEARCH
   ========================================================= */

$("searchInput")
  ?.addEventListener(
    "input",
    renderNeeds
  );


$("categoryFilter")
  ?.addEventListener(
    "change",
    renderNeeds
  );


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

$("headerPostBtn")
  ?.addEventListener(
    "click",
    openNeedModal
  );


$("heroPostBtn")
  ?.addEventListener(
    "click",
    openNeedModal
  );


$("sectionPostBtn")
  ?.addEventListener(
    "click",
    openNeedModal
  );


$("mobilePostBtn")
  ?.addEventListener(
    "click",
    openNeedModal
  );


$("closeNeedModal")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        "needModal"
      )
  );


$("needBackdrop")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        "needModal"
      )
  );


$("cancelNeed")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        "needModal"
      )
  );


$("closeOfferModal")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        "offerModal"
      )
  );


$("offerBackdrop")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        "offerModal"
      )
  );


$("cancelOffer")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        "offerModal"
      )
  );


/* =========================================================
   PROFILE MENU
   ========================================================= */

$("profileButton")
  ?.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      $("profileMenu")
        ?.classList.toggle(
          "hidden"
        );

    }
  );


document.addEventListener(
  "click",
  event => {

    const menu =
      $("profileMenu");


    const button =
      $("profileButton");


    if (
      menu &&
      !menu.contains(
        event.target
      ) &&
      button &&
      !button.contains(
        event.target
      )
    ) {

      menu.classList.add(
        "hidden"
      );

    }

  }
);


/* =========================================================
   PROFILE
   ========================================================= */

$("profilePageBtn")
  ?.addEventListener(
    "click",
    () => {

      window.location.href =
        "profile.html";

    }
  );


/* =========================================================
   LOGOUT
   ========================================================= */

$("logoutBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );


        showToast(
          "Anda berhasil keluar."
        );


        setTimeout(
          () => {

            window.location.reload();

          },
          500
        );

      } catch (
        error
      ) {

        alert(
          "Gagal keluar: " +
          error.message
        );

      }

    }
  );


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {

      return;

    }


    closeModal(
      "needModal"
    );


    closeModal(
      "offerModal"
    );


    closeModal(
      "detailModal"
    );

  }
);


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message
) {

  const toast =
    $("toast");


  if (
    !toast
  ) {

    return;

  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toast._timer
  );


  toast._timer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3000
    );

}


/* =========================================================
   CATEGORY
   ========================================================= */

function getCategory(
  category
) {

  const map = {

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
    map[
      category
    ] ||
    category ||
    "📦 Lainnya"
  );

}


/* =========================================================
   MONEY
   ========================================================= */

function formatMoney(
  value
) {

  const number =
    Number(
      value
    );


  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    Number.isFinite(
      number
    )
      ? number
      : 0
  );

}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
  value
) {

  if (
    !value
  ) {

    return "Baru saja";

  }


  let date;


  try {

    if (
      typeof value.toDate ===
      "function"
    ) {

      date =
        value.toDate();

    } else if (
      typeof value.toMillis ===
      "function"
    ) {

      date =
        new Date(
          value.toMillis()
        );

    } else if (
      value.seconds
    ) {

      date =
        new Date(
          value.seconds *
          1000
        );

    } else {

      date =
        new Date(
          value
        );

    }

  } catch (
    error
  ) {

    return "Baru saja";

  }


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

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
    date
  );

}


/* =========================================================
   TRUNCATE
   ========================================================= */

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


/* =========================================================
   AVATAR
   ========================================================= */

function avatar(
  name
) {

  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(
      name ||
      "U"
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


/* =========================================================
   IMAGE
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
      src;

  }

}


/* =========================================================
   TEXT
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
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}


/* =========================================================
   DYNAMIC MODAL CLOSE
   ========================================================= */

window.closeModal =
  closeModal;


/* =========================================================
   END
   ========================================================= */
