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
  doc,
  getDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {

  apiKey: "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",

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


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// =====================================================
// GLOBAL
// =====================================================

let currentUser = null;

let allNeeds = [];

let selectedNeed = null;

let unsubscribeNeeds = null;

let unsubscribeOffers = null;


// =====================================================
// DOM
// =====================================================

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const userPhoto =
  document.getElementById("userPhoto");

const menuUserPhoto =
  document.getElementById("menuUserPhoto");

const menuUserName =
  document.getElementById("menuUserName");

const menuUserEmail =
  document.getElementById("menuUserEmail");

const profileButton =
  document.getElementById("profileButton");

const profileMenu =
  document.getElementById("profileMenu");

const logoutBtn =
  document.getElementById("logoutBtn");

const openPostBtn =
  document.getElementById("openPostBtn");

const closePostBtn =
  document.getElementById("closePostBtn");

const postModal =
  document.getElementById("postModal");

const postForm =
  document.getElementById("postForm");

const loadingNeeds =
  document.getElementById("loadingNeeds");

const needsList =
  document.getElementById("needsList");

const emptyNeeds =
  document.getElementById("emptyNeeds");

const needCount =
  document.getElementById("needCount");

const searchInput =
  document.getElementById("searchInput");

const categoryFilter =
  document.getElementById("categoryFilter");

const detailModal =
  document.getElementById("detailModal");

const closeDetailBtn =
  document.getElementById("closeDetailBtn");

const detailContent =
  document.getElementById("detailContent");

const offerSection =
  document.getElementById("offerSection");

const offersSection =
  document.getElementById("offersSection");

const offerForm =
  document.getElementById("offerForm");

const offersList =
  document.getElementById("offersList");

const toast =
  document.getElementById("toast");


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }


    currentUser = user;


    // =================================
    // DATA DARI GOOGLE
    // =================================

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


    // =================================
    // TAMPILKAN DI HEADER
    // =================================

    userName.textContent =
      name;

    userEmail.textContent =
      email;

    userPhoto.src =
      photo;


    // =================================
    // TAMPILKAN DI MENU
    // =================================

    menuUserName.textContent =
      name;

    menuUserEmail.textContent =
      email;

    menuUserPhoto.src =
      photo;


    // =================================
    // SIMPAN / UPDATE PROFIL
    // =================================

    await saveUserProfile(
      user
    );


    // =================================
    // LOAD KEBUTUHAN
    // =================================

    startNeedsListener();

  }
);


// =====================================================
// LOGOUT
// =====================================================

logoutBtn.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

      window.location.href =
        "login.html";

    } catch (error) {

      showToast(
        "Gagal keluar: " +
        error.message
      );

    }

  }
);


// =====================================================
// MODAL POST
// =====================================================

openPostBtn.addEventListener(
  "click",
  () => {

    postModal.classList.remove(
      "hidden"
    );

  }
);


closePostBtn.addEventListener(
  "click",
  closePostModal
);


function closePostModal() {

  postModal.classList.add(
    "hidden"
  );

  postForm.reset();

  document
    .getElementById("postError")
    .classList.add("hidden");

}


// =====================================================
// POST NEED
// =====================================================

postForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!currentUser) {

      showToast(
        "Silakan login terlebih dahulu."
      );

      return;
    }


    const title =
      document
        .getElementById("needTitle")
        .value
        .trim();

    const category =
      document
        .getElementById("needCategory")
        .value;

    const description =
      document
        .getElementById("needDescription")
        .value
        .trim();

    const budget =
      Number(
        document
          .getElementById("needBudget")
          .value
      );

    const deadline =
      document
        .getElementById("needDeadline")
        .value;


    const errorBox =
      document.getElementById(
        "postError"
      );

    const submitBtn =
      document.getElementById(
        "submitNeedBtn"
      );

    const submitText =
      document.getElementById(
        "submitNeedText"
      );

    const submitLoading =
      document.getElementById(
        "submitNeedLoading"
      );


    if (
      !title ||
      !category ||
      !description ||
      !budget ||
      !deadline
    ) {

      errorBox.textContent =
        "Semua data wajib diisi.";

      errorBox.classList.remove(
        "hidden"
      );

      return;
    }


    submitBtn.disabled = true;

    submitText.classList.add(
      "hidden"
    );

    submitLoading.classList.remove(
      "hidden"
    );


    try {

      await addDoc(
        collection(db, "needs"),
        {

          title,

          category,

          description,

          budget,

          deadline,

          ownerId:
            currentUser.uid,

          ownerName:
            currentUser.displayName ||
            currentUser.email ||
            "User",

          status: "open",

          createdAt:
            serverTimestamp()

        }
      );


      // LANGSUNG TUTUP POPUP
      closePostModal();

      showToast(
        "✅ Kebutuhan berhasil diposting!"
      );


    } catch (error) {

      console.error(error);

      errorBox.textContent =
        "Gagal menyimpan: " +
        error.message;

      errorBox.classList.remove(
        "hidden"
      );

    } finally {

      submitBtn.disabled = false;

      submitText.classList.remove(
        "hidden"
      );

      submitLoading.classList.add(
        "hidden"
      );

    }

  }
);


