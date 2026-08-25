/* =========================================================
   BUTUH
   PROFILE.JS
   VERSI LENGKAP TERBARU
   ========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
   =========================================================
   GANTI DENGAN CONFIG FIREBASE ANDA
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
   INIT FIREBASE
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

let unsubscribeNeeds = null;

let unsubscribeOffers = null;

let unsubscribeRatings = null;

let currentNeeds = [];

let currentOffers = [];

let currentRatings = [];


/* =========================================================
   START
   ========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    currentUser =
      user;


    renderUserProfile(
      user
    );


    loadMyNeeds(
      user
    );


    loadMyOffers(
      user
    );


    loadMyRatings(
      user
    );

  }
);


/* =========================================================
   PROFILE
   ========================================================= */

function renderUserProfile(
  user
) {

  const name =
    user.displayName ||
    "Pengguna";


  const email =
    user.email ||
    "";


  const photo =
    user.photoURL ||
    createAvatar(
      name
    );


  /*
   * Hero profile
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


  /*
   * Header profile
   */

  setText(
    "headerProfileName",
    name
  );


  setText(
    "headerProfileEmail",
    email
  );


  setImage(
    "headerProfilePhoto",
    photo
  );

}


/* =========================================================
   LOAD MY NEEDS
   ========================================================= */

