// ============================================================
// SCRIPT.JS
// BUTUH - Marketplace Kebutuhan
// Firebase v12.1.0
// VERSI CEPAT
// ============================================================

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
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp
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
// INIT
// ============================================================

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let unsubscribeNeeds = null;

let isSubmittingNeed = false;

let isSubmittingOffer = false;

let needsCache = [];


// ============================================================
// HELPER
// ============================================================

const $ = id =>
  document.getElementById(id);


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
  auth,
  user => {

    currentUser = user;

    updateUserUI(user);

    if (user) {

      loadNeeds();

    } else {

      if (unsubscribeNeeds) {

        unsubscribeNeeds();

        unsubscribeNeeds = null;

      }

      showLoggedOut();

    }

  }
);


// ============================================================
// USER UI
// ============================================================

function updateUserUI(user) {

  const name =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Pengguna";

  const email =
    user?.email ||
    "";

  const photo =
    user?.photoURL ||
    avatar(name);


  setText(
    "userName",
    name
  );

  setText(
    "menuUserName",
    name
  );

  setText(
    "userEmail",
    email
  );

  setText(
    "menuUserEmail",
    email
  );


  setImage(
    "userPhoto",
    photo
  );

  setImage(
    "menuUserPhoto",
    photo
  );

}


// ============================================================
// LOAD NEEDS
// ============================================================