// =====================================================
// REALTIME NEEDS
// =====================================================

function startNeedsListener() {

  if (unsubscribeNeeds) {
    unsubscribeNeeds();
  }


  loadingNeeds.classList.remove(
    "hidden"
  );


  const needsQuery = query(

    collection(db, "needs"),

    where(
      "status",
      "==",
      "open"
    ),

    orderBy(
      "createdAt",
      "desc"
    )

  );


  unsubscribeNeeds =
    onSnapshot(

      needsQuery,

      (snapshot) => {

        allNeeds =
          snapshot.docs.map(
            item => ({

              id: item.id,

              ...item.data()

            })
          );


        loadingNeeds.classList.add(
          "hidden"
        );


        renderNeeds();

      },

      (error) => {

        console.error(error);

        loadingNeeds.textContent =
          "Gagal memuat kebutuhan.";

      }

    );

}


// =====================================================
// RENDER NEEDS
// =====================================================

function renderNeeds() {

  const search =
    searchInput.value
      .toLowerCase()
      .trim();

  const category =
    categoryFilter.value;


  const filtered =
    allNeeds.filter(
      need => {

        const matchesSearch =

          !search ||

          need.title
            ?.toLowerCase()
            .includes(search) ||

          need.description
            ?.toLowerCase()
            .includes(search);


        const matchesCategory =

          category === "all" ||

          need.category ===
          category;


        return (
          matchesSearch &&
          matchesCategory
        );

      }
    );


  needCount.textContent =
    filtered.length;


  needsList.innerHTML = "";


  if (!filtered.length) {

    emptyNeeds.classList.remove(
      "hidden"
    );

    return;

  }


  emptyNeeds.classList.add(
    "hidden"
  );


  filtered.forEach(
    need => {

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "need-card";


      const categoryName =
        getCategoryName(
          need.category
        );


      card.innerHTML = `

        <span class="need-category">
          ${escapeHTML(categoryName)}
        </span>

        <h3>
          ${escapeHTML(need.title)}
        </h3>

        <p class="need-description">
          ${escapeHTML(
            truncate(
              need.description,
              100
            )
          )}
        </p>

        <div class="need-info">

          <span class="budget">
            Rp ${formatMoney(
              need.budget
            )}
          </span>

          <span class="deadline">
            📅 ${escapeHTML(
              need.deadline || "-"
            )}
          </span>

        </div>

        <div class="card-footer">

          <small>
            👤 ${escapeHTML(
              need.ownerName ||
              "User"
            )}
          </small>

          <button
            class="btn primary small"
            data-id="${need.id}">
            Lihat Detail
          </button>

        </div>

      `;


      card
        .querySelector("button")
        .addEventListener(
          "click",
          () => openNeedDetail(
            need.id
          )
        );


      needsList.appendChild(card);

    }
  );

}


// =====================================================
// SEARCH
// =====================================================

searchInput.addEventListener(
  "input",
  renderNeeds
);

categoryFilter.addEventListener(
  "change",
  renderNeeds
);


// =====================================================
// OPEN DETAIL
// =====================================================

async function openNeedDetail(
  needId
) {

  detailModal.classList.remove(
    "hidden"
  );


  detailContent.innerHTML = `
    <div class="loading">
      Memuat detail...
    </div>
  `;


  offerSection.classList.add(
    "hidden"
  );

  offersSection.classList.add(
    "hidden"
  );


  try {

    const needRef =
      doc(
        db,
        "needs",
        needId
      );


    const needSnap =
      await getDoc(
        needRef
      );


    if (!needSnap.exists()) {

      detailContent.innerHTML =
        "<p>Kebutuhan tidak ditemukan.</p>";

      return;
    }


    selectedNeed = {

      id: needSnap.id,

      ...needSnap.data()

    };


    renderDetail();

    startOffersListener();

  } catch (error) {

    console.error(error);

    detailContent.innerHTML =
      "<p>Gagal memuat detail.</p>";

  }

}