function loadMyNeeds(
  user
) {

  const container =
    document.getElementById(
      "myNeedsList"
    );


  if (!container) {

    return;

  }


  if (
    unsubscribeNeeds
  ) {

    unsubscribeNeeds();

  }


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
        user.uid
      ),

      orderBy(
        "createdAt",
        "desc"
      )

    );


  unsubscribeNeeds =
    onSnapshot(

      q,

      (snapshot) => {

        currentNeeds =
          [];


        snapshot.forEach(
          (item) => {

            currentNeeds.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        renderMyNeeds(
          currentNeeds,
          container
        );


        updateNeedStatistics(
          currentNeeds
        );

      },

      (error) => {

        console.error(
          "LOAD NEEDS ERROR:",
          error
        );


        showError(
          container,
          "Gagal memuat kebutuhan",
          error
        );

      }

    );

}


/* =========================================================
   RENDER MY NEEDS
   ========================================================= */

function renderMyNeeds(
  needs,
  container
) {

  if (
    !needs.length
  ) {

    container.innerHTML = `

      <div class="empty-profile">

        <div>
          📭
        </div>

        <strong>
          Belum ada kebutuhan
        </strong>

        <small>
          Posting kebutuhan pertama Anda.
        </small>

      </div>

    `;

    return;

  }


  container.innerHTML =
    needs
      .map(
        (need) => {

          const title =
            need.title ||
            "Tanpa judul";


          const category =
            need.category ||
            "Lainnya";


          const budget =
            getNumber(
              need.budget
            );


          const status =
            need.status ||
            "open";


          return `

            <div class="history-card">

              <div class="history-main">

                <div>

                  <span class="history-category">

                    ${escapeHTML(
                      category
                    )}

                  </span>


                  <h3>

                    ${escapeHTML(
                      title
                    )}

                  </h3>

                </div>


                <span
                  class="
                    status-badge
                    ${statusClass(
                      status
                    )}
                  "
                >

                  ${statusText(
                    status
                  )}

                </span>

              </div>


              <div class="history-info">

                <span>

                  💰 Rp
                  ${formatMoney(
                    budget
                  )}

                </span>


                <span>

                  📅
                  ${formatDate(
                    need.createdAt
                  )}

                </span>

              </div>


              <button
                class="btn btn-primary"
                type="button"
                onclick="
                  window.showOffers(
                    '${escapeAttribute(
                      need.id
                    )}',
                    '${escapeAttribute(
                      title
                    )}'
                  )
                "
              >

                👥 Lihat Penawaran

              </button>

            </div>

          `;

        }
      )
      .join(
        ""
      );

}


/* =========================================================
   STATISTICS NEEDS
   ========================================================= */

function updateNeedStatistics(
  needs
) {

  const total =
    needs.length;


  const completed =
    needs.filter(
      (need) =>
        need.status ===
        "completed"
    ).length;


  const active =
    needs.filter(
      (need) =>
        need.status !==
          "completed" &&
        need.status !==
          "cancelled"
    ).length;


  setText(
    "needTotal",
    total
  );


  setText(
    "completedTotal",
    completed
  );


  /*
   * Jika ada elemen tambahan
   */

  setText(
    "activeNeedTotal",
    active
  );

}


/* =========================================================
   LOAD MY OFFERS
   =========================================================
   collectionGroup digunakan karena penawaran berada di:

   needs/{needId}/offers/{offerId}
   ========================================================= */

function loadMyOffers(
  user
) {

  const container =
    document.getElementById(
      "myOffersList"
    );


  if (!container) {

    return;

  }


  if (
    unsubscribeOffers
  ) {

    unsubscribeOffers();

  }


  const offersRef =
    collectionGroup(
      db,
      "offers"
    );


  const q =
    query(

      offersRef,

      where(
        "providerId",
        "==",
        user.uid
      ),

      orderBy(
        "createdAt",
        "desc"
      )

    );


  unsubscribeOffers =
    onSnapshot(

      q,

      async (snapshot) => {

        try {

          currentOffers =
            await prepareOffers(
              snapshot.docs
            );


          renderMyOffers(
            currentOffers,
            container
          );


          updateOfferStatistics(
            currentOffers
          );

        } catch (error) {

          console.error(
            "PREPARE OFFERS ERROR:",
            error
          );


          showError(
            container,
            "Gagal memuat riwayat penawaran",
            error
          );

        }

      },

      (error) => {

        console.error(
          "LOAD OFFERS ERROR:",
          error
        );


        showOfferPermissionError(
          container,
          error
        );

      }

    );

}


/* =========================================================
   PREPARE OFFERS
   ========================================================= */

async function prepareOffers(
  docs
) {

  const result =
    [];


  for (
    const item of docs
  ) {

    const data =
      item.data();


    let needTitle =
      "Kebutuhan";


    let needBudget =
      0;


    let needStatus =
      "open";


    let needId =
      data.needId ||
      null;


    /*
     * Jika needId belum disimpan
     * coba ambil dari path Firestore.
     */

    if (
      !needId &&
      item.ref.parent &&
      item.ref.parent.parent
    ) {

      needId =
        item.ref.parent.parent.id;

    }


    if (
      needId
    ) {

      try {

        const needSnap =
          await getDoc(
            doc(
              db,
              "needs",
              needId
            )
          );


        if (
          needSnap.exists()
        ) {

          const need =
            needSnap.data();


          needTitle =
            need.title ||
            "Kebutuhan";


          needBudget =
            getNumber(
              need.budget
            );


          needStatus =
            need.status ||
            "open";

        }

      } catch (error) {

        console.warn(
          "Tidak dapat membaca kebutuhan:",
          error
        );

      }

    }


    result.push({

      id:
        item.id,

      needId,

      needTitle,

      needBudget,

      needStatus,

      ...data

    });

  }


  return result;

}


/* =========================================================
   RENDER MY OFFERS
   ========================================================= */

function renderMyOffers(
  offers,
  container
) {

  if (
    !offers.length
  ) {

    container.innerHTML = `

      <div class="empty-profile">

        <div>
          🤝
        </div>

        <strong>
          Belum ada penawaran
        </strong>

        <small>
          Penawaran yang Anda kirim akan muncul di sini.
        </small>

      </div>

    `;

    return;

  }


  container.innerHTML =
    offers
      .map(
        (offer) => {

          const title =
            offer.needTitle ||
            "Kebutuhan";


          const price =
            getNumber(
              offer.price
            );


          const status =
            offer.status ||
            "pending";


          return `

            <div class="history-card">

              <div class="history-main">

                <div>

                  <span class="history-category">

                    PENAWARAN

                  </span>


                  <h3>

                    ${escapeHTML(
                      title
                    )}

                  </h3>

                </div>


                <span
                  class="
                    status-badge
                    ${statusClass(
                      status
                    )}
                  "
                >

                  ${statusText(
                    status
                  )}

                </span>

              </div>


              <div class="offer-price">

                Rp
                ${formatMoney(
                  price
                )}

              </div>


              <div class="history-info">

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


              ${
                offer.message
                  ? `

                    <p class="offer-message">

                      ${escapeHTML(
                        offer.message
                      )}

                    </p>

                  `
                  : ""
              }

            </div>

          `;

        }
      )
      .join(
        ""
      );

}


/* =========================================================
   OFFER STATISTICS
   ========================================================= */

function updateOfferStatistics(
  offers
) {

  const total =
    offers.length;


  setText(
    "offerTotal",
    total
  );


  /*
   * Optional statistics
   */

  const accepted =
    offers.filter(
      (offer) =>
        offer.status ===
        "accepted"
    ).length;


  const pending =
    offers.filter(
      (offer) =>
        offer.status ===
        "pending"
    ).length;


  const rejected =
    offers.filter(
      (offer) =>
        offer.status ===
        "rejected"
    ).length;


  setText(
    "acceptedOfferTotal",
    accepted
  );


  setText(
    "pendingOfferTotal",
    pending
  );


  setText(
    "rejectedOfferTotal",
    rejected
  );

}


/* =========================================================
   LOAD RATINGS
   =========================================================
   Struktur yang digunakan:

   ratings/{ratingId}

   {
      reviewerId: "...",
      targetUserId: "...",
      rating: 5,
      comment: "...",
      createdAt: ...
   }

   ========================================================= */

function loadMyRatings(
  user
) {

  const ratingsRef =
    collection(
      db,
      "ratings"
    );


  const q =
    query(

      ratingsRef,

      where(
        "targetUserId",
        "==",
        user.uid
      ),

      orderBy(
        "createdAt",
        "desc"
      )

    );


  if (
    unsubscribeRatings
  ) {

    unsubscribeRatings();

  }


  unsubscribeRatings =
    onSnapshot(

      q,

      (snapshot) => {

        currentRatings =
          [];


        snapshot.forEach(
          (item) => {

            currentRatings.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        renderRatingStatistics(
          currentRatings
        );

      },

      (error) => {

        console.warn(
          "Rating belum dapat dimuat:",
          error
        );


        /*
         * Jangan membuat seluruh profil gagal
         * hanya karena rating belum tersedia.
         */

        renderRatingStatistics(
          []
        );

      }

    );

}


/* =========================================================
   RATING STATISTICS
   ========================================================= */

function renderRatingStatistics(
  ratings
) {

  if (
    !ratings.length
  ) {

    setText(
      "ratingValue",
      "0.0"
    );


    setText(
      "ratingBig",
      "0.0"
    );


    setText(
      "ratingCount",
      "0"
    );


    return;

  }


  let total =
    0;


  let count =
    0;


  ratings.forEach(
    (item) => {

      const value =
        Number(
          item.rating
        );


      if (
        Number.isFinite(
          value
        ) &&
        value >= 1 &&
        value <= 5
      ) {

        total +=
          value;

        count++;

      }

    }
  );


  const average =
    count
      ? total / count
      : 0;


  const rating =
    average.toFixed(
      1
    );


  setText(
    "ratingValue",
    rating
  );


  setText(
    "ratingBig",
    rating
  );


  setText(
    "ratingCount",
    count
  );


  /*
   * Update visual stars
   */

  updateStars(
    average
  );

}


/* =========================================================
   UPDATE STARS
   ========================================================= */

function updateStars(
  rating
) {

  const elements =
    document.querySelectorAll(
      ".stars-large"
    );


  elements.forEach(
    (element) => {

      const rounded =
        Math.round(
          rating
        );


      let output =
        "";


      for (
        let i = 1;
        i <= 5;
        i++
      ) {

        output +=
          i <= rounded
            ? "★"
            : "☆";

      }


      element.textContent =
        output;

    }
  );

}


/* =========================================================
   SHOW OFFERS MODAL
   ========================================================= */

window.showOffers =
  async function (
    needId,
    title
  ) {

    if (
      !currentUser
    ) {

      alert(
        "Silakan login terlebih dahulu."
      );

      return;

    }


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


      if (
        !needSnap.exists()
      ) {

        alert(
          "Kebutuhan tidak ditemukan."
        );

        return;

      }


      const need =
        needSnap.data();


      if (
        need.ownerId !==
        currentUser.uid
      ) {

        alert(
          "Anda bukan pemilik kebutuhan ini."
        );

        return;

      }


      createOffersModal();


      const modal =
        document.getElementById(
          "offersModal"
        );


      const titleElement =
        document.getElementById(
          "offersModalTitle"
        );


      if (
        titleElement
      ) {

        titleElement.textContent =
          title ||
          need.title ||
          "Kebutuhan";

      }


      modal.style.display =
        "flex";


      modal.classList.remove(
        "hidden"
      );


      document.body.classList.add(
        "modal-open"
      );


      loadOffersForNeed(
        needId
      );

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Gagal membuka penawaran: " +
        error.message
      );

    }

  };


/* =========================================================
   CREATE OFFERS MODAL
   ========================================================= */

function createOffersModal() {

  if (
    document.getElementById(
      "offersModal"
    )
  ) {

    return;

  }


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "offersModal";


  modal.className =
    "modal hidden";


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      id="offersModalBackdrop"
    ></div>


    <div class="modal-content">

      <div class="modal-header">

        <div>

          <span class="section-label">
            PENAWARAN
          </span>

          <h2 id="offersModalTitle">
            Penawaran
          </h2>

        </div>


        <button
          type="button"
          class="modal-close"
          id="offersModalClose"
        >
          ×
        </button>

      </div>


      <div
        id="offersContainer"
        style="padding:20px"
      >

        <div class="loading-box">

          <div class="loading-spinner"></div>

          <strong>
            Memuat penawaran...
          </strong>

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  document
    .getElementById(
      "offersModalClose"
    )
    .addEventListener(
      "click",
      closeOffers
    );


  document
    .getElementById(
      "offersModalBackdrop"
    )
    .addEventListener(
      "click",
      closeOffers
    );

}


/* =========================================================
   LOAD OFFERS FOR NEED
   ========================================================= */

async function loadOffersForNeed(
  needId
) {

  const container =
    document.getElementById(
      "offersContainer"
    );


  if (!container) {

    return;

  }


  container.innerHTML = `

    <div class="loading-box">

      <div class="loading-spinner"></div>

      <strong>
        Memuat penawaran...
      </strong>

    </div>

  `;


  try {

    const offersRef =
      collection(
        db,
        "needs",
        needId,
        "offers"
      );


    const q =
      query(

        offersRef,

        orderBy(
          "createdAt",
          "desc"
        )

      );


    const snapshot =
      await getDocs(
        q
      );


    const offers =
      [];


    snapshot.forEach(
      (item) => {

        offers.push({

          id:
            item.id,

          ...item.data()

        });

      }
    );


    renderOffersForNeed(
      offers,
      needId,
      container
    );

  } catch (error) {

    console.error(
      "LOAD NEED OFFERS ERROR:",
      error
    );


    showError(
      container,
      "Gagal memuat penawaran",
      error
    );

  }

}


/* =========================================================
   RENDER OFFERS
   ========================================================= */

function renderOffersForNeed(
  offers,
  needId,
  container
) {

  if (
    !offers.length
  ) {

    container.innerHTML = `

      <div class="empty-profile">

        <div>
          🤝
        </div>

        <strong>
          Belum ada penawaran
        </strong>

        <small>
          Belum ada pengguna yang mengirim penawaran.
        </small>

      </div>

    `;

    return;

  }


  container.innerHTML =
    offers
      .map(
        (offer) => {

          const name =
            offer.providerName ||
            "Pengguna";


          const photo =
            offer.providerPhoto ||
            createAvatar(
              name
            );


          const price =
            getNumber(
              offer.price
            );


          const status =
            offer.status ||
            "pending";


          const offerId =
            offer.id;


          const providerId =
            offer.providerId ||
            "";


          let actionHTML =
            "";


          if (
            status ===
            "accepted"
          ) {

            actionHTML = `

              <div class="offer-success">

                ✅ Penawaran diterima

              </div>

            `;

          } else if (
            status ===
            "rejected"
          ) {

            actionHTML = `

              <div class="offer-rejected">

                ❌ Penawaran ditolak

              </div>

            `;

          } else {

            actionHTML = `

              <div class="offer-actions">

                <button
                  class="btn btn-primary"
                  type="button"
                  onclick="
                    window.acceptOffer(
                      '${escapeAttribute(
                        needId
                      )}',
                      '${escapeAttribute(
                        offerId
                      )}',
                      '${escapeAttribute(
                        providerId
                      )}'
                    )
                  "
                >

                  ✅ Terima

                </button>


                <button
                  class="btn btn-outline"
                  type="button"
                  onclick="
                    window.rejectOffer(
                      '${escapeAttribute(
                        needId
                      )}',
                      '${escapeAttribute(
                        offerId
                      )}'
                    )
                  "
                >

                  ❌ Tolak

                </button>

              </div>

            `;

          }


          return `

            <div class="offer-card">

              <div class="offer-user">

                <img
                  class="offer-avatar"
                  src="${escapeAttribute(
                    photo
                  )}"
                  alt="Foto pengguna"
                >


                <div>

                  <strong>

                    ${escapeHTML(
                      name
                    )}

                  </strong>


                  <small>

                    ${escapeHTML(
                      offer.providerEmail ||
                      ""
                    )}

                  </small>

                </div>

              </div>


              <div class="offer-price">

                Rp
                ${formatMoney(
                  price
                )}

              </div>


              <div class="offer-duration">

                ⏱️
                ${escapeHTML(
                  offer.duration ||
                  "-"
                )}

              </div>


              ${
                offer.message
                  ? `

                    <p class="offer-message">

                      ${escapeHTML(
                        offer.message
                      )}

                    </p>

                  `
                  : ""
              }


              ${actionHTML}

            </div>

          `;

        }
      )
      .join(
        ""
      );

}


/* =========================================================
   ACCEPT OFFER
   ========================================================= */

window.acceptOffer =
  async function (
    needId,
    offerId,
    providerId
  ) {

    if (
      !currentUser
    ) {

      return;

    }


    const confirmed =
      confirm(
        "Terima penawaran ini?\n\n" +
        "Penawaran lain untuk kebutuhan ini akan ditolak."
      );


    if (!confirmed) {

      return;

    }


    try {

      /*
       * 1. Ambil kebutuhan
       */

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


      if (
        !needSnap.exists()
      ) {

        throw new Error(
          "Kebutuhan tidak ditemukan."
        );

      }


      const need =
        needSnap.data();


      /*
       * 2. Pastikan pemilik
       */

      if (
        need.ownerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Anda bukan pemilik kebutuhan ini."
        );

      }


      /*
       * 3. Pastikan kebutuhan belum selesai
       */

      if (
        need.status ===
          "completed" ||
        need.status ===
          "cancelled"
      ) {

        throw new Error(
          "Kebutuhan ini sudah tidak aktif."
        );

      }


      /*
       * 4. Ambil semua penawaran
       */

      const offersRef =
        collection(
          db,
          "needs",
          needId,
          "offers"
        );


      const offersSnapshot =
        await getDocs(
          offersRef
        );


      /*
       * 5. Batch update
       */

      const batch =
        writeBatch(
          db
        );


      offersSnapshot.forEach(
        (item) => {

          if (
            item.id ===
            offerId
          ) {

            batch.update(
              item.ref,
              {

                status:
                  "accepted",

                acceptedAt:
                  serverTimestamp()

              }
            );

          } else if (
            item.data().status ===
            "pending"
          ) {

            batch.update(
              item.ref,
              {

                status:
                  "rejected",

                rejectedAt:
                  serverTimestamp()

              }
            );

          }

        }
      );


      /*
       * 6. Update kebutuhan
       */

      batch.update(
        needRef,
        {

          status:
            "in_progress",

          selectedProviderId:
            providerId,

          selectedOfferId:
            offerId,

          updatedAt:
            serverTimestamp()

        }
      );


      /*
       * 7. Commit
       */

      await batch.commit();


      /*
       * 8. Refresh modal
       */

      await loadOffersForNeed(
        needId
      );


      alert(
        "✅ Penawaran berhasil diterima."
      );

    } catch (error) {

      console.error(
        "ACCEPT OFFER ERROR:",
        error
      );


      alert(
        "Gagal menerima penawaran:\n\n" +
        error.message
      );

    }

  };


