// ============================================================
// BUTUH - SCRIPT.JS
// VERSI BARU DARI NOL
// Firebase 12.1.0
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCUFHkwOfNo-JCGHWG3dWcnISoYLg7vGnY",
  authDomain: "butuhin.firebaseapp.com",
  projectId: "butuhin",
  storageBucket: "butuhin.firebasestorage.app",
  messagingSenderId: "331896660506",
  appId: "1:331896660506:web:7a03f433101b81dd74e7a3"
};


const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ============================================================
// STATE
// ============================================================

let currentUser = null;
let needsCache = [];
let unsubscribeNeeds = null;

let isSubmittingNeed = false;
let isSubmittingOffer = false;


// ============================================================
// HELPER
// ============================================================

const $ = id => document.getElementById(id);


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, user => {

  currentUser = user || null;

  updateUserUI(user);

  if (unsubscribeNeeds) {
    unsubscribeNeeds();
    unsubscribeNeeds = null;
  }

  loadNeeds();

});


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
    createAvatar(name);

  setText("userName", name);
  setText("menuUserName", name);
  setText("userEmail", email);
  setText("menuUserEmail", email);

  setImage("userPhoto", photo);
  setImage("menuUserPhoto", photo);

}


// ============================================================
// LOAD NEEDS
// ============================================================

