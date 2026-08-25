/* =========================================================
   BUTUH - SCRIPT.JS V2
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
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


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
   INIT
   ========================================================= */

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


/* =========================================================
   GLOBAL
   ========================================================= */

let currentUser = null;

let unsubscribeNeeds = null;

let isSubmitting = false;


/* =========================================================
   DOM
   ========================================================= */

const $ = id =>
  document.getElementById(id);


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser = user;

    updateUserUI(user);

    if (user) {

      loadNeeds();

    } else {

      showLoggedOutState();

    }

  }
);


/* =========================================================
   USER UI
   ========================================================= */

function updateUserUI(user) {

  const loginButton =
    $("loginBtn");

  const userArea =
    $("userArea");

  const userPhoto =
    $("userPhoto");

  const userName =
    $("userName");

  const userEmail =
    $("userEmail");

  const profilePhoto =
    $("profilePhoto");


  if (!user) {

    loginButton?.classList.remove(
      "hidden"
    );

    userArea?.classList.add(
      "hidden"
    );

    return;

  }


  loginButton?.classList.add(
    "hidden"
  );

  userArea?.classList.remove(
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
    avatar(name);


  if (userPhoto) {

    userPhoto.src =
      photo;

  }


  if (profilePhoto) {

    profilePhoto.src =
      photo;

  }


  if (userName) {

    userName.textContent =
      name;

  }


  if (userEmail) {

    userEmail.textContent =
      email;

  }

}


/* =========================================================
   LOAD NEEDS
   ========================================================= */

function loadNeeds() {

  const container =
    $("needsList");


  if (!container) {

    return;

  }


  /*
   * Bersihkan listener lama.
   */

  if (unsubscribeNeeds) {

    unsubscribeNeeds();

  }


  /*
   * Query semua kebutuhan.
   */

  const needsRef =
    collection(
      db,
      "needs"
    );


  const needsQuery =
    query(
      needsRef,
      orderBy(
        "createdAt",
        "desc"
      )
    );


  unsubscribeNeeds =
    onSnapshot(

      needsQuery,

      snapshot => {

        const needs =
          [];


        snapshot.forEach(
          item => {

            needs.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        renderNeeds(
          needs
        );


        updateNeedCounter(
          needs
        );

      },

      error => {

        console.error(
          "Gagal mengambil kebutuhan:",
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


/* =========================================================
   RENDER NEEDS
   ========================================================= */

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
    needs.map(
      need =>
        createNeedCard(
          need
        )
    ).join(
      ""
    );

}


/* =========================================================
   CREATE NEED CARD
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

          ${
            owner
              ? `
                <button
                  class="btn btn-outline"
                  onclick="window.openNeedDetail('${need.id}')"
                >
                  Lihat
                </button>
              `
              : `
                <button
                  class="btn btn-primary"
                  onclick="window.openNeedDetail('${need.id}')"
                >
                  Tawarkan
                </button>
              `
          }

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   UPDATE COUNTER
   ========================================================= */

function updateNeedCounter(
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


  setText(
    "needsCount",
    active
  );

  setText(
    "activeNeeds",
    active
  );

}


/* =========================================================
   POST NEED
   ========================================================= */

async function submitNeed(
  event
) {

  event.preventDefault();


  if (isSubmitting) {

    return;

  }


  if (!currentUser) {

    alert(
      "Silakan login dengan Google terlebih dahulu."
    );

    return;

  }


  const form =
    event.target;


  const title =
    form.title?.value.trim();


  const description =
    form.description?.value.trim();


  const category =
    form.category?.value ||
    "other";


  const budget =
    Number(
      form.budget?.value
    );


  if (!title) {

    alert(
      "Judul kebutuhan wajib diisi."
    );

    return;

  }


  if (!description) {

    alert(
      "Deskripsi kebutuhan wajib diisi."
    );

    return;

  }


  if (
    !budget ||
    budget <= 0
  ) {

    alert(
      "Masukkan budget yang valid."
    );

    return;

  }


  isSubmitting =
    true;


  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );


  const originalText =
    submitButton?.innerHTML ||
    "Posting";


  /*
   * Loading cepat.
   */

  if (submitButton) {

    submitButton.disabled =
      true;

    submitButton.innerHTML =
      `
        <span class="loading-spinner"
              style="
                width:18px;
                height:18px;
                border-width:2px;
              ">
        </span>
        Menyimpan...
      `;

  }


  try {

    /*
     * Simpan ke Firestore.
     */

    await addDoc(
      collection(
        db,
        "needs"
      ),
      {

        title:

          title,

        description:

          description,

        category:

          category,

        budget:

          budget,

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

        status:

          "open",

        createdAt:

          serverTimestamp(),

        updatedAt:

          serverTimestamp()

      }
    );


    /*
     * RESET FORM
     */

    form.reset();


    /*
     * TUTUP MODAL SEGERA
     *
     * Tidak menunggu render.
     */

    closeModal(
      "needModal"
    );


    /*
     * Tampilkan notifikasi.
     */

    showToast(
      "✅ Kebutuhan berhasil diposting!"
    );


  } catch (error) {

    console.error(
      "Gagal menyimpan kebutuhan:",
      error
    );


    alert(
      "Gagal menyimpan: " +
      error.message
    );


  } finally {

    isSubmitting =
      false;


    if (submitButton) {

      submitButton.disabled =
        false;

      submitButton.innerHTML =
        originalText;

    }

  }

}


/* =========================================================
   OPEN NEED DETAIL
   ========================================================= */

window.openNeedDetail =
  async function (
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


      const need =
        {

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


/* =========================================================
   NEED DETAIL
   ========================================================= */

function showNeedDetail(
  need
) {

  const title =
    escapeHTML(
      need.title ||
      "Kebutuhan"
    );


  const description =
    escapeHTML(
      need.description ||
      ""
    );


  const budget =
    formatMoney(
      need.budget
    );


  const owner =
    need.ownerId ===
    currentUser?.uid;


  let modal =
    $("detailModal");


  /*
   * Buat modal jika belum ada.
   */

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


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      onclick="window.closeDetailModal()"
    ></div>


    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            DETAIL KEBUTUHAN
          </span>

          <h2>
            ${title}
          </h2>

        </div>


        <button
          class="modal-close"
          onclick="window.closeDetailModal()"
        >
          ×
        </button>

      </div>


      <div style="padding:22px">

        <p
          style="
            color:#667085;
            font-size:14px;
            margin-bottom:20px;
          "
        >
          ${description}
        </p>


        <div
          style="
            background:#eff6ff;
            border-radius:12px;
            padding:15px;
            margin-bottom:20px;
          "
        >

          <small
            style="
              color:#667085;
            "
          >
            Budget
          </small>

          <div
            style="
              color:#2563eb;
              font-size:22px;
              font-weight:800;
            "
          >
            Rp ${budget}
          </div>

        </div>


        ${
          owner
            ? `
              <div
                style="
                  padding:14px;
                  border-radius:10px;
                  background:#f0fdf4;
                  color:#15803d;
                  font-size:13px;
                "
              >
                👤 Ini adalah kebutuhan yang Anda posting.
              </div>
            `
            : `
              <button
                class="btn btn-primary btn-large"
                style="width:100%"
                onclick="window.openOfferForm('${need.id}')"
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

}


/* =========================================================
   CLOSE DETAIL
   ========================================================= */

window.closeDetailModal =
  function () {

    closeModal(
      "detailModal"
    );

  };


/* =========================================================
   OPEN OFFER FORM
   ========================================================= */

window.openOfferForm =
  async function (
    needId
  ) {

    if (!currentUser) {

      alert(
        "Silakan login terlebih dahulu."
      );

      return;

    }


    closeModal(
      "detailModal"
    );


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
        onclick="window.closeOfferModal()"
      ></div>


      <div class="modal-content">

        <div class="modal-header">

          <div>

            <span class="section-label">
              PENAWARAN
            </span>

            <h2>
              Ajukan Penawaran
            </h2>

            <p>
              Berikan penawaran terbaik Anda.
            </p>

          </div>


          <button
            class="modal-close"
            onclick="window.closeOfferModal()"
          >
            ×
          </button>

        </div>


        <form
          id="offerForm"
        >

          <input
            type="hidden"
            name="needId"
            value="${escapeHTML(
              needId
            )}"
          />


          <div class="form-group">

            <label>
              Harga Penawaran
            </label>

            <input
              type="number"
              name="price"
              min="1"
              placeholder="Contoh: 300000"
              required
            />

          </div>


          <div class="form-group">

            <label>
              Lama Pengerjaan
            </label>

            <input
              type="text"
              name="duration"
              placeholder="Contoh: 3 hari"
              required
            />

          </div>


          <div class="form-group">

            <label>
              Pesan
            </label>

            <textarea
              name="message"
              placeholder="Jelaskan mengapa Anda cocok untuk pekerjaan ini..."
              required
            ></textarea>

          </div>


          <div class="modal-actions">

            <button
              type="button"
              class="btn btn-outline"
              onclick="window.closeOfferModal()"
            >
              Batal
            </button>


            <button
              type="submit"
              class="btn btn-primary"
            >
              Kirim Penawaran
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


    const form =
      $("offerForm");


    form.addEventListener(
      "submit",
      submitOffer
    );

  };


/* =========================================================
   SUBMIT OFFER
   ========================================================= */

async function submitOffer(
  event
) {

  event.preventDefault();


  if (!currentUser) {

    alert(
      "Silakan login terlebih dahulu."
    );

    return;

  }


  const form =
    event.target;


  const needId =
    form.needId.value;


  const rawPrice =
  String(
    form.price?.value || ""
  ).trim();

const price =
  Number(
    rawPrice
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/[^\d]/g, "")
  );


  const duration =
    form.duration.value.trim();


  const message =
    form.message.value.trim();


  if (
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
    form.querySelector(
      'button[type="submit"]'
    );


  const original =
    button.innerHTML;


  button.disabled =
    true;

  button.innerHTML =
    "⏳ Mengirim...";


  try {

    /*
     * Simpan ke:
     *
     * needs/{needId}/offers/{offerId}
     */

    await addDoc(

      collection(
        db,
        "needs",
        needId,
        "offers"
      ),

      {

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

        price:

          price,

        duration:

          duration,

        message:

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
      "Gagal mengirim penawaran:",
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


/* =========================================================
   MODAL HELPERS
   ========================================================= */

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


window.closeOfferModal =
  function () {

    closeModal(
      "offerModal"
    );

  };


/* =========================================================
   POST MODAL
   ========================================================= */

function openNeedModal() {

  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  const modal =
    $("needModal");


  if (!modal) {

    console.error(
      "needModal tidak ditemukan."
    );

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


/* =========================================================
   LOGIN
   ========================================================= */

function openLogin() {

  window.location.href =
    "login.html";

}


/* =========================================================
   LOGOUT
   ========================================================= */

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


/* =========================================================
   PROFILE
   ========================================================= */

function openProfile() {

  window.location.href =
    "profile.html";

}


/* =========================================================
   TOAST
   ========================================================= */

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
      "3000";

    toast.style.padding =
      "12px 18px";

    toast.style.borderRadius =
      "999px";

    toast.style.background =
      "#172033";

    toast.style.color =
      "#ffffff";

    toast.style.fontSize =
      "13px";

    toast.style.fontWeight =
      "700";

    toast.style.boxShadow =
      "0 10px 30px rgba(0,0,0,.2)";

    toast.style.maxWidth =
      "90%";

    toast.style.textAlign =
      "center";


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
    map[category] ||
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

  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    Number(
      value
    ) || 0
  );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
  value
) {

  if (!value) {

    return "Baru saja";

  }


  let date;


  if (
    typeof value.toDate ===
    "function"
  ) {

    date =
      value.toDate();

  }

  else if (
    typeof value.toMillis ===
    "function"
  ) {

    date =
      new Date(
        value.toMillis()
      );

  }

  else if (
    value.seconds
  ) {

    date =
      new Date(
        value.seconds *
        1000
      );

  }

  else {

    date =
      new Date(
        value
      );

  }


  if (
    isNaN(
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
    value.length <= length
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
   AVATAR
   ========================================================= */

function avatar(
  name
) {

  const initial =
    String(
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


  if (element) {

    element.textContent =
      value;

  }

}


/* =========================================================
   LOGGED OUT
   ========================================================= */

function showLoggedOutState() {

  const container =
    $("needsList");


  if (
    container &&
    !unsubscribeNeeds
  ) {

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

}


/* =========================================================
   EVENTS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /*
     * Posting kebutuhan
     */

    const needForm =
      $("needForm");


    if (needForm) {

      needForm.addEventListener(
        "submit",
        submitNeed
      );

    }


    /*
     * Tombol posting
     */

    document
      .querySelectorAll(
        "[data-open-need]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            openNeedModal
          );

        }
      );


    /*
     * Tombol login
     */

    document
      .querySelectorAll(
        "#loginBtn"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            openLogin
          );

        }
      );


    /*
     * Tombol profile
     */

    document
      .querySelectorAll(
        "[data-profile]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            openProfile
          );

        }
      );


    /*
     * Tombol logout
     */

    document
      .querySelectorAll(
        "#logoutBtn"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            logout
          );

        }
      );


    /*
     * Close need modal
     */

    document
      .querySelectorAll(
        "[data-close-need]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            closeNeedModal
          );

        }
      );


    /*
     * Klik backdrop
     */

    $("needModal")
      ?.querySelector(
        ".modal-backdrop"
      )
      ?.addEventListener(
        "click",
        closeNeedModal
      );

  }
);


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.openNeedModal =
  openNeedModal;

window.closeNeedModal =
  closeNeedModal;

window.openLogin =
  openLogin;

window.openProfile =
  openProfile;

window.logout =
  logout;


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

  }
);