function loadNeeds() {

  const container =
    $("needsList");

  if (!container) {
    return;
  }


  if (unsubscribeNeeds) {

    unsubscribeNeeds();

  }


  /*
    TIDAK memakai orderBy().

    Keuntungan:

    - tidak membutuhkan composite index
    - query sederhana
    - lebih cepat
  */

  const needsRef =
    collection(
      db,
      "needs"
    );


  unsubscribeNeeds =
    onSnapshot(

      needsRef,

      snapshot => {

        const needs = [];


        snapshot.forEach(
          item => {

            needs.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        /*
          Sort di browser.
        */

        needs.sort(
          (a, b) => {

            return (
              getTime(
                b.createdAt
              ) -
              getTime(
                a.createdAt
              )
            );

          }
        );


        needsCache =
          needs;


        /*
          LANGSUNG TAMPILKAN.
        */

        renderNeeds(
          needs
        );


        /*
          LANGSUNG UPDATE
          COUNTER DASAR.
        */

        updateBasicCounters(
          needs
        );


        /*
          Hitung offers di belakang.
          Tidak menghambat render.
        */

        loadMyOfferCountFast(
          needs
        );

      },

      error => {

        console.error(
          "Firestore load error:",
          error
        );


        container.innerHTML = `

          <div class="loading-box">

            <div class="empty-icon">
              ⚠️
            </div>

            <strong>
              Gagal memuat kebutuhan
            </strong>

            <small>
              ${escapeHTML(
                error.message ||
                "Terjadi kesalahan."
              )}
            </small>

            <button
              id="retryNeedsBtn"
              class="btn btn-primary"
              style="margin-top:15px"
              type="button"
            >
              🔄 Coba Lagi
            </button>

          </div>

        `;


        $("retryNeedsBtn")
          ?.addEventListener(
            "click",
            loadNeeds
          );

      }

    );

}


// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds(
  needs
) {

  const container =
    $("needsList");

  if (!container) {
    return;
  }


  if (!needs.length) {

    container.innerHTML = `

      <div class="loading-box">

        <div class="empty-icon">
          📭
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <small>
          Jadilah yang pertama memposting kebutuhan.
        </small>

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

}


// ============================================================
// CREATE NEED CARD
// ============================================================

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
        "",
        160
      )
    );


  const category =
    escapeHTML(
      getCategory(
        need.category
      )
    );


  const budget =
    formatMoney(
      need.budget
    );


  const date =
    formatDate(
      need.createdAt
    );


  const owner =
    need.ownerId ===
    currentUser?.uid;


  const status =
    String(
      need.status ||
      "open"
    ).toLowerCase();


  const isActive =
    status === "open" ||
    status === "active" ||
    status === "aktif";


  return `

    <article
      class="need-card"
      data-id="${escapeHTML(
        need.id
      )}"
    >

      <div class="need-card-top">

        <div>

          <span class="need-category">
            ${category}
          </span>

          <h3>
            ${title}
          </h3>

        </div>


        ${
          owner
            ? `
              <span class="status-badge status-open">
                👤 Milik Anda
              </span>
            `
            : ""
        }

      </div>


      <p class="need-description">
        ${description}
      </p>


      <div class="need-footer">

        <div>

          <div class="need-budget">
            Rp ${budget}
          </div>

          <div class="need-date">
            ${date}
          </div>

        </div>


        <div>

          <button
            class="btn ${
              owner
                ? "btn-outline"
                : "btn-primary"
            }"
            type="button"
            data-action="detail"
            data-id="${escapeHTML(
              need.id
            )}"
          >

            ${
              owner
                ? "Lihat"
                : isActive
                  ? "Tawarkan"
                  : "Lihat"
            }

          </button>

        </div>

      </div>

    </article>

  `;

}


// ============================================================
// COUNTERS
// ============================================================

function updateBasicCounters(
  needs
) {

  const active =
    needs.filter(
      item => {

        const status =
          String(
            item.status ||
            "open"
          ).toLowerCase();

        return (
          status === "open" ||
          status === "active" ||
          status === "aktif"
        );

      }
    ).length;


  const mine =
    needs.filter(
      item =>
        item.ownerId ===
        currentUser?.uid
    ).length;


  setText(
    "activeNeedsCount",
    active
  );

  setText(
    "userNeedsCount",
    mine
  );

}


// ============================================================
// COUNT MY OFFERS
// ============================================================

async function loadMyOfferCountFast(
  needs
) {

  if (!currentUser) {

    setText(
      "userOffersCount",
      "0"
    );

    return;

  }


  /*
    Jangan membuat loading kebutuhan
    menunggu proses ini.
  */

  if (!needs.length) {

    setText(
      "userOffersCount",
      "0"
    );

    return;

  }


  let total = 0;


  try {

    /*
      Maksimal proses paralel.

      Struktur:

      needs/{needId}/offers
    */

    const promises =
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


            return snapshot.size;

          } catch {

            return 0;

          }

        }
      );


    const results =
      await Promise.all(
        promises
      );


    total =
      results.reduce(
        (sum, value) =>
          sum + value,
        0
      );


    setText(
      "userOffersCount",
      total
    );

  } catch (error) {

    console.warn(
      "Offer counter:",
      error
    );

    setText(
      "userOffersCount",
      "0"
    );

  }

}


// ============================================================
// POST NEED
// ============================================================

async function submitNeed(
  event
) {

  event.preventDefault();


  if (isSubmittingNeed) {
    return;
  }


  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  const form =
    event.target;


  const title =
    String(
      form.title?.value ||
      ""
    ).trim();


  const description =
    String(
      form.description?.value ||
      ""
    ).trim();


  const category =
    form.category?.value ||
    "other";


  const rawBudget =
    String(
      form.budget?.value ||
      ""
    ).trim();


  const budget =
    Number(
      rawBudget
    );


  const deadline =
    form.deadline?.value ||
    "";


  if (!title) {

    alert(
      "Judul kebutuhan wajib diisi."
    );

    return;

  }


  if (!description) {

    alert(
      "Deskripsi wajib diisi."
    );

    return;

  }


  if (
    rawBudget === "" ||
    !Number.isFinite(budget) ||
    budget <= 0
  ) {

    alert(
      "Masukkan budget yang valid."
    );

    return;

  }


  isSubmittingNeed =
    true;


  const button =
    $("submitNeed");


  const original =
    button?.innerHTML ||
    "🚀 Posting Kebutuhan";


  if (button) {

    button.disabled =
      true;

    button.innerHTML =
      "⏳ Menyimpan...";

  }


  try {

    /*
      Simpan langsung.
    */

    await addDoc(

      collection(
        db,
        "needs"
      ),

      {

        title,

        description,

        category,

        budget,

        deadline,

        ownerId:
          currentUser.uid,

        ownerName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Pengguna",

        ownerEmail:
          currentUser.email ||
          "",

        ownerPhoto:
          currentUser.photoURL ||
          "",

        status:
          "open",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }

    );


    /*
      Reset form.
    */

    form.reset();


    /*
      TUTUP MODAL
      segera setelah Firestore
      mengonfirmasi penyimpanan.
    */

    closeNeedModal();


    showToast(
      "✅ Kebutuhan berhasil diposting!"
    );


  } catch (error) {

    console.error(
      "Submit need:",
      error
    );


    alert(
      "Gagal menyimpan kebutuhan:\n\n" +
      error.message
    );

  } finally {

    isSubmittingNeed =
      false;


    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        original;

    }

  }

}


// ============================================================
// OPEN NEED DETAIL
// ============================================================

window.openNeedDetail =
  async function(
    needId
  ) {

    if (!needId) {
      return;
    }


    /*
      Cari dulu dari cache.

      Ini jauh lebih cepat daripada
      langsung request Firestore.
    */

    const cached =
      needsCache.find(
        item =>
          item.id ===
          needId
      );


    if (cached) {

      showNeedDetail(
        cached
      );

      return;

    }


    try {

      const reference =
        doc(
          db,
          "needs",
          needId
        );


      const snapshot =
        await getDoc(
          reference
        );


      if (!snapshot.exists()) {

        alert(
          "Kebutuhan tidak ditemukan."
        );

        return;

      }


      showNeedDetail({

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

  };


// ============================================================
// NEED DETAIL MODAL
// ============================================================

function showNeedDetail(
  need
) {

  let modal =
    $("detailModal");


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "detailModal";

    modal.className =
      "modal hidden";

    document.body.appendChild(
      modal
    );

  }


  const owner =
    need.ownerId ===
    currentUser?.uid;


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="detailBackdrop"
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
          id="closeDetail"
          type="button"
        >
          ×
        </button>

      </div>


      <div style="padding:22px">

        <p style="
          line-height:1.7;
          color:#374151;
        ">
          ${escapeHTML(
            need.description ||
            ""
          )}
        </p>


        <div
          style="
            background:#eff6ff;
            padding:16px;
            border-radius:12px;
            margin:20px 0;
          "
        >

          <small>
            Budget
          </small>

          <div
            style="
              font-size:24px;
              font-weight:800;
              color:#2563eb;
            "
          >
            Rp ${formatMoney(
              need.budget
            )}
          </div>

        </div>


        <div style="
          color:#4b5563;
          line-height:1.8;
        ">

          👤
          ${escapeHTML(
            need.ownerName ||
            "Pengguna"
          )}

          <br>

          📂
          ${escapeHTML(
            getCategory(
              need.category
            )
          )}

          <br>

          📅
          ${escapeHTML(
            formatDate(
              need.createdAt
            )
          )}

          ${
            need.deadline
              ? `
                <br>
                ⏰ Deadline:
                ${escapeHTML(
                  need.deadline
                )}
              `
              : ""
          }

        </div>


        ${
          owner
            ? `
              <div
                style="
                  margin-top:20px;
                  padding:14px;
                  background:#f0fdf4;
                  color:#15803d;
                  border-radius:10px;
                "
              >
                👤 Ini adalah kebutuhan Anda.
              </div>
            `
            : `
              <button
                id="detailOfferButton"
                class="btn btn-primary btn-large"
                type="button"
                style="
                  width:100%;
                  margin-top:20px;
                "
              >
                💰 Ajukan Penawaran
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


  $("closeDetail")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "detailModal"
        )
    );


  $("detailBackdrop")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "detailModal"
        )
    );


  if (!owner) {

    $("detailOfferButton")
      ?.addEventListener(
        "click",
        () => {

          closeModal(
            "detailModal"
          );


          openOfferForm(
            need
          );

        }
      );

  }

}