function loadNeeds() {

  const container = $("needsList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-box">
      <div class="spinner"></div>
      <strong>Memuat kebutuhan...</strong>
    </div>
  `;


  const needsRef =
    collection(db, "needs");


  unsubscribeNeeds =
    onSnapshot(
      needsRef,

      snapshot => {

        const needs = [];

        snapshot.forEach(item => {

          needs.push({
            id: item.id,
            ...item.data()
          });

        });


        needs.sort(
          (a, b) =>
            getTime(b.createdAt) -
            getTime(a.createdAt)
        );


        needsCache = needs;

        renderNeeds(needs);

        updateCounters(needs);

      },

      error => {

        console.error(
          "LOAD NEEDS ERROR:",
          error
        );

        container.innerHTML = `
          <div class="loading-box">
            <div class="empty-icon">⚠️</div>
            <strong>Gagal memuat kebutuhan</strong>
            <small>${escapeHTML(error.message)}</small>
          </div>
        `;

      }
    );

}


// ============================================================
// RENDER NEEDS
// ============================================================

function renderNeeds(needs) {

  const container = $("needsList");

  if (!container) {
    return;
  }


  if (!needs.length) {

    container.innerHTML = `
      <div class="loading-box">
        <div class="empty-icon">📭</div>
        <strong>Belum ada kebutuhan</strong>
        <small>Jadilah yang pertama memposting kebutuhan.</small>
      </div>
    `;

    return;
  }


  container.innerHTML =
    needs.map(createNeedCard).join("");

}


// ============================================================
// NEED CARD
// ============================================================

function createNeedCard(need) {

  const isOwner =
    need.ownerId === currentUser?.uid;


  return `

    <article class="need-card">

      <div class="need-card-top">

        <div>

          <span class="need-category">
            ${escapeHTML(
              getCategory(need.category)
            )}
          </span>

          <h3>
            ${escapeHTML(
              need.title || "Tanpa judul"
            )}
          </h3>

        </div>

        ${
          isOwner
            ? `
              <span class="status-badge status-open">
                👤 Milik Anda
              </span>
            `
            : ""
        }

      </div>


      <p class="need-description">

        ${escapeHTML(
          truncate(
            need.description || "",
            160
          )
        )}

      </p>


      <div class="need-footer">

        <div>

          <div class="need-budget">
            Rp ${formatMoney(need.budget)}
          </div>

          <div class="need-date">
            ${formatDate(need.createdAt)}
          </div>

        </div>


        <button
          type="button"
          class="btn ${
            isOwner
              ? "btn-outline"
              : "btn-primary"
          }"
          data-action="detail"
          data-id="${escapeHTML(need.id)}"
        >

          ${
            isOwner
              ? "👁️ Lihat"
              : "💰 Tawarkan"
          }

        </button>

      </div>

    </article>

  `;

}


// ============================================================
// POST NEED
// ============================================================

async function submitNeed(event) {

  event.preventDefault();


  if (isSubmittingNeed) {
    return;
  }


  if (!currentUser) {

    alert("Silakan login terlebih dahulu.");

    window.location.href = "login.html";

    return;
  }


  const form = event.target;

  const title =
    String(form.title?.value || "").trim();

  const description =
    String(form.description?.value || "").trim();

  const category =
    String(form.category?.value || "other");

  const budget =
    Number(form.budget?.value);

  const deadline =
    String(form.deadline?.value || "").trim();


  if (!title) {
    alert("Judul kebutuhan wajib diisi.");
    return;
  }

  if (!description) {
    alert("Deskripsi kebutuhan wajib diisi.");
    return;
  }

  if (!Number.isFinite(budget) || budget <= 0) {
    alert("Masukkan budget yang valid.");
    return;
  }


  isSubmittingNeed = true;


  const button = $("submitNeed");

  const originalText =
    button?.innerHTML ||
    "🚀 Posting Kebutuhan";


  if (button) {
    button.disabled = true;
    button.innerHTML = "⏳ Menyimpan...";
  }


  try {

    const needData = {

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

    };


    await addDoc(
      collection(db, "needs"),
      needData
    );


    form.reset();

    closeModal("needModal");

    showToast(
      "✅ Kebutuhan berhasil diposting!"
    );


  } catch (error) {

    console.error(
      "POST NEED ERROR:",
      error
    );

    alert(
      "Gagal menyimpan kebutuhan:\n\n" +
      error.message
    );

  } finally {

    isSubmittingNeed = false;

    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }

  }

}

// ============================================================
// LOAD OFFERS FOR NEED
// ============================================================

async function loadOffersForNeed(need) {

  if (!currentUser || !need?.id) {
    return [];
  }


  // Hanya pemilik kebutuhan yang dapat melihat
  // seluruh penawaran untuk kebutuhannya.
  if (need.ownerId !== currentUser.uid) {
    return [];
  }


  try {

    const offersRef =
      collection(
        db,
        "needs",
        need.id,
        "offers"
      );


    const snapshot =
      await getDocs(
        offersRef
      );


    const offers = [];


    snapshot.forEach(
      item => {

        offers.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );


    // Urutkan terbaru
    offers.sort(
      (a, b) =>
        getTime(b.createdAt) -
        getTime(a.createdAt)
    );


    return offers;

  } catch (error) {

    console.error(
      "Gagal memuat penawaran:",
      error
    );


    return [];

  }

}


// ============================================================
// OPEN DETAIL
// ============================================================

window.openNeedDetail =
  async function(needId) {

    if (!needId) {
      return;
    }


    let need =
      needsCache.find(
        item => item.id === needId
      );


    if (!need) {

      try {

        const snapshot =
          await getDoc(
            doc(db, "needs", needId)
          );


        if (!snapshot.exists()) {

          alert(
            "Kebutuhan tidak ditemukan."
          );

          return;
        }


        need = {
          id: snapshot.id,
          ...snapshot.data()
        };

      } catch (error) {

        console.error(error);

        alert(
          "Gagal membuka kebutuhan."
        );

        return;

      }

    }


    showNeedDetail(need);

  };


// ============================================================
// SHOW DETAIL
// ============================================================

function showNeedDetail(need) {

  let modal = $("detailModal");

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id = "detailModal";
    modal.className = "modal";

    document.body.appendChild(modal);

  }


  const isOwner =
    need.ownerId === currentUser?.uid;


  modal.innerHTML = `

    <div class="modal-backdrop"></div>

    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            DETAIL KEBUTUHAN
          </span>

          <h2>
            ${escapeHTML(
              need.title || "Kebutuhan"
            )}
          </h2>

        </div>

        <button
          type="button"
          class="modal-close"
          id="closeDetail"
        >
          ×
        </button>

      </div>


      <div style="padding:22px">

        <p style="line-height:1.7">

          ${escapeHTML(
            need.description || ""
          )}

        </p>


        <div style="
          padding:16px;
          margin:20px 0;
          border-radius:12px;
          background:#eff6ff;
        ">

          <small>Budget</small>

          <div style="
            font-size:24px;
            font-weight:800;
          ">
            Rp ${formatMoney(need.budget)}
          </div>

        </div>


        <p>
          👤 ${escapeHTML(
            need.ownerName || "Pengguna"
          )}
        </p>

        <p>
          📂 ${escapeHTML(
            getCategory(need.category)
          )}
        </p>

        ${
          isOwner
            ? `
              <div style="
                padding:14px;
                border-radius:10px;
                background:#f0fdf4;
              ">
                👤 Ini adalah kebutuhan Anda.
              </div>
            `
            : `
              <button
                id="openOfferButton"
                class="btn btn-primary"
                type="button"
                style="
                  width:100%;
                  margin-top:20px;
                "

// ============================================================
// NEED DETAIL MODAL
// ============================================================

async function showNeedDetail(
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


        <div style="
          background:#eff6ff;
          padding:16px;
          border-radius:12px;
          margin:20px 0;
        ">

          <small>
            Budget
          </small>

          <div style="
            font-size:24px;
            font-weight:800;
            color:#2563eb;
          ">
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
                  margin-top:25px;
                  padding-top:20px;
                  border-top:1px solid #e5e7eb;
                "
              >

                <h3 style="
                  margin:0 0 15px;
                ">
                  💰 Penawaran Masuk
                </h3>


                <div
                  id="offersForNeed"
                >

                  <div class="loading-state">

                    <div class="spinner"></div>

                    Memuat penawaran...

                  </div>

                </div>

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


  // ==========================================================
  // PEMILIK: LOAD SEMUA PENAWARAN
  // ==========================================================

  if (owner) {

    const offers =
      await loadOffersForNeed(
        need
      );


    renderOffersForNeed(
      need,
      offers
    );

  }


  // ==========================================================
  // USER LAIN: AJUKAN PENAWARAN
  // ==========================================================

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
// RENDER OFFERS FOR NEED OWNER
// ============================================================

function renderOffersForNeed(
  need,
  offers
) {

  const container =
    $("offersForNeed");


  if (!container) {
    return;
  }


  if (!offers.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          💰
        </div>

        <strong>
          Belum ada penawaran
        </strong>

        <p>
          Penawaran dari pengguna lain akan muncul di sini.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =
    offers
      .map(
        offer => {

          const status =
            String(
              offer.status ||
              "pending"
            ).toLowerCase();


          const isPending =
            status === "pending" ||
            status === "menunggu";


          return `

            <div
              style="
                border:1px solid #e5e7eb;
                border-radius:14px;
                padding:16px;
                margin-bottom:12px;
              "
            >

              <div style="
                display:flex;
                justify-content:space-between;
                gap:12px;
                align-items:flex-start;
              ">

                <div>

                  <strong>
                    👤 ${escapeHTML(
                      offer.providerName ||
                      "Pengguna"
                    )}
                  </strong>


                  <div style="
                    margin-top:6px;
                    color:#2563eb;
                    font-size:20px;
                    font-weight:800;
                  ">

                    Rp ${formatMoney(
                      offer.price
                    )}

                  </div>

                </div>


                <span
                  class="status ${getOfferStatusClass(
                    status
                  )}"
                >

                  ${getOfferStatusText(
                    status
                  )}

                </span>

              </div>


              <div style="
                margin-top:12px;
                color:#4b5563;
              ">

                ⏱️ Lama pengerjaan:
                <strong>
                  ${escapeHTML(
                    offer.duration ||
                    "-"
                  )}
                </strong>

              </div>


              <p style="
                margin:12px 0;
                line-height:1.6;
                color:#374151;
              ">

                ${escapeHTML(
                  offer.message ||
                  ""
                )}

              </p>


              <small style="
                color:#9ca3af;
              ">

                📅 ${formatDate(
                  offer.createdAt
                )}

              </small>


              ${
                isPending
                  ? `

                    <div style="
                      display:flex;
                      gap:10px;
                      margin-top:15px;
                    ">

                      <button
                        type="button"
                        class="btn btn-primary"
                        data-offer-action="accept"
                        data-need-id="${escapeHTML(
                          need.id
                        )}"
                        data-offer-id="${escapeHTML(
                          offer.id
                        )}"
                      >

                        ✓ Terima

                      </button>


                      <button
                        type="button"
                        class="btn btn-outline"
                        data-offer-action="reject"
                        data-need-id="${escapeHTML(
                          need.id
                        )}"
                        data-offer-id="${escapeHTML(
                          offer.id
                        )}"
                      >

                        ✕ Tolak

                      </button>

                    </div>

                  `
                  : ""
              }

            </div>

          `;

        }
      )
      .join("");


  // ==========================================================
  // EVENT ACCEPT / REJECT
  // ==========================================================

  container
    .querySelectorAll(
      "[data-offer-action]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const action =
              button.dataset.offerAction;


            const offerId =
              button.dataset.offerId;


            if (
              !offerId ||
              !need.id
            ) {
              return;
            }


            const newStatus =
              action === "accept"
                ? "accepted"
                : "rejected";


            const confirmText =
              action === "accept"
                ? "Terima penawaran ini?"
                : "Tolak penawaran ini?";


            if (
              !confirm(
                confirmText
              )
            ) {
              return;
            }


            await updateOfferStatus(
              need,
              offerId,
              newStatus
            );

          }
        );

      }
    );

}

// ============================================================
// OFFER MODAL
// ============================================================

function openOfferModal(need) {

  if (!currentUser) {

    window.location.href =
      "login.html";

    return;

  }


  let modal =
    $("offerModal");


  if (!modal) {

    modal =
      document.createElement("div");

    modal.id = "offerModal";
    modal.className = "modal";

    document.body.appendChild(modal);

  }


  modal.innerHTML = `

    <div class="modal-backdrop"></div>

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
            ${escapeHTML(
              need.title
            )}
          </p>

        </div>

        <button
          type="button"
          class="modal-close"
          id="closeOffer"
        >
          ×
        </button>

      </div>


      <form id="offerForm">

        <div class="form-group">

          <label>
            Harga Penawaran
          </label>

          <input
            name="price"
            type="number"
            min="1"
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


  modal.classList.remove("hidden");


  $("closeOffer")
    ?.addEventListener(
      "click",
      () => closeModal("offerModal")
    );


  $("cancelOffer")
    ?.addEventListener(
      "click",
      () => closeModal("offerModal")
    );


  modal
    .querySelector(".modal-backdrop")
    ?.addEventListener(
      "click",
      () => closeModal("offerModal")
    );


  $("offerForm")
    ?.addEventListener(
      "submit",
      event =>
        submitOffer(event, need)
    );

}


