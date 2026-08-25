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
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


/* =====================================================
   GLOBAL
===================================================== */

let currentUser = null;
let unsubscribeNeeds = null;
let isSubmitting = false;

const $ = id =>
  document.getElementById(id);


/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(
  auth,
  user => {

    currentUser = user;

    updateUserUI(user);

    if (user) {

      loadNeeds();

    } else {

      showLoggedOut();

    }

  }
);


/* =====================================================
   USER UI
===================================================== */

function updateUserUI(user) {

  const photo =
    user?.photoURL ||
    avatar(
      user?.displayName ||
      "U"
    );

  const name =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Pengguna";

  const email =
    user?.email ||
    "";


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

}


/* =====================================================
   LOAD NEEDS
===================================================== */

function loadNeeds() {

  const container =
    $("needsList");

  if (!container) {
    return;
  }


  if (unsubscribeNeeds) {

    unsubscribeNeeds();

  }


  const ref =
    collection(
      db,
      "needs"
    );


  /*
    TIDAK MENGGUNAKAN orderBy.

    Tujuannya agar tidak membutuhkan
    composite index.
  */

  unsubscribeNeeds =
    onSnapshot(

      ref,

      snapshot => {

        const needs = [];

        snapshot.forEach(
          item => {

            needs.push({
              id: item.id,
              ...item.data()
            });

          }
        );


        /*
          Urutkan di browser.
        */

        needs.sort(
          (a, b) => {

            return (
              getTime(b.createdAt) -
              getTime(a.createdAt)
            );

          }
        );


        renderNeeds(
          needs
        );

        updateCounters(
          needs
        );

      },

      error => {

        console.error(
          "Firestore:",
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
                error.message
              )}
            </small>

          </div>
        `;

      }

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


/* =====================================================
   NEED CARD
===================================================== */

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


  return `

    <article
      class="need-card"
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
            onclick="window.openNeedDetail('${need.id}')"
          >

            ${
              owner
                ? "Lihat"
                : "Tawarkan"
            }

          </button>

        </div>

      </div>

    </article>

  `;

}


/* =====================================================
   COUNTERS
===================================================== */

function updateCounters(
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


  /*
    Hitung penawaran pengguna
    dari semua kebutuhan.

    Karena offers adalah
    subcollection:
    needs/{needId}/offers
  */

  loadMyOfferCount(
    needs
  );

}


/* =====================================================
   COUNT MY OFFERS
===================================================== */

async function loadMyOfferCount(
  needs
) {

  if (!currentUser) {
    return;
  }


  let total = 0;


  try {

    await Promise.all(

      needs.map(
        async need => {

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


          total +=
            snapshot.size;

        }
      )

    );


    setText(
      "userOffersCount",
      total
    );


  } catch (error) {

    console.error(
      "Gagal menghitung penawaran:",
      error
    );

    setText(
      "userOffersCount",
      "0"
    );

  }

}


/* =====================================================
   POST NEED
===================================================== */

async function submitNeed(
  event
) {

  event.preventDefault();


  if (isSubmitting) {
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
    form.title.value.trim();


  const description =
    form.description.value.trim();


  const category =
    form.category.value ||
    "other";


  const budget =
    Number(
      form.budget.value
    );


  const deadline =
    form.deadline.value ||
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
    !Number.isFinite(budget) ||
    budget <= 0
  ) {

    alert(
      "Masukkan budget yang valid."
    );

    return;

  }


  isSubmitting = true;


  const button =
    $("submitNeed");


  const original =
    button?.innerHTML;


  if (button) {

    button.disabled = true;

    button.innerHTML =
      "⏳ Menyimpan...";

  }


  try {

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


    form.reset();


    /*
      Modal langsung ditutup
      setelah Firestore selesai.
    */

    closeNeedModal();


    showToast(
      "✅ Kebutuhan berhasil diposting!"
    );


  } catch (error) {

    console.error(
      error
    );

    alert(
      "Gagal menyimpan: " +
      error.message
    );

  } finally {

    isSubmitting = false;

    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        original;

    }

  }

}


/* =====================================================
   NEED DETAIL
===================================================== */

window.openNeedDetail =
  async function(
    needId
  ) {

    try {

      const ref =
        doc(
          db,
          "needs",
          needId
        );


      const snapshot =
        await getDoc(
          ref
        );


      if (
        !snapshot.exists()
      ) {

        alert(
          "Kebutuhan tidak ditemukan."
        );

        return;

      }


      const need = {

        id:
          snapshot.id,

        ...snapshot.data()

      };


      showNeedDetail(
        need
      );


    } catch (error) {

      console.error(
        error
      );

      alert(
        "Gagal membuka kebutuhan."
      );

    }

  };


/* =====================================================
   DETAIL MODAL
===================================================== */

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

        <p>
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


        <p>
          👤
          ${escapeHTML(
            need.ownerName ||
            "Pengguna"
          )}
        </p>


        ${
          owner
            ? `
              <div
                style="
                  margin-top:15px;
                  padding:14px;
                  background:#f0fdf4;
                  color:#15803d;
                  border-radius:10px;
                "
              >
                Ini adalah kebutuhan Anda.
              </div>
            `
            : `
              <button
                id="detailOfferButton"
                class="btn btn-primary btn-large"
                type="button"
                style="width:100%;margin-top:20px"
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


/* =====================================================
   OFFER FORM
===================================================== */

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

        <input
          type="hidden"
          name="needId"
          value="${escapeHTML(
            need.id
          )}"
        >


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


