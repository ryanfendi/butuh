/* =========================================================
   BUTUH - SCRIPT.JS
   Version: Stable V2
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
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp
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
   INITIALIZE FIREBASE
   ========================================================= */

const app =
  initializeApp(
    firebaseConfig
  );

const auth =
  getAuth(app);

const db =
  getFirestore(app);


/* =========================================================
   GLOBAL
   ========================================================= */

let currentUser = null;

let currentUserData = null;

let needs = [];

let unsubscribeNeeds = null;

let isPosting = false;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {

  return document.getElementById(id);

}


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    console.log(
      "Auth:",
      user
    );


    if (!user) {

      currentUser = null;

      /*
       * Jangan redirect jika sedang
       * berada di login.html.
       */

      if (
        !location.pathname.endsWith(
          "login.html"
        )
      ) {

        window.location.href =
          "login.html";

      }

      return;

    }


    currentUser =
      user;


    console.log(
      "Login berhasil:",
      user.displayName,
      user.email
    );


    /*
     * Simpan / update profil
     */

    await saveUserProfile(
      user
    );


    /*
     * Tampilkan profil
     */

    displayUserProfile(
      user
    );


    /*
     * Mulai mengambil kebutuhan
     */

    startNeedsListener();

  }
);


/* =========================================================
   SAVE USER PROFILE
   ========================================================= */

async function saveUserProfile(
  user
) {

  try {

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );


    const existing =
      await getDoc(
        userRef
      );


    const data = {

      uid:
        user.uid,

      name:
        user.displayName ||
        "User",

      email:
        user.email ||
        "",

      photo:
        user.photoURL ||
        "",

      provider:
        "google",

      updatedAt:
        serverTimestamp()

    };


    /*
     * Jika belum ada,
     * buat profil.
     */

    if (
      !existing.exists()
    ) {

      data.createdAt =
        serverTimestamp();

    }


    await setDoc(
      userRef,
      data,
      {
        merge: true
      }
    );


    currentUserData =
      data;


    console.log(
      "Profil tersimpan"
    );


  } catch (error) {

    console.error(
      "Gagal menyimpan profil:",
      error
    );

    /*
     * Jangan menghentikan dashboard
     * hanya karena profil gagal disimpan.
     */

  }

}


/* =========================================================
   DISPLAY USER PROFILE
   ========================================================= */

function displayUserProfile(
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
   * Nama
   */

  setText(
    "userName",
    name
  );

  setText(
    "menuUserName",
    name
  );


  setText(
    "profileName",
    name
  );


  /*
   * Email
   */

  setText(
    "userEmail",
    email
  );

  setText(
    "menuUserEmail",
    email
  );

  setText(
    "profileEmail",
    email
  );


  /*
   * Foto
   */

  setImage(
    "userPhoto",
    photo
  );

  setImage(
    "menuUserPhoto",
    photo
  );

  setImage(
    "profilePhoto",
    photo
  );


}


/* =========================================================
   START NEEDS LISTENER
   ========================================================= */