// ============================================================
// SUBMIT OFFER
// ============================================================

async function submitOffer(event, need) {

  event.preventDefault();


  if (isSubmittingOffer) {
    return;
  }


  if (!currentUser) {

    alert("Silakan login terlebih dahulu.");

    return;

  }


  if (!need?.id) {

    alert(
      "Data kebutuhan tidak ditemukan."
    );

    return;

  }


  const form = event.target;

  const price =
    Number(form.price?.value);

  const duration =
    String(
      form.duration?.value || ""
    ).trim();

  const message =
    String(
      form.message?.value || ""
    ).trim();


  if (!Number.isFinite(price) || price <= 0) {
    alert("Harga penawaran tidak valid.");
    return;
  }

  if (!duration) {
    alert("Lama pengerjaan wajib diisi.");
    return;
  }

  if (!message) {
    alert("Pesan penawaran wajib diisi.");
    return;
  }


  isSubmittingOffer = true;


  const button =
    $("submitOffer");

  const originalText =
    button?.innerHTML ||
    "💰 Kirim Penawaran";


  if (button) {
    button.disabled = true;
    button.innerHTML = "⏳ Mengirim...";
  }


  try {

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


    closeModal("offerModal");

    showToast(
      "🤝 Penawaran berhasil dikirim!"
    );


  } catch (error) {

    console.error(
      "SUBMIT OFFER ERROR:",
      error
    );

    alert(
      "Gagal mengirim penawaran:\n\n" +
      error.message
    );

  } finally {

    isSubmittingOffer = false;

    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }

  }

}


