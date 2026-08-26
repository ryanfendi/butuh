// ============================================================
// PROJECT.JS
// BUTUH - PROJECT SYSTEM
// ============================================================


// ============================================================
// FIREBASE IMPORT
// ============================================================

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
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
  getApps().length
    ? getApp()
    : initializeApp(
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


// ============================================================
// STATE
// ============================================================

let currentUser =
  null;


let currentProject =
  null;


let projectId =
  null;


let unsubscribeMessages =
  null;


// ============================================================
// HELPER
// ============================================================

const $ =
  id =>
    document.getElementById(
      id
    );


// ============================================================
// GET PROJECT ID
// ============================================================

function getProjectId() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  return (
    params.get(
      "id"
    )
  );

}


// ============================================================
// AUTH
// ============================================================

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


    projectId =
      getProjectId();


    if (!projectId) {

      alert(
        "ID proyek tidak ditemukan."
      );


      window.location.href =
        "index.html";

      return;

    }


    await loadProject();

  }
);


// ============================================================
// LOAD PROJECT
// ============================================================

async function loadProject() {

  try {

    const projectRef =
      doc(
        db,
        "projects",
        projectId
      );


    const snapshot =
      await getDoc(
        projectRef
      );


    if (
      !snapshot.exists()
    ) {

      alert(
        "Proyek tidak ditemukan."
      );


      window.location.href =
        "index.html";

      return;

    }


    currentProject = {

      id:
        snapshot.id,

      ...snapshot.data()

    };


    // ========================================================
    // SECURITY CLIENT
    // ========================================================

    const allowed =
      currentProject.ownerId ===
        currentUser.uid
      ||
      currentProject.providerId ===
        currentUser.uid;


    if (!allowed) {

      alert(
        "Anda tidak memiliki akses ke proyek ini."
      );


      window.location.href =
        "index.html";

      return;

    }


    renderProject();


    listenMessages();


  } catch (error) {

    console.error(
      "Load project:",
      error
    );


    $("projectLoading").innerHTML =
      `

        ⚠️

        <br><br>

        Gagal memuat proyek.

        <br><br>

        <button
          onclick="location.reload()"
          class="btn btn-primary"
        >
          🔄 Coba Lagi
        </button>

      `;

  }

}


// ============================================================
// RENDER PROJECT
// ============================================================

function renderProject() {

  $("projectLoading").style.display =
    "none";


  $("projectContent").style.display =
    "block";


  setText(
    "projectTitle",
    currentProject.title ||
    "Proyek"
  );


  setText(
    "projectDescription",
    currentProject.description ||
    "-"
  );


  setText(
    "projectPrice",
    "Rp " +
    formatMoney(
      currentProject.offerPrice
    )
  );


  setText(
    "projectDuration",
    currentProject.duration ||
    "-"
  );


  renderStatus();


  renderMembers();


  renderCompletion();

}


// ============================================================
// STATUS
// ============================================================

function renderStatus() {

  const status =
    String(
      currentProject.status ||
      "active"
    ).toLowerCase();


  const statusElement =
    $("projectStatus");


  if (status === "active") {

    statusElement.textContent =
      "🟢 Proyek Aktif";

    statusElement.className =
      "project-status status-active";

  }


  if (
    status ===
    "waiting_confirmation"
  ) {

    statusElement.textContent =
      "⏳ Menunggu Konfirmasi";

    statusElement.className =
      "project-status status-waiting";

  }


  if (
    status ===
    "completed"
  ) {

    statusElement.textContent =
      "✓ Proyek Selesai";

    statusElement.className =
      "project-status status-completed";

  }


  setText(
    "projectStatusText",
    getProjectStatusText(
      status
    )
  );

}


// ============================================================
// MEMBERS
// ============================================================

function renderMembers() {

  const container =
    $("projectMembers");


  const ownerPhoto =
    currentProject.ownerPhoto ||
    avatar(
      currentProject.ownerName
    );


  const providerPhoto =
    currentProject.providerPhoto ||
    avatar(
      currentProject.providerName
    );


  container.innerHTML = `

    <div
      class="person-row"
    >

      <img
        class="person-avatar"
        src="${escapeHTML(
          ownerPhoto
        )}"
        alt=""
      >


      <div
        class="person-info"
      >

        <strong>
          ${escapeHTML(
            currentProject.ownerName ||
            "Pemilik"
          )}
        </strong>

        <small>
          👑 Pemilik Kebutuhan
        </small>

      </div>

    </div>


    <div
      class="person-row"
    >

      <img
        class="person-avatar"
        src="${escapeHTML(
          providerPhoto
        )}"
        alt=""
      >


      <div
        class="person-info"
      >

        <strong>
          ${escapeHTML(
            currentProject.providerName ||
            "Penyedia"
          )}
        </strong>

        <small>
          💼 Penyedia Jasa
        </small>

      </div>

    </div>

  `;

}