// ============================================================
// OFFER FORM
// ============================================================

function openOfferForm(
  need
) {

  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  let modal =
    $("offerModal");


  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "offerModal";

    modal.className =
      "modal hidden";

    document.body.appendChild(
      modal
    );

  }


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="offerBackdrop"
    ></div>


    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            PENAWARAN
          </span>

          <h2>
            💰 Ajukan Penawaran
          </h2>

          <p>
            ${escapeHTML(
              need.title ||
              "Kebutuhan"
            )}
          </p>

        </div>


        <button
          id="closeOffer"
          class="modal-close"
          type="button"
        >
          ×
        </button>

      </div>


      <form id="offerForm">

        <div class="form-group">

          <label>
            Harga Penawaran (Rp)
          </label>

          <input
            name="price"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            placeholder="300000"
            required
          >

        </div>


        <div class="form-group">

          <label>
            Lama Pengerjaan
          </label>

          <input
            name="duration"
            type="text"
            maxlength="100"
            placeholder="Contoh: 3 hari"
            required
          >

        </div>


        <div class="form-group">

          <label>
            Pesan
          </label>

          <textarea
            name="message"
            rows="5"
            maxlength="2000"
            placeholder="Jelaskan bagaimana Anda akan membantu..."
            required
          ></textarea>

        </div>


        <div class="modal-actions">

          <button
            type="button"
            id="cancelOffer"
            class="btn btn-outline"
          >
            Batal
          </button>


          <button
            type="submit"
            id="submitOffer"
            class="btn btn-primary"
          >
            💰 Kirim Penawaran
          </button>

        </div>

      </form>

    </div>

  `;


  modal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );


  $("closeOffer")
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


  $("offerBackdrop")
    ?.addEventListener(
      "click",
      () =>
        closeModal(
          "offerModal"
        )
    );


  $("offerForm")
    ?.addEventListener(
      "submit",
      event =>
        submitOffer(
          event,
          need
        )
    );

}


// ============================================================
// SUBMIT OFFER
// ============================================================

async function submitOffer(
  event,
  need
) {

  event.preventDefault();


  if (isSubmittingOffer) {
    return;
  }


  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  const form =
    event.target;


  const rawPrice =
    String(
      form.price?.value ||
      ""
    ).trim();


  const price =
    Number(
      rawPrice
    );


  const duration =
    String(
      form.duration?.value ||
      ""
    ).trim();


  const message =
    String(
      form.message?.value ||
      ""
    ).trim();


  if (
    rawPrice === "" ||
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert(
      "Masukkan harga penawaran yang valid."
    );

    return;

  }


  if (!duration) {

    alert(
      "Masukkan lama pengerjaan."
    );

    return;

  }


  if (!message) {

    alert(
      "Masukkan pesan penawaran."
    );

    return;

  }


  isSubmittingOffer =
    true;


  const button =
    $("submitOffer");


  const original =
    button?.innerHTML ||
    "💰 Kirim Penawaran";


  if (button) {

    button.disabled =
      true;

    button.innerHTML =
      "⏳ Mengirim...";

  }


  try {

    /*
      STRUKTUR:

      needs/{needId}/offers/{offerId}
    */

    await addDoc(

      collection(
        db,
        "needs",
        need.id,
        "offers"
      ),

      {

        providerId:
          currentUser.uid,

        providerName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
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

        updatedAt:
          serverTimestamp()

      }

    );


    form.reset();


    closeModal(
      "offerModal"
    );


    showToast(
      "🤝 Penawaran berhasil dikirim!"
    );


    /*
      Update counter.
    */

    const counter =
      $("userOffersCount");


    if (counter) {

      const old =
        Number(
          counter.textContent
        );


      if (
        Number.isFinite(old)
      ) {

        counter.textContent =
          String(
            old + 1
          );

      }

    }

  } catch (error) {

    console.error(
      "Submit offer:",
      error
    );


    alert(
      "Gagal mengirim penawaran:\n\n" +
      error.message
    );

  } finally {

    isSubmittingOffer =
      false;


    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        original;

    }

  }

}


// ============================================================
// NEED MODAL
// ============================================================

function openNeedModal() {

  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  const modal =
    $("needModal");


  if (!modal) {
    return;
  }


  modal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );

}


function closeNeedModal() {

  closeModal(
    "needModal"
  );

}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeModal(
  id
) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  modal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "modal-open"
  );

}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  try {

    await signOut(
      auth
    );


    window.location.href =
      "login.html";

  } catch (error) {

    console.error(
      error
    );


    alert(
      "Gagal logout:\n" +
      error.message
    );

  }

}


// ============================================================
// PROFILE
// ============================================================

function openProfile() {

  window.location.href =
    "profile.html";

}


// ============================================================
// TEXT
// ============================================================

function setText(
  id,
  value
) {

  const element =
    $(id);


  if (element) {

    element.textContent =
      String(
        value ?? ""
      );

  }

}


// ============================================================
// IMAGE
// ============================================================

function setImage(
  id,
  src
) {

  const element =
    $(id);


  if (
    element &&
    src
  ) {

    element.src =
      src;

  }

}


// ============================================================
// FIRESTORE TIME
// ============================================================

function getTime(
  value
) {

  if (!value) {
    return 0;
  }


  try {

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
      value.seconds !==
      undefined
    ) {

      return (
        Number(
          value.seconds
        ) * 1000
      );

    }


    const date =
      new Date(
        value
      );


    const time =
      date.getTime();


    return Number.isNaN(
      time
    )
      ? 0
      : time;

  } catch {

    return 0;

  }

}


// ============================================================
// FORMAT DATE
// ============================================================

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


// ============================================================
// FORMAT MONEY
// ============================================================

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


// ============================================================
// CATEGORY
// ============================================================

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


// ============================================================
// TRUNCATE
// ============================================================

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


// ============================================================
// ESCAPE HTML
// ============================================================

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


// ============================================================
// AVATAR
// ============================================================

function avatar(
  name
) {

  const first =
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
      first
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


// ============================================================
// TOAST
// ============================================================

function showToast(
  message
) {

  let toast =
    $("butuhToast");


  if (!toast) {

    toast =
      document.createElement(
        "div"
      );


    toast.id =
      "butuhToast";


    Object.assign(
      toast.style,
      {

        position:
          "fixed",

        left:
          "50%",

        bottom:
          "25px",

        transform:
          "translateX(-50%)",

        zIndex:
          "999999",

        padding:
          "13px 20px",

        borderRadius:
          "999px",

        background:
          "#111827",

        color:
          "#fff",

        fontWeight:
          "700",

        fontSize:
          "14px",

        boxShadow:
          "0 10px 30px rgba(0,0,0,.2)"

      }
    );


    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  toast.style.display =
    "block";


  clearTimeout(
    toast._timer
  );


  toast._timer =
    setTimeout(
      () => {

        toast.style.display =
          "none";

      },
      3000
    );

}


// ============================================================
// LOGGED OUT
// ============================================================

function showLoggedOut() {

  const container =
    $("needsList");


  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="loading-box">

      <div class="empty-icon">
        🔐
      </div>

      <strong>
        Silakan login
      </strong>

      <small>
        Login untuk melihat dan memposting kebutuhan.
      </small>

    </div>

  `;


  setText(
    "activeNeedsCount",
    "0"
  );

  setText(
    "userNeedsCount",
    "0"
  );

  setText(
    "userOffersCount",
    "0"
  );

}


// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // --------------------------------------------------------
    // POST NEED
    // --------------------------------------------------------

    $("needForm")
      ?.addEventListener(
        "submit",
        submitNeed
      );


    $("openNeedModal")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("heroPostButton")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("desktopPostButton")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("mobilePostButton")
      ?.addEventListener(
        "click",
        openNeedModal
      );


    $("closeNeedModal")
      ?.addEventListener(
        "click",
        closeNeedModal
      );


    $("cancelNeed")
      ?.addEventListener(
        "click",
        closeNeedModal
      );


    $("needBackdrop")
      ?.addEventListener(
        "click",
        closeNeedModal
      );


    // --------------------------------------------------------
    // PROFILE MENU
    // --------------------------------------------------------

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


    $("profilePageBtn")
      ?.addEventListener(
        "click",
        openProfile
      );


    $("logoutBtn")
      ?.addEventListener(
        "click",
        logout
      );


    // --------------------------------------------------------
    // CLICK OUTSIDE PROFILE
    // --------------------------------------------------------

    document.addEventListener(
      "click",
      event => {

        const menu =
          $("profileMenu");

        const button =
          $("profileButton");


        if (
          menu &&
          button &&
          !menu.contains(
            event.target
          ) &&
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


    // --------------------------------------------------------
    // NEED CARD
    // --------------------------------------------------------

    $("needsList")
      ?.addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-action='detail']"
            );


          if (!button) {
            return;
          }


          const id =
            button.dataset.id;


          if (id) {

            window.openNeedDetail(
              id
            );

          }

        }
      );


    // --------------------------------------------------------
    // ESC
    // --------------------------------------------------------

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {

          closeModal(
            "needModal"
          );

          closeModal(
            "detailModal"
          );

          closeModal(
            "offerModal"
          );

        }

      }
    );

  }
);


// ============================================================
// GLOBAL DEBUG
// ============================================================

window.butuhApp = {

  getUser() {

    return currentUser;

  },

  getNeeds() {

    return needsCache;

  },

  reload() {

    loadNeeds();

  }

};


console.log(
  "✅ BUTUH script.js VERSI CEPAT aktif"
);

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const needId =
      params.get("need");


    if (needId) {

      setTimeout(
        () => {

          window.openNeedDetail(
            needId
          );

        },
        300
      );

    }

  }
);