// ============================================================
// COUNTERS
// ============================================================

function updateCounters(needs) {

  const active =
    needs.filter(
      need => {

        const status =
          String(
            need.status || "open"
          ).toLowerCase();

        return [
          "open",
          "active",
          "aktif"
        ].includes(status);

      }
    ).length;


  const mine =
    needs.filter(
      need =>
        need.ownerId ===
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
// MODAL
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


  modal.classList.remove("hidden");

  document.body.classList.add(
    "modal-open"
  );

}


function closeModal(id) {

  const modal = $(id);

  if (!modal) {
    return;
  }

  modal.classList.add("hidden");

  document.body.classList.remove(
    "modal-open"
  );

}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  try {

    await signOut(auth);

    window.location.href =
      "login.html";

  } catch (error) {

    alert(
      "Gagal logout: " +
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
// URL NEED
// ============================================================

function openNeedFromURL() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const needId =
    params.get("need");


  if (!needId) {
    return;
  }


  const waitForData =
    setInterval(
      () => {

        const need =
          needsCache.find(
            item => item.id === needId
          );


        if (need) {

          clearInterval(waitForData);

          window.openNeedDetail(needId);

          window.history.replaceState(
            {},
            document.title,
            "index.html"
          );

        }

      },
      150
    );


  setTimeout(
    () => clearInterval(waitForData),
    10000
  );

}


// ============================================================
// UTILITIES
// ============================================================

function setText(id, value) {

  const element = $(id);

  if (element) {
    element.textContent = value ?? "";
  }

}


function setImage(id, src) {

  const element = $(id);

  if (element && src) {
    element.src = src;
  }

}


function getTime(value) {

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
    return value.toDate().getTime();
  }

  if (
    typeof value.seconds ===
    "number"
  ) {
    return value.seconds * 1000;
  }

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;

}


function formatDate(value) {

  const time = getTime(value);

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
  ).format(new Date(time));

}