/* =====================================================
   SUBMIT OFFER
===================================================== */

async function submitOffer(
  event,
  need
) {

  event.preventDefault();


  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  const form =
    event.target;


  /*
    Ambil string dahulu,
    lalu Number.

    Ini menghindari masalah
    "nilai yang valid".
  */

  const rawPrice =
    String(
      form.price.value ||
      ""
    ).trim();


  const price =
    Number(
      rawPrice
    );


  const duration =
    form.duration.value.trim();


  const message =
    form.message.value.trim();


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


  const button =
    $("submitOffer");


  const original =
    button.innerHTML;


  button.disabled =
    true;

  button.innerHTML =
    "⏳ Mengirim...";


  try {

    /*
      STRUKTUR DATABASE SAAT INI:

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


  } catch (error) {

    console.error(
      "Offer:",
      error
    );

    alert(
      "Gagal mengirim penawaran: " +
      error.message
    );

  } finally {

    button.disabled =
      false;

    button.innerHTML =
      original;

  }

}


/* =====================================================
   MODAL
===================================================== */

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


/* =====================================================
   LOGOUT
===================================================== */

async function logout() {

  try {

    await signOut(
      auth
    );

    window.location.href =
      "login.html";

  } catch (error) {

    alert(
      "Gagal logout: " +
      error.message
    );

  }

}


/* =====================================================
   PROFILE
===================================================== */

function openProfile() {

  window.location.href =
    "profile.html";

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
  src
) {

  const el =
    $(id);

  if (el) {
    el.src =
      src;
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


/* =====================================================
   TOAST
===================================================== */

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

    toast.style.position =
      "fixed";

    toast.style.left =
      "50%";

    toast.style.bottom =
      "25px";

    toast.style.transform =
      "translateX(-50%)";

    toast.style.zIndex =
      "9999";

    toast.style.padding =
      "13px 20px";

    toast.style.borderRadius =
      "999px";

    toast.style.background =
      "#111827";

    toast.style.color =
      "#fff";

    toast.style.fontWeight =
      "700";

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


/* =====================================================
   LOGGED OUT
===================================================== */

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
        Login dengan Google untuk melihat kebutuhan.
      </small>

    </div>

  `;

}


/* =====================================================
   EVENTS
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("needForm")
      ?.addEventListener(
        "submit",
        submitNeed
      );


    /*
      Semua tombol posting
      sekarang menggunakan
      fungsi yang sama.
    */

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
          !menu.contains(event.target) &&
          !button.contains(event.target)
        ) {

          menu.classList.add(
            "hidden"
          );

        }

      }
    );


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {

          closeNeedModal();

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