// =====================================================
// DETAIL
// =====================================================

function renderDetail() {

  const need =
    selectedNeed;


  const isOwner =
    currentUser &&
    need.ownerId ===
    currentUser.uid;


  detailContent.innerHTML = `

    <span class="detail-category">
      ${escapeHTML(
        getCategoryName(
          need.category
        )
      )}
    </span>

    <h2 class="detail-title">
      ${escapeHTML(
        need.title
      )}
    </h2>

    <p class="detail-description">
      ${escapeHTML(
        need.description
      )}
    </p>


    <div class="detail-box">

      <div class="detail-row">

        <span>💰 Budget</span>

        <strong class="budget">
          Rp ${formatMoney(
            need.budget
          )}
        </strong>

      </div>


      <div class="detail-row">

        <span>📅 Deadline</span>

        <strong>
          ${escapeHTML(
            need.deadline || "-"
          )}
        </strong>

      </div>


      <div class="detail-row">

        <span>👤 Pemilik</span>

        <strong>
          ${escapeHTML(
            need.ownerName ||
            "User"
          )}
        </strong>

      </div>


      <div class="detail-row">

        <span>📌 Status</span>

        <strong>
          ${escapeHTML(
            need.status ||
            "open"
          )}
        </strong>

      </div>

    </div>

  `;


  if (
    !isOwner &&
    need.status === "open"
  ) {

    offerSection.classList.remove(
      "hidden"
    );

  }


  if (isOwner) {

    offersSection.classList.remove(
      "hidden"
    );

  }

}


// =====================================================
// CLOSE DETAIL
// =====================================================

closeDetailBtn.addEventListener(
  "click",
  closeDetail
);


function closeDetail() {

  detailModal.classList.add(
    "hidden"
  );


  selectedNeed = null;


  if (unsubscribeOffers) {

    unsubscribeOffers();

    unsubscribeOffers = null;

  }


  offerForm.reset();

}


// =====================================================
// OFFER
// =====================================================

offerForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (!currentUser ||
        !selectedNeed) {

      return;

    }


    const price =
      Number(
        document.getElementById(
          "offerPrice"
        ).value
      );


    const duration =
      document.getElementById(
        "offerDuration"
      ).value.trim();


    const message =
      document.getElementById(
        "offerMessage"
      ).value.trim();


    const error =
      document.getElementById(
        "offerError"
      );


    if (
      price <= 0 ||
      !duration ||
      !message
    ) {

      error.textContent =
        "Isi semua data penawaran.";

      error.classList.remove(
        "hidden"
      );

      return;

    }


    const button =
      document.getElementById(
        "submitOfferBtn"
      );


    button.disabled = true;

    button.textContent =
      "Mengirim...";


    try {

      await addDoc(

        collection(
          db,
          "needs",
          selectedNeed.id,
          "offers"
        ),

        {

          providerId:
            currentUser.uid,

          providerName:
            currentUser.displayName ||
            currentUser.email ||
            "User",

          price,

          duration,

          message,

          status:
            "pending",

          createdAt:
            serverTimestamp()

        }

      );


      offerForm.reset();

      showToast(
        "✅ Penawaran berhasil dikirim!"
      );


    } catch (error) {

      console.error(error);

      error.textContent =
        "Gagal mengirim penawaran.";

      error.classList.remove(
        "hidden"
      );

    } finally {

      button.disabled = false;

      button.textContent =
        "Ajukan Penawaran";

    }

  }
);


// =====================================================
// REALTIME OFFERS
// =====================================================

function startOffersListener() {

  if (unsubscribeOffers) {

    unsubscribeOffers();

  }


  const offersQuery =
    query(

      collection(
        db,
        "needs",
        selectedNeed.id,
        "offers"
      ),

      orderBy(
        "createdAt",
        "desc"
      )

    );


  unsubscribeOffers =
    onSnapshot(

      offersQuery,

      snapshot => {

        const offers =
          snapshot.docs.map(
            item => ({

              id: item.id,

              ...item.data()

            })
          );


        const isOwner =
          currentUser &&
          selectedNeed.ownerId ===
          currentUser.uid;


        if (
          !isOwner
        ) {

          return;

        }


        offersSection.classList.remove(
          "hidden"
        );


        renderOffers(
          offers
        );

      },

      error => {

        console.error(
          "Offers error:",
          error
        );

      }

    );

}