// ============================================================
// COMPLETION
// ============================================================

function renderCompletion() {

  const container =
    $("completionStatus");


  const isOwner =
    currentProject.ownerId ===
    currentUser.uid;


  const isProvider =
    currentProject.providerId ===
    currentUser.uid;


  const status =
    currentProject.status ||
    "active";


  let html =
    "";


  if (
    status ===
    "completed"
  ) {

    html = `

      <div
        style="
          padding:14px;
          background:#f0fdf4;
          color:#15803d;
          border-radius:12px;
        "
      >

        🎉 Proyek telah selesai.

      </div>

    `;


    container.innerHTML =
      html;


    $("completeProjectBtn").style.display =
      "none";


    return;

  }


  if (
    isProvider &&
    !currentProject.providerCompleted
  ) {

    html = `

      <p>

        Setelah pekerjaan selesai,
        tandai proyek sebagai selesai.

      </p>

    `;


    $("completeProjectBtn").textContent =
      "✓ Tandai Pekerjaan Selesai";

  }


  if (
    isProvider &&
    currentProject.providerCompleted
  ) {

    html = `

      <p>

        ✓ Anda sudah menyatakan
        pekerjaan selesai.

      </p>

      <p>

        ⏳ Menunggu pemilik
        mengonfirmasi hasil.

      </p>

    `;


    $("completeProjectBtn").style.display =
      "none";

  }


  if (
    isOwner &&
    currentProject.providerCompleted &&
    !currentProject.ownerCompleted
  ) {

    html = `

      <p>

        Penyedia menyatakan pekerjaan
        telah selesai.

      </p>

      <p>

        Periksa hasil pekerjaan lalu
        konfirmasi jika sudah sesuai.

      </p>

    `;


    $("completeProjectBtn").textContent =
      "✓ Konfirmasi Proyek Selesai";

  }


  if (
    isOwner &&
    !currentProject.providerCompleted
  ) {

    html = `

      <p>

        ⏳ Menunggu penyedia
        menyelesaikan pekerjaan.

      </p>

    `;


    $("completeProjectBtn").style.display =
      "none";

  }


  container.innerHTML =
    html;

}


// ============================================================
// COMPLETE BUTTON
// ============================================================

$("completeProjectBtn")
  ?.addEventListener(
    "click",
    completeProject
  );


async function completeProject() {

  if (
    !currentProject ||
    !currentUser
  ) {
    return;
  }


  const projectRef =
    doc(
      db,
      "projects",
      projectId
    );


  try {

    // ========================================================
    // PROVIDER MENYELESAIKAN
    // ========================================================

    if (
      currentProject.providerId ===
      currentUser.uid
    ) {

      if (
        !confirm(
          "Apakah pekerjaan benar-benar sudah selesai?"
        )
      ) {
        return;
      }


      await updateDoc(
        projectRef,
        {

          providerCompleted:
            true,

          status:
            "waiting_confirmation",

          updatedAt:
            serverTimestamp()

        }
      );


      currentProject.providerCompleted =
        true;


      currentProject.status =
        "waiting_confirmation";


      showToast(
        "✓ Pekerjaan ditandai selesai."
      );


      renderProject();


      return;

    }


    // ========================================================
    // OWNER KONFIRMASI
    // ========================================================

    if (
      currentProject.ownerId ===
      currentUser.uid
    ) {

      if (
        !currentProject.providerCompleted
      ) {
        return;
      }


      if (
        !confirm(
          "Konfirmasi bahwa proyek telah selesai?"
        )
      ) {
        return;
      }


      await updateDoc(
        projectRef,
        {

          ownerCompleted:
            true,

          providerCompleted:
            true,

          status:
            "completed",

          completedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }
      );


      currentProject.ownerCompleted =
        true;


      currentProject.status =
        "completed";


      showToast(
        "🎉 Proyek berhasil diselesaikan!"
      );


      renderProject();

    }

  } catch (error) {

    console.error(
      "Complete project:",
      error
    );


    alert(
      "Gagal memperbarui proyek:\n\n" +
      error.message
    );

  }

}


// ============================================================
// LISTEN MESSAGES
// ============================================================