/* =========================================================
   REJECT OFFER
   ========================================================= */

window.rejectOffer =
  async function (
    needId,
    offerId
  ) {

    if (
      !currentUser
    ) {

      return;

    }


    const confirmed =
      confirm(
        "Tolak penawaran ini?"
      );


    if (!confirmed) {

      return;

    }


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


      if (
        !needSnap.exists()
      ) {

        throw new Error(
          "Kebutuhan tidak ditemukan."
        );

      }


      const need =
        needSnap.data();


      if (
        need.ownerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Anda bukan pemilik kebutuhan ini."
        );

      }


      const offerRef =
        doc(
          db,
          "needs",
          needId,
          "offers",
          offerId
        );


      const offerSnap =
        await getDoc(
          offerRef
        );


      if (
        !offerSnap.exists()
      ) {

        throw new Error(
          "Penawaran tidak ditemukan."
        );

      }


      await updateDoc(
        offerRef,
        {

          status:
            "rejected",

          rejectedAt:
            serverTimestamp()

        }
      );


      await loadOffersForNeed(
        needId
      );


      alert(
        "❌ Penawaran ditolak."
      );

    } catch (error) {

      console.error(
        "REJECT OFFER ERROR:",
        error
      );


      alert(
        "Gagal menolak penawaran:\n\n" +
        error.message
      );

    }

  };