function startNeedsListener() {

  /*
   * Hapus listener lama jika ada.
   */

  if (
    unsubscribeNeeds
  ) {

    unsubscribeNeeds();

    unsubscribeNeeds =
      null;

  }


  const needsRef =
    collection(
      db,
      "needs"
    );


  /*
   * Untuk sementara kita membaca
   * seluruh needs tanpa orderBy.
   *
   * Ini menghindari masalah index.
   */

  unsubscribeNeeds =
    onSnapshot(

      needsRef,

      snapshot => {

        console.log(
          "Firestore needs:",
          snapshot.size
        );


        needs = [];


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
         * Urutkan terbaru
         */

        needs.sort(
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


        console.log(
          "Data kebutuhan:",
          needs
        );


        renderNeeds();


      },

      error => {

        console.error(
          "Gagal membaca needs:",
          error
        );


        showNeedsError(
          error
        );

      }

    );

}


/* =========================================================
   RENDER NEEDS
   ========================================================= */

function renderNeeds() {

  /*
   * Cari container dengan beberapa
   * kemungkinan ID agar cocok dengan
   * HTML lama.
   */

  const container =
    $("needsList") ||
    $("needsContainer") ||
    $("activeNeeds") ||
    $("needList");


  if (!container) {

    console.warn(
      "Container kebutuhan tidak ditemukan."
    );

    return;

  }


  /*
   * Filter kebutuhan aktif.
   *
   * Jika status kosong,
   * tetap tampilkan.
   */

  const activeNeeds =
    needs.filter(
      need => {

        if (
          !need.status
        ) {

          return true;

        }


        const status =
          String(
            need.status
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
    );


  /*
   * Counter
   */

  setText(
    "activeNeedsCount",
    activeNeeds.length
  );

  setText(
    "needsCount",
    activeNeeds.length
  );


  /*
   * Tidak ada data
   */

  if (
    activeNeeds.length === 0
  ) {

    container.innerHTML = `

      <div class="empty">

        <div style="
          font-size:32px;
          margin-bottom:8px;
        ">
          📭
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <div style="
          margin-top:6px;
          color:#6b7280;
          font-size:13px;
        ">
          Jadilah yang pertama membuat kebutuhan.
        </div>

      </div>

    `;

    return;

  }


  /*
   * Render
   */

  container.innerHTML = "";


  activeNeeds.forEach(
    need => {

      container.appendChild(
        createNeedCard(
          need
        )
      );

    }
  );

}


/* =========================================================
   CREATE NEED CARD
   ========================================================= */

function createNeedCard(
  need
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "need-card";


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
      "User"
    );


  const ownerPhoto =
    need.ownerPhoto ||
    createAvatar(
      need.ownerName
    );


  const date =
    formatDate(
      need.createdAt
    );


  card.innerHTML = `

    <div class="need-owner">

      <img
        src="${escapeAttribute(
          ownerPhoto
        )}"
        class="need-owner-photo"
        alt="Foto"
      >

      <div>

        <strong>
          ${ownerName}
        </strong>

        <small>
          ${date}
        </small>

      </div>

    </div>


    <div class="need-content">

      <h3>
        ${title}
      </h3>

      <p>
        ${description}
      </p>


      <div class="need-meta">

        <span>
          💰 Rp ${budget}
        </span>

        <span>
          📂 ${escapeHTML(
            category
          )}
        </span>

      </div>

    </div>


    <div class="need-actions">

      <button
        class="btn primary"
        data-action="offer">

        💰 Beri Penawaran

      </button>

    </div>

  `;


  const offerButton =
    card.querySelector(
      '[data-action="offer"]'
    );


  if (
    offerButton
  ) {

    offerButton.addEventListener(
      "click",
      () => {

        openOfferModal(
          need
        );

      }
    );

  }


  return card;

}


/* =========================================================
   POST NEED
   ========================================================= */

async function postNeed(
  data
) {

  if (
    !currentUser
  ) {

    alert(
      "Silakan login terlebih dahulu."
    );

    return;

  }


  if (
    isPosting
  ) {

    return;

  }


  /*
   * Validasi
   */

  const title =
    String(
      data.title ||
      ""
    ).trim();


  const description =
    String(
      data.description ||
      ""
    ).trim();


  const budget =
    Number(
      data.budget
    );


  if (
    !title
  ) {

    alert(
      "Judul kebutuhan wajib diisi."
    );

    return;

  }


  if (
    !description
  ) {

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
      "Budget harus lebih dari 0."
    );

    return;

  }


  isPosting =
    true;


  /*
   * Loading tombol
   */

  const submitButton =
    $("submitNeed") ||
    $("postNeedBtn") ||
    $("saveNeedBtn");


  const oldText =
    submitButton
      ? submitButton.textContent
      : "";


  if (
    submitButton
  ) {

    submitButton.disabled =
      true;

    submitButton.textContent =
      "Menyimpan...";

  }


  try {

    const needData = {

      title:
        title,

      description:
        description,

      budget:
        budget,

      category:
        data.category ||
        "other",

      deadline:
        data.deadline ||
        "",

      ownerId:
        currentUser.uid,

      ownerName:
        currentUser.displayName ||
        currentUser.email ||
        "User",

      ownerPhoto:
        currentUser.photoURL ||
        "",

      status:
        "open",

      createdAt:
        serverTimestamp()

    };


    console.log(
      "Posting kebutuhan:",
      needData
    );


    /*
     * Simpan ke Firestore
     */

    const docRef =
      await addDoc(
        collection(
          db,
          "needs"
        ),
        needData
      );


    console.log(
      "Kebutuhan berhasil:",
      docRef.id
    );


    /*
     * Tutup modal SEGERA
     */

    closeNeedModal();


    /*
     * Reset form
     */

    resetNeedForm();


    /*
     * Karena listener onSnapshot
     * akan menerima data baru secara
     * otomatis, kita tidak perlu
     * reload halaman.
     */

    showToast(
      "Kebutuhan berhasil diposting! 🎉"
    );


  } catch (error) {

    console.error(
      "Gagal posting:",
      error
    );


    alert(
      "Gagal menyimpan kebutuhan:\n\n" +
      error.message
    );


  } finally {

    isPosting =
      false;


    if (
      submitButton
    ) {

      submitButton.disabled =
        false;

      submitButton.textContent =
        oldText ||
        "Posting Kebutuhan";

    }

  }

}


/* =========================================================
   CONNECT POST BUTTON
   ========================================================= */

function connectPostForm() {

  const form =
    $("needForm") ||
    $("postNeedForm");


  if (
    !form
  ) {

    console.log(
      "Form kebutuhan tidak ditemukan."
    );

    return;

  }


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const title =
        getInputValue(
          "needTitle",
          "title"
        );


      const description =
        getInputValue(
          "needDescription",
          "description"
        );


      const budget =
        getInputValue(
          "needBudget",
          "budget"
        );


      const category =
        getInputValue(
          "needCategory",
          "category"
        );


      const deadline =
        getInputValue(
          "needDeadline",
          "deadline"
        );


      await postNeed({

        title:
          title,

        description:
          description,

        budget:
          budget,

        category:
          category,

        deadline:
          deadline

      });

    }
  );

}