// =====================================================
// RENDER OFFERS
// =====================================================

function renderOffers(
  offers
) {

  if (!offers.length) {

    offersList.innerHTML = `
      <p class="loading">
        Belum ada penawaran.
      </p>
    `;

    return;

  }


  offersList.innerHTML = "";


  offers.forEach(
    offer => {

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "offer-card";


      const statusClass =
        offer.status === "accepted"

          ? "status-accepted"

          : offer.status === "rejected"

          ? "status-rejected"

          : "status-pending";


      const statusText =
        offer.status === "accepted"

          ? "DITERIMA"

          : offer.status === "rejected"

          ? "DITOLAK"

          : "MENUNGGU";


      card.innerHTML = `

        <div class="offer-header">

          <div>

            <div class="offer-name">
              👤 ${escapeHTML(
                offer.providerName ||
                "User"
              )}
            </div>

            <div class="offer-duration">
              ⏱ ${escapeHTML(
                offer.duration ||
                "-"
              )}
            </div>

          </div>

          <div class="offer-price">
            Rp ${formatMoney(
              offer.price
            )}
          </div>

        </div>


        <div class="offer-message">
          ${escapeHTML(
            offer.message
          )}
        </div>


        <span class="
          offer-status
          ${statusClass}
        ">
          ${statusText}
        </span>

        ${
          offer.status === "pending"
          ? `
            <button
              class="btn primary full"
              style="margin-top:12px"
              data-offer-id="${offer.id}">
              Terima Penawaran
            </button>
          `
          : ""
        }

      `;


      const acceptBtn =
        card.querySelector(
          "[data-offer-id]"
        );


      if (acceptBtn) {

        acceptBtn.addEventListener(
          "click",
          () =>
            acceptOffer(
              offer.id
            )
        );

      }


      offersList.appendChild(
        card
      );

    }
  );

}


// =====================================================
// ACCEPT OFFER
// =====================================================

async function acceptOffer(
  offerId
) {

  if (
    !selectedNeed ||
    !currentUser
  ) {

    return;

  }


  if (
    selectedNeed.ownerId !==
    currentUser.uid
  ) {

    showToast(
      "Anda bukan pemilik kebutuhan."
    );

    return;

  }


  const confirmResult =
    confirm(
      "Terima penawaran ini?"
    );


  if (!confirmResult) {

    return;

  }


  try {

    const offerRef =
      doc(
        db,
        "needs",
        selectedNeed.id,
        "offers",
        offerId
      );


    await updateDoc(
      offerRef,
      {
        status: "accepted"
      }
    );


    const needRef =
      doc(
        db,
        "needs",
        selectedNeed.id
      );


    await updateDoc(
      needRef,
      {

        status:
          "in_progress",

        selectedOfferId:
          offerId,

        updatedAt:
          serverTimestamp()

      }
    );


    selectedNeed.status =
      "in_progress";


    showToast(
      "✅ Penawaran diterima!"
    );


    renderDetail();


  } catch (error) {

    console.error(error);

    showToast(
      "Gagal menerima penawaran."
    );

  }

}


// =====================================================
// HELPERS
// =====================================================

function formatMoney(
  value
) {

  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    Number(value) || 0
  );

}


function truncate(
  text,
  max
) {

  if (!text) return "";

  return text.length > max

    ? text.substring(0, max) + "..."

    : text;

}


function getCategoryName(
  category
) {

  const map = {

    design: "Desain",

    website: "Website",

    programming:
      "Programming",

    marketing:
      "Marketing",

    writing:
      "Penulisan",

    other:
      "Lainnya"

  };


  return (
    map[category] ||
    "Lainnya"
  );

}


function escapeHTML(
  value
) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";

  }


  return String(value)

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


function showToast(
  message
) {

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );


  setTimeout(
    () => {

      toast.classList.remove(
        "show"
      );

    },
    2500
  );

}

// =========================================
// SAVE USER PROFILE
// =========================================

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


    await setDoc(
      userRef,
      {

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

      },

      {
        merge: true
      }

    );

  } catch (error) {

    console.error(
      "Gagal menyimpan profil:",
      error
    );

  }

}


function createAvatar(
  name
) {

  const letter =
    encodeURIComponent(
      (name || "U")
        .charAt(0)
        .toUpperCase()
    );


  return `
    https://ui-avatars.com/api/
    ?name=${letter}
    &background=2563eb
    &color=ffffff
    &size=128
  `.replace(/\s/g, "");

}

// =========================================
// PROFILE MENU
// =========================================

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