/* =========================================================
   CLOSE MODAL
   ========================================================= */

window.closeOffers =
  function () {

    const modal =
      document.getElementById(
        "offersModal"
      );


    if (!modal) {

      return;

    }


    modal.style.display =
      "none";


    modal.classList.add(
      "hidden"
    );


    document.body.classList.remove(
      "modal-open"
    );

  };


/* =========================================================
   ERROR PENAWARAN
   ========================================================= */

function showOfferPermissionError(
  container,
  error
) {

  const message =
    error?.message ||
    "";


  let extra =
    message;


  if (
    message
      .toLowerCase()
      .includes(
        "permission"
      )
  ) {

    extra =
      "Firestore menolak akses collectionGroup offers. " +
      "Pastikan Rules Firestore sudah di-Publish dan " +
      "field providerId pada penawaran sama dengan UID akun login.";

  }


  container.innerHTML = `

    <div class="profile-error">

      <div style="font-size:25px">
        ⚠️
      </div>


      <strong>
        Gagal memuat data
      </strong>


      <small>
        ${escapeHTML(
          extra
        )}
      </small>

    </div>

  `;

}


/* =========================================================
   GENERIC ERROR
   ========================================================= */

function showError(
  container,
  title,
  error
) {

  const message =
    error?.message ||
    "Terjadi kesalahan.";


  container.innerHTML = `

    <div class="profile-error">

      <div style="font-size:25px">
        ⚠️
      </div>


      <strong>

        ${escapeHTML(
          title
        )}

      </strong>


      <small>

        ${escapeHTML(
          message
        )}

      </small>

    </div>

  `;

}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (
    element
  ) {

    element.textContent =
      value ??
      "";

  }

}