/* =========================================================
   GET INPUT VALUE
   ========================================================= */

function getInputValue(
  ...ids
) {

  for (
    const id of ids
  ) {

    const element =
      $(id);


    if (
      element
    ) {

      return element.value;

    }

  }


  return "";

}


/* =========================================================
   MODAL POST
   ========================================================= */

function openNeedModal() {

  const modal =
    $("needModal") ||
    $("postNeedModal");


  if (
    modal
  ) {

    modal.classList.remove(
      "hidden"
    );


    /*
     * Beberapa CSS modal menggunakan
     * display:flex.
     */

    modal.style.display =
      "flex";

  }

}


function closeNeedModal() {

  const modal =
    $("needModal") ||
    $("postNeedModal");


  if (
    modal
  ) {

    modal.classList.add(
      "hidden"
    );

    modal.style.display =
      "none";

  }

}


function resetNeedForm() {

  const form =
    $("needForm") ||
    $("postNeedForm");


  if (
    form
  ) {

    form.reset();

  }

}


/* =========================================================
   OPEN OFFER MODAL
   ========================================================= */

let selectedNeed =
  null;


function openOfferModal(
  need
) {

  selectedNeed =
    need;


  const modal =
    $("offerModal");


  if (
    modal
  ) {

    modal.classList.remove(
      "hidden"
    );

    modal.style.display =
      "flex";

  }


  /*
   * Isi judul kebutuhan
   */

  setText(
    "offerNeedTitle",
    need.title ||
    ""
  );

}


/* =========================================================
   CLOSE OFFER MODAL
   ========================================================= */

function closeOfferModal() {

  const modal =
    $("offerModal");


  if (
    modal
  ) {

    modal.classList.add(
      "hidden"
    );

    modal.style.display =
      "none";

  }

}