function listenMessages() {

  if (
    unsubscribeMessages
  ) {

    unsubscribeMessages();

  }


  const messagesRef =
    collection(
      db,
      "projects",
      projectId,
      "messages"
    );


  const messagesQuery =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "asc"
      )
    );


  unsubscribeMessages =
    onSnapshot(

      messagesQuery,

      snapshot => {

        const messages =
          [];


        snapshot.forEach(
          item => {

            messages.push({

              id:
                item.id,

              ...item.data()

            });

          }
        );


        renderMessages(
          messages
        );

      },

      error => {

        console.error(
          "Messages error:",
          error
        );


        $("chatMessages").innerHTML =
          `

            <div
              class="empty-state"
            >

              ⚠️

              <br><br>

              Gagal memuat pesan.

            </div>

          `;

      }

    );

}


// ============================================================
// RENDER MESSAGES
// ============================================================

function renderMessages(
  messages
) {

  const container =
    $("chatMessages");


  if (!container) {
    return;
  }


  if (
    !messages.length
  ) {

    container.innerHTML =
      `

        <div
          class="empty-state"
        >

          👋

          <br><br>

          Belum ada pesan.

          <br>

          Mulailah diskusi proyek.

        </div>

      `;


    return;

  }


  container.innerHTML =
    messages
      .map(
        message => {

          const mine =
            message.senderId ===
            currentUser.uid;


          return `

            <div
              class="message ${
                mine
                  ? "mine"
                  : "other"
              }"
            >

              <div
                class="message-name"
              >

                ${escapeHTML(
                  mine
                    ? "Anda"
                    : message.senderName ||
                      "Pengguna"
                )}

              </div>


              <div>

                ${escapeHTML(
                  message.text ||
                  ""
                )}

              </div>


              <div
                class="message-time"
              >

                ${formatDateTime(
                  message.createdAt
                )}

              </div>

            </div>

          `;

        }
      )
      .join("");


  setTimeout(
    () => {

      container.scrollTop =
        container.scrollHeight;

    },
    50
  );

}


// ============================================================
// SEND MESSAGE
// ============================================================

$("chatForm")
  ?.addEventListener(
    "submit",
    sendMessage
  );


async function sendMessage(
  event
) {

  event.preventDefault();


  if (
    !currentUser ||
    !currentProject
  ) {
    return;
  }


  const input =
    $("chatInput");


  const text =
    String(
      input.value ||
      ""
    ).trim();


  if (!text) {
    return;
  }


  const button =
    $("sendMessage");


  button.disabled =
    true;


  try {

    await addDoc(

      collection(
        db,
        "projects",
        projectId,
        "messages"
      ),

      {

        text,

        senderId:
          currentUser.uid,

        senderName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Pengguna",

        createdAt:
          serverTimestamp()

      }

    );


    input.value =
      "";

  } catch (error) {

    console.error(
      "Send message:",
      error
    );


    alert(
      "Gagal mengirim pesan:\n\n" +
      error.message
    );

  } finally {

    button.disabled =
      false;

  }

}


// ============================================================
// STATUS TEXT
// ============================================================

function getProjectStatusText(
  status
) {

  switch (
    String(
      status ||
      ""
    ).toLowerCase()
  ) {

    case "active":
      return "Proyek Aktif";


    case "waiting_confirmation":
      return "Menunggu Konfirmasi";


    case "completed":
      return "Selesai";


    default:
      return "Aktif";

  }

}


// ============================================================
// DATE
// ============================================================

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
    typeof value.seconds ===
    "number"
  ) {

    return (
      value.seconds *
      1000
    );

  }


  const time =
    new Date(
      value
    ).getTime();


  return Number.isFinite(
    time
  )
    ? time
    : 0;

}


// ============================================================
// FORMAT DATE TIME
// ============================================================

function formatDateTime(
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

      hour:
        "2-digit",

      minute:
        "2-digit",

      day:
        "2-digit",

      month:
        "short"

    }
  ).format(
    new Date(
      time
    )
  );

}


// ============================================================
// MONEY
// ============================================================

function formatMoney(
  value
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? new Intl.NumberFormat(
        "id-ID"
      ).format(
        number
      )
    : "0";

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
      value ??
      "";

  }

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

  const letter =
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
      letter
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

        background:
          "#111827",

        color:
          "#fff",

        padding:
          "13px 20px",

        borderRadius:
          "999px",

        fontWeight:
          "700",

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
// CLEANUP
// ============================================================

window.addEventListener(
  "beforeunload",
  () => {

    if (
      unsubscribeMessages
    ) {

      unsubscribeMessages();

    }

  }
);


console.log(
  "✅ BUTUH project.js aktif"
);
