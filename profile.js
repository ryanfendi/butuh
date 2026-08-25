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
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
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
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


/* =========================================================
   GLOBAL
   ========================================================= */

let currentUser = null;


/* =========================================================
   AUTH
   ========================================================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser = user;

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }

    loadProfile(user);

    loadMyNeeds(user);

    loadMyOffers(user);

  }
);


/* =========================================================
   PROFILE
   ========================================================= */

function loadProfile(user) {

  setText(
    "profileName",
    user.displayName ||
    "Pengguna"
  );

  setText(
    "profileEmail",
    user.email ||
    ""
  );


  const photo =
    document.getElementById(
      "profilePhoto"
    );


  if (photo) {

    photo.src =
      user.photoURL ||
      avatar(
        user.displayName
      );

  }

}


/* =========================================================
   MY NEEDS
   ========================================================= */

function loadMyNeeds(user) {

  const container =
    document.getElementById(
      "myNeedsList"
    );


  if (!container) {

    return;

  }


  const q =
    query(

      collection(
        db,
        "needs"
      ),

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


  onSnapshot(

    q,

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


      renderMyNeeds(
        needs,
        container
      );


      setText(
        "needTotal",
        needs.length
      );

    },

    error => {

      console.error(
        error
      );

      container.innerHTML = `

        <div class="profile-error">

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
   RENDER MY NEEDS
   ========================================================= */

function renderMyNeeds(
  needs,
  container
) {

  if (
    needs.length === 0
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
          Kebutuhan yang Anda posting akan muncul di sini.
        </small>

      </div>

    `;

    return;

  }


  container.innerHTML =
    needs.map(
      need => `

        <div class="history-card">

          <div class="history-main">

            <div>

              <span class="history-category">
                ${escapeHTML(
                  need.category ||
                  "Lainnya"
                )}
              </span>

              <h3>
                ${escapeHTML(
                  need.title ||
                  "Tanpa judul"
                )}
              </h3>

            </div>


            <span
              class="
                status-badge
                ${statusClass(
                  need.status
                )}
              "
            >
              ${statusText(
                need.status
              )}
            </span>

          </div>


          <div class="history-info">

            <span>
              💰 Rp ${money(
                need.budget
              )}
            </span>

            <span>
              📅 ${date(
                need.createdAt
              )}
            </span>

          </div>


          <button
            class="btn btn-primary"
            onclick="
              window.showOffers(
                '${need.id}',
                '${escapeAttribute(
                  need.title ||
                  "Kebutuhan"
                )}'
              )
            "
          >
            👥 Lihat Penawaran
          </button>

        </div>

      `
    ).join(
      ""
    );

}


/* =========================================================
   MY OFFERS
   ========================================================= */

function loadMyOffers(user) {

  const container =
    document.getElementById(
      "myOffersList"
    );


  if (!container) {

    return;

  }


  const q =
    query(

      collectionGroup(
        db,
        "offers"
      ),

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


  onSnapshot(

    q,

    async snapshot => {

      const offers = [];


      for (
        const item of snapshot.docs
      ) {

        const data =
          item.data();


        let needTitle =
          "Kebutuhan";


        let needBudget =
          0;


        if (
          data.needId
        ) {

          try {

            const needSnap =
              await getDoc(
                doc(
                  db,
                  "needs",
                  data.needId
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
                need.budget ||
                0;

            }

          } catch (e) {

            console.error(e);

          }

        }


        offers.push({

          id:
            item.id,

          ...data,

          needTitle,

          needBudget

        });

      }


      renderMyOffers(
        offers,
        container
      );


      setText(
        "offerTotal",
        offers.length
      );

    },

    error => {

      console.error(
        "Gagal memuat penawaran:",
        error
      );


      container.innerHTML = `

        <div class="profile-error">

          <div>
            ⚠️
          </div>

          <strong>
            Gagal memuat data
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
   RENDER MY OFFERS
   ========================================================= */

function renderMyOffers(
  offers,
  container
) {

  if (
    offers.length === 0
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
    offers.map(
      offer => `

        <div class="history-card">

          <div class="history-main">

            <div>

              <span class="history-category">
                PENAWARAN
              </span>

              <h3>
                ${escapeHTML(
                  offer.needTitle
                )}
              </h3>

            </div>


            <span
              class="
                status-badge
                ${statusClass(
                  offer.status
                )}
              "
            >
              ${statusText(
                offer.status
              )}
            </span>

          </div>


          <div class="offer-price">

            Rp ${money(
              offer.price
            )}

          </div>


          <div class="history-info">

            <span>
              ⏱️ ${escapeHTML(
                offer.duration ||
                "-"
              )}
            </span>

            <span>
              📅 ${date(
                offer.createdAt
              )}
            </span>

          </div>


          <p class="offer-message">

            ${escapeHTML(
              offer.message ||
              ""
            )}

          </p>

        </div>

      `
    ).join(
      ""
    );

}


/* =========================================================
   SHOW OFFERS
   ========================================================= */

window.showOffers =
  async function (
    needId,
    title
  ) {

    if (!currentUser) {

      return;

    }


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


    let modal =
      document.getElementById(
        "offersModal"
      );


    if (!modal) {

      modal =
        document.createElement(
          "div"
        );

      modal.id =
        "offersModal";

      modal.className =
        "modal";


      document.body.appendChild(
        modal
      );

    }


    modal.innerHTML = `

      <div
        class="modal-backdrop"
        onclick="
          window.closeOffers()
        "
      ></div>


      <div class="modal-content">

        <div class="modal-header">

          <div>

            <span class="section-label">
              PENAWARAN
            </span>

            <h2>
              ${escapeHTML(
                title
              )}
            </h2>

          </div>


          <button
            class="modal-close"
            onclick="
              window.closeOffers()
            "
          >
            ×
          </button>

        </div>


        <div
          id="offersContainer"
          style="padding:20px"
        >

          <div class="loading-box">
            ⏳ Memuat penawaran...
          </div>

        </div>

      </div>

    `;


    modal.classList.remove(
      "hidden"
    );


    modal.style.display =
      "flex";


    loadOffersForNeed(
      needId
    );

  };


/* =========================================================
   LOAD OFFERS FOR NEED
   ========================================================= */

function loadOffersForNeed(
  needId
) {

  const container =
    document.getElementById(
      "offersContainer"
    );


  const q =
    query(

      collection(
        db,
        "needs",
        needId,
        "offers"
      ),

      orderBy(
        "createdAt",
        "desc"
      )

    );


  onSnapshot(

    q,

    snapshot => {

      const offers =
        [];


      snapshot.forEach(
        item => {

          offers.push({

            id:
              item.id,

            ...item.data()

          });

        }
      );


      if (
        offers.length === 0
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
              Penawaran dari pengguna lain akan muncul di sini.
            </small>

          </div>

        `;

        return;

      }


      container.innerHTML =
        offers.map(
          offer =>
            createOfferCard(
              offer,
              needId
            )
        ).join(
          ""
        );

    },

    error => {

      console.error(
        error
      );


      container.innerHTML = `

        <div class="profile-error">

          ⚠️ Gagal memuat penawaran

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
   OFFER CARD
   ========================================================= */

function createOfferCard(
  offer,
  needId
) {

  const accepted =
    offer.status ===
    "accepted";


  const rejected =
    offer.status ===
    "rejected";


  return `

    <div class="offer-card">

      <div class="offer-user">

        <img
          src="${escapeAttribute(
            offer.providerPhoto ||
            avatar(
              offer.providerName
            )
          )}"
          class="offer-avatar"
        />


        <div>

          <strong>
            ${escapeHTML(
              offer.providerName ||
              "Pengguna"
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

        Rp ${money(
          offer.price
        )}

      </div>


      <div class="offer-duration">

        ⏱️
        ${escapeHTML(
          offer.duration ||
          "-"
        )}

      </div>


      <p class="offer-message">

        ${escapeHTML(
          offer.message ||
          ""
        )}

      </p>


      ${
        accepted
          ? `

            <div class="offer-success">

              ✅ Penawaran diterima

            </div>

          `
          : rejected
            ? `

              <div class="offer-rejected">

                ❌ Penawaran ditolak

              </div>

            `
            : `

              <div class="offer-actions">

                <button
                  class="btn btn-primary"
                  onclick="
                    window.acceptOffer(
                      '${needId}',
                      '${offer.id}',
                      '${offer.providerId}'
                    )
                  "
                >
                  ✅ Terima
                </button>


                <button
                  class="btn btn-outline"
                  onclick="
                    window.rejectOffer(
                      '${needId}',
                      '${offer.id}'
                    )
                  "
                >
                  ❌ Tolak
                </button>

              </div>

            `
      }

    </div>

  `;

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

    if (!currentUser) {

      return;

    }


    const confirmAccept =
      confirm(
        "Terima penawaran ini?"
      );


    if (!confirmAccept) {

      return;

    }


    try {

      /*
       * Pastikan kebutuhan memang milik user.
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


      if (
        needSnap.data().ownerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Anda bukan pemilik kebutuhan."
        );

      }


      /*
       * Terima penawaran.
       */

      await updateDoc(

        doc(
          db,
          "needs",
          needId,
          "offers",
          offerId
        ),

        {

          status:
            "accepted",

          acceptedAt:
            serverTimestamp()

        }

      );


      /*
       * Tutup penawaran lain
       * agar hanya satu penyedia
       * yang diterima.
       */

      const q =
        query(
          collection(
            db,
            "needs",
            needId,
            "offers"
          )
        );


      const snapshot =
        await new Promise(
          resolve => {

            onSnapshot(
              q,
              resolve,
              () => resolve(null)
            );

          }
        );


      if (snapshot) {

        const updates = [];


        snapshot.forEach(
          item => {

            if (
              item.id !==
                offerId &&
              item.data().status ===
                "pending"
            ) {

              updates.push(

                updateDoc(

                  item.ref,

                  {

                    status:
                      "rejected",

                    rejectedAt:
                      serverTimestamp()

                  }

                )

              );

            }

          }
        );


        await Promise.all(
          updates
        );

      }


      /*
       * Ubah status kebutuhan.
       */

      await updateDoc(
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


      alert(
        "✅ Penawaran berhasil diterima."
      );


    } catch (error) {

      console.error(
        error
      );


      alert(
        "Gagal menerima penawaran: " +
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

    if (!currentUser) {

      return;

    }


    if (
      !confirm(
        "Tolak penawaran ini?"
      )
    ) {

      return;

    }


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
        !needSnap.exists()
      ) {

        throw new Error(
          "Kebutuhan tidak ditemukan."
        );

      }


      if (
        needSnap.data().ownerId !==
        currentUser.uid
      ) {

        throw new Error(
          "Anda bukan pemilik kebutuhan."
        );

      }


      await updateDoc(

        doc(
          db,
          "needs",
          needId,
          "offers",
          offerId
        ),

        {

          status:
            "rejected",

          rejectedAt:
            serverTimestamp()

        }

      );


      alert(
        "Penawaran ditolak."
      );


    } catch (error) {

      console.error(
        error
      );


      alert(
        "Gagal menolak penawaran: " +
        error.message
      );

    }

  };


/* =========================================================
   CLOSE OFFERS
   ========================================================= */

window.closeOffers =
  function () {

    const modal =
      document.getElementById(
        "offersModal"
      );


    if (modal) {

      modal.style.display =
        "none";

      modal.classList.add(
        "hidden"
      );

    }

  };


/* =========================================================
   HELPERS
   ========================================================= */

function setText(
  id,
  value
) {

  const el =
    document.getElementById(
      id
    );


  if (el) {

    el.textContent =
      value;

  }

}


function money(
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


function date(
  value
) {

  if (!value) {

    return "Baru saja";

  }


  let d;


  if (
    typeof value.toDate ===
    "function"
  ) {

    d =
      value.toDate();

  } else {

    d =
      new Date(
        value
      );

  }


  if (
    isNaN(
      d.getTime()
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
  ).format(d);

}


function statusText(
  status
) {

  const map = {

    open:
      "🟢 Aktif",

    active:
      "🟢 Aktif",

    in_progress:
      "🔵 Dikerjakan",

    completed:
      "✅ Selesai",

    pending:
      "⏳ Menunggu",

    accepted:
      "✅ Diterima",

    rejected:
      "❌ Ditolak"

  };


  return (
    map[status] ||
    status ||
    "Aktif"
  );

}


function statusClass(
  status
) {

  return String(
    status ||
    "open"
  ).replace(
    "_",
    "-"
  );

}


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
    "&color=ffffff"
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


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}