/* =========================================================
   POST OFFER
   ========================================================= */

async function postOffer(
  price,
  message,
  duration
) {

  if (
    !currentUser
  ) {

    alert(
      "Silakan login."
    );

    return;

  }


  if (
    !selectedNeed
  ) {

    alert(
      "Kebutuhan tidak ditemukan."
    );

    return;

  }


  const numericPrice =
    Number(
      price
    );


  if (
    !numericPrice ||
    numericPrice <= 0
  ) {

    alert(
      "Harga penawaran tidak valid."
    );

    return;

  }


  try {

    const offerData = {

      providerId:
        currentUser.uid,

      providerName:
        currentUser.displayName ||
        currentUser.email ||
        "User",

      providerPhoto:
        currentUser.photoURL ||
        "",

      price:
        numericPrice,

      message:
        String(
          message ||
          ""
        ).trim(),

      duration:
        String(
          duration ||
          ""
        ).trim(),

      status:
        "pending",

      createdAt:
        serverTimestamp()

    };


    await addDoc(

      collection(

        db,

        "needs",

        selectedNeed.id,

        "offers"

      ),

      offerData

    );


    closeOfferModal();


    showToast(
      "Penawaran berhasil dikirim! 💰"
    );


  } catch (error) {

    console.error(
      "Gagal membuat penawaran:",
      error
    );


    alert(
      "Gagal mengirim penawaran:\n\n" +
      error.message
    );

  }

}


/* =========================================================
   CONNECT OFFER FORM
   ========================================================= */

function connectOfferForm() {

  const form =
    $("offerForm");


  if (
    !form
  ) {

    return;

  }


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const price =
        getInputValue(
          "offerPrice"
        );


      const message =
        getInputValue(
          "offerMessage"
        );


      const duration =
        getInputValue(
          "offerDuration"
        );


      await postOffer(
        price,
        message,
        duration
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
              "Logout error:",
              error
            );

          }

        }
      );

    }
  );

}


/* =========================================================
   PROFILE BUTTON
   ========================================================= */

function connectProfile() {

  const profileButton =
    $("profileButton");


  const profileMenu =
    $("profileMenu");


  if (
    profileButton &&
    profileMenu
  ) {

    profileButton.addEventListener(
      "click",
      event => {

        event.stopPropagation();


        profileMenu.classList.toggle(
          "hidden"
        );

      }
    );


    document.addEventListener(
      "click",
      event => {

        if (
          !profileMenu.contains(
            event.target
          ) &&
          !profileButton.contains(
            event.target
          )
        ) {

          profileMenu.classList.add(
            "hidden"
          );

        }

      }
    );

  }


  /*
   * Profile page
   */

  const profilePageButton =
    $("profilePageBtn");


  if (
    profilePageButton
  ) {

    profilePageButton.addEventListener(
      "click",
      () => {

        window.location.href =
          "profile.html";

      }
    );

  }

}


/* =========================================================
   DASHBOARD BUTTON
   ========================================================= */

function connectDashboard() {

  const button =
    $("dashboardBtn");


  if (
    button
  ) {

    button.addEventListener(
      "click",
      () => {

        window.location.href =
          "index.html";

      }
    );

  }

}


/* =========================================================
   MODAL CLOSE BUTTONS
   ========================================================= */

function connectModalButtons() {

  /*
   * Post modal close
   */

  const closePost =
    $("closeNeedModal");


  if (
    closePost
  ) {

    closePost.addEventListener(
      "click",
      closeNeedModal
    );

  }


  const cancelPost =
    $("cancelNeed");


  if (
    cancelPost
  ) {

    cancelPost.addEventListener(
      "click",
      closeNeedModal
    );

  }


  /*
   * Offer modal
   */

  const closeOffer =
    $("closeOfferModal");


  if (
    closeOffer
  ) {

    closeOffer.addEventListener(
      "click",
      closeOfferModal
    );

  }


  const cancelOffer =
    $("cancelOffer");


  if (
    cancelOffer
  ) {

    cancelOffer.addEventListener(
      "click",
      closeOfferModal
    );

  }

}