function formatMoney(value) {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat(
    "id-ID"
  ).format(number);

}


function getCategory(value) {

  const categories = {
    design: "🎨 Desain",
    website: "🌐 Website",
    programming: "💻 Programming",
    marketing: "📢 Marketing",
    writing: "✍️ Penulisan",
    video: "🎬 Video",
    translation: "🌍 Terjemahan",
    other: "📦 Lainnya"
  };

  return (
    categories[value] ||
    categories.other
  );

}


function truncate(text, length) {

  const value =
    String(text || "");

  return value.length > length
    ? value.substring(0, length) + "..."
    : value;

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function createAvatar(name) {

  const letter =
    String(name || "U")
      .trim()
      .charAt(0)
      .toUpperCase();

  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(letter) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=256"
  );

}


// ============================================================
// TOAST
// ============================================================

function showToast(message) {

  let toast = $("butuhToast");

  if (!toast) {

    toast =
      document.createElement("div");

    toast.id = "butuhToast";

    Object.assign(
      toast.style,
      {
        position: "fixed",
        left: "50%",
        bottom: "25px",
        transform: "translateX(-50%)",
        zIndex: "999999",
        padding: "13px 20px",
        borderRadius: "999px",
        background: "#111827",
        color: "#ffffff",
        fontWeight: "700",
        boxShadow:
          "0 10px 30px rgba(0,0,0,.2)"
      }
    );

    document.body.appendChild(toast);

  }


  toast.textContent = message;

  toast.style.display = "block";

  clearTimeout(toast._timer);

  toast._timer =
    setTimeout(
      () => {
        toast.style.display = "none";
      },
      3000
    );

}


// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("needForm")
      ?.addEventListener(
        "submit",
        submitNeed
      );


    [
      "openNeedModal",
      "heroPostButton",
      "desktopPostButton",
      "mobilePostButton"
    ].forEach(
      id => {
        $(id)?.addEventListener(
          "click",
          openNeedModal
        );
      }
    );


    $("closeNeedModal")
      ?.addEventListener(
        "click",
        () => closeModal("needModal")
      );


    $("cancelNeed")
      ?.addEventListener(
        "click",
        () => closeModal("needModal")
      );


    $("needBackdrop")
      ?.addEventListener(
        "click",
        () => closeModal("needModal")
      );


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

          window.openNeedDetail(
            button.dataset.id
          );

        }
      );


    $("profileButton")
      ?.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          $("profileMenu")
            ?.classList.toggle("hidden");

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
      "keydown",
      event => {

        if (event.key === "Escape") {

          closeModal("needModal");
          closeModal("detailModal");
          closeModal("offerModal");

        }

      }
    );


    openNeedFromURL();

  }
);


console.log(
  "✅ BUTUH script.js baru aktif"
);


// ============================================================
// UPDATE OFFER STATUS
// ============================================================

async function updateOfferStatus(
  need,
  offerId,
  status
) {

  if (
    !currentUser ||
    !need ||
    !offerId
  ) {
    return;
  }


  if (
    need.ownerId !==
    currentUser.uid
  ) {

    alert(
      "Anda tidak memiliki izin untuk mengubah penawaran ini."
    );

    return;

  }


  try {

    const offerRef =
      doc(
        db,
        "needs",
        need.id,
        "offers",
        offerId
      );


    await updateDoc(
      offerRef,
      {

        status,

        updatedAt:
          serverTimestamp()

      }
    );


    showToast(
      status === "accepted"
        ? "✅ Penawaran berhasil diterima!"
        : "❌ Penawaran ditolak."
    );


    // Muat ulang penawaran
    const offers =
      await loadOffersForNeed(
        need
      );


    renderOffersForNeed(
      need,
      offers
    );


  } catch (error) {

    console.error(
      "Update offer status:",
      error
    );


    alert(
      "Gagal mengubah status:\n\n" +
      error.message
    );

  }

}

// ============================================================
// OFFER STATUS
// ============================================================

function getOfferStatusClass(
  status
) {

  switch (
    String(
      status ||
      ""
    ).toLowerCase()
  ) {

    case "accepted":
    case "accept":
    case "diterima":
      return "status-success";


    case "completed":
    case "complete":
    case "selesai":
      return "status-completed";


    case "rejected":
    case "reject":
    case "ditolak":
      return "status-danger";


    default:
      return "status-pending";

  }

}


function getOfferStatusText(
  status
) {

  switch (
    String(
      status ||
      ""
    ).toLowerCase()
  ) {

    case "accepted":
    case "accept":
    case "diterima":
      return "✓ Diterima";


    case "completed":
    case "complete":
    case "selesai":
      return "✓ Selesai";


    case "rejected":
    case "reject":
    case "ditolak":
      return "✕ Ditolak";


    default:
      return "⏳ Menunggu";

  }

}