function setImage(
  id,
  src
) {

  const element =
    document.getElementById(
      id
    );


  if (
    element
  ) {

    element.src =
      src;

  }

}


/* =========================================================
   MONEY
   ========================================================= */

function getNumber(
  value
) {

  if (
    typeof value ===
    "number"
  ) {

    return value;

  }


  if (
    typeof value ===
    "string"
  ) {

    const cleaned =
      value.replace(
        /[^\d.-]/g,
        ""
      );


    const number =
      Number(
        cleaned
      );


    return Number.isFinite(
      number
    )
      ? number
      : 0;

  }


  return 0;

}


function formatMoney(
  value
) {

  return new Intl.NumberFormat(
    "id-ID"
  ).format(
    getNumber(
      value
    )
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


  /*
   * Firestore Timestamp
   */

  if (
    value &&
    typeof value.toDate ===
      "function"
  ) {

    date =
      value.toDate();

  }

  /*
   * JavaScript Date
   */

  else if (
    value instanceof Date
  ) {

    date =
      value;

  }

  /*
   * String / number
   */

  else {

    date =
      new Date(
        value
      );

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
   STATUS TEXT
   ========================================================= */

function statusText(
  status
) {

  const statuses = {

    open:
      "🟢 Aktif",

    active:
      "🟢 Aktif",

    pending:
      "⏳ Menunggu",

    in_progress:
      "🔵 Dikerjakan",

    completed:
      "✅ Selesai",

    cancelled:
      "⚫ Dibatalkan",

    accepted:
      "✅ Diterima",

    rejected:
      "❌ Ditolak"

  };


  return (
    statuses[
      status
    ] ||
    "Aktif"
  );

}


/* =========================================================
   STATUS CSS CLASS
   ========================================================= */

function statusClass(
  status
) {

  return String(
    status ||
    "open"
  )
    .toLowerCase()
    .replace(
      /_/g,
      "-"
    );

}


/* =========================================================
   AVATAR
   ========================================================= */

function createAvatar(
  name
) {

  const cleanName =
    name ||
    "Pengguna";


  return (
    "https://ui-avatars.com/api/" +
    "?name=" +
    encodeURIComponent(
      cleanName
    ) +
    "&background=2563eb" +
    "&color=ffffff" +
    "&size=128"
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


    if (
      unsubscribeRatings
    ) {

      unsubscribeRatings();

    }

  }
);