/* =========================================================
   OPEN POST BUTTON
   ========================================================= */

function connectOpenPost() {

  const buttons =
    document.querySelectorAll(
      "#openNeedModal, #postNeedBtn, [data-open-post]"
    );


  buttons.forEach(
    button => {

      button.addEventListener(
        "click",
        openNeedModal
      );

    }
  );

}


/* =========================================================
   ERROR
   ========================================================= */

function showNeedsError(
  error
) {

  const container =
    $("needsList") ||
    $("needsContainer") ||
    $("activeNeeds") ||
    $("needList");


  if (
    !container
  ) {

    return;

  }


  container.innerHTML = `

    <div class="empty">

      <div style="
        font-size:32px;
        margin-bottom:8px;
      ">
        ⚠️
      </div>

      <strong>
        Gagal memuat kebutuhan
      </strong>

      <div style="
        margin-top:8px;
        color:#6b7280;
        font-size:12px;
        word-break:break-word;
      ">
        ${escapeHTML(
          error.message
        )}
      </div>

    </div>

  `;

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message
) {

  let toast =
    $("appToast");


  if (
    !toast
  ) {

    toast =
      document.createElement(
        "div"
      );


    toast.id =
      "appToast";


    toast.style.position =
      "fixed";

    toast.style.left =
      "50%";

    toast.style.bottom =
      "25px";

    toast.style.transform =
      "translateX(-50%)";

    toast.style.background =
      "#111827";

    toast.style.color =
      "white";

    toast.style.padding =
      "12px 18px";

    toast.style.borderRadius =
      "12px";

    toast.style.fontSize =
      "14px";

    toast.style.fontWeight =
      "700";

    toast.style.zIndex =
      "99999";

    toast.style.boxShadow =
      "0 8px 25px rgba(0,0,0,.2)";


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
   TIMESTAMP
   ========================================================= */

function getTimestamp(
  timestamp
) {

  if (
    !timestamp
  ) {

    return 0;

  }


  /*
   * Firebase Timestamp
   */

  if (
    typeof timestamp.toMillis ===
    "function"
  ) {

    return timestamp.toMillis();

  }


  /*
   * Timestamp object
   */

  if (
    timestamp.seconds
  ) {

    return (
      Number(
        timestamp.seconds
      ) * 1000
    );

  }


  /*
   * Date
   */

  if (
    timestamp instanceof Date
  ) {

    return timestamp.getTime();

  }


  /*
   * Number
   */

  if (
    typeof timestamp ===
    "number"
  ) {

    return timestamp;

  }


  return 0;

}


/* =========================================================
   CATEGORY
   ========================================================= */

function getCategory(
  category
) {

  const categories = {

    design:
      "Desain",

    website:
      "Website",

    programming:
      "Programming",

    marketing:
      "Marketing",

    writing:
      "Penulisan",

    video:
      "Video",

    translation:
      "Terjemahan",

    other:
      "Lainnya"

  };


  return (
    categories[
      category
    ] ||
    category ||
    "Lainnya"
  );

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
    value.substring(
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

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(
    value
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
   CREATE AVATAR
   ========================================================= */

function createAvatar(
  name
) {

  const letter =
    encodeURIComponent(
      (
        name ||
        "U"
      )
      .charAt(0)
      .toUpperCase()
    );


  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    letter +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=128"
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
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "BUTUH initialized"
    );


    connectPostForm();

    connectOfferForm();

    connectLogout();

    connectProfile();

    connectDashboard();

    connectModalButtons();

    connectOpenPost();

  }
);


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.openNeedModal =
  openNeedModal;

window.closeNeedModal =
  closeNeedModal;

window.openOfferModal =
  openOfferModal;

window.closeOfferModal =
  closeOfferModal;

window.postNeed =
  postNeed;

window.postOffer =
  postOffer;
