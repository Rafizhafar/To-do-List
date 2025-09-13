// ============================
// FIREBASE SETUP
// ============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { auth } from "./firebase-config.js";
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBkl9G-pyUYGh98JYyth2NbuN9SUUKgR0g",
  authDomain: "my-todolist-38c20.firebaseapp.com",
  projectId: "my-todolist-38c20",
  storageBucket: "my-todolist-38c20.firebasestorage.app",
  messagingSenderId: "602725677493",
  appId: "1:602725677493:web:0ef968852d72761453c1fc",
  measurementId: "G-V2QB44L03F",
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getFirestore(app);

// ============================
// DOM ELEMENTS
// ============================
const inputBox = document.getElementById("input-box");
const addBtn = document.getElementById("add-btn");
const logoutBtn = document.getElementById("logoutBtn");
let currentCategory = "today";

// ============================
// TAB HANDLER
// ============================
document.querySelectorAll(".date-tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    document
      .querySelectorAll(".date-tab")
      .forEach((t) => t.classList.remove("active"));
    this.classList.add("active");

    document.querySelectorAll(".task-section").forEach((section) => {
      section.style.display = "none";
    });

    currentCategory = this.dataset.date;
    document.getElementById(currentCategory + "-section").style.display =
      "block";
  });
});

// ============================
// ADD TASK
// ============================
async function addTask(user) {
  if (inputBox.value.trim() === "") {
    alert("Masukan satu agenda !!");
    return;
  }

  try {
    await addDoc(collection(db, "tasks"), {
      text: inputBox.value.trim(),
      category: currentCategory,
      completed: false,
      created: new Date().toISOString(),
      userId: user.uid,
    });

    inputBox.value = "";
    loadData(user);
  } catch (e) {
    console.error("Error adding task: ", e);
  }
}

// ============================
// LOAD TASKS
// ============================
async function loadData(user) {
  ["yesterday", "today", "tomorrow"].forEach((category) => {
    document.getElementById(category + "-container").innerHTML = "";
  });

  try {
    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const category = task.category;
      const container = document.getElementById(category + "-container");

      let li = document.createElement("li");
      li.textContent = task.text;
      li.dataset.id = docSnap.id;
      li.dataset.category = category;
      li.dataset.created = task.created;

      if (task.completed) {
        li.classList.add("checked");
      }

      // button hapus
      let span = document.createElement("span");
      li.appendChild(span);

      container.appendChild(li);
    });

    updateStats();
  } catch (e) {
    console.error("Error loading tasks: ", e);
  }
}

// ============================
// AUTH STATE (Login/Logout)
// ============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadData(user);
    addBtn.addEventListener("click", () => addTask(user));
    inputBox.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTask(user);
    });
  } else {
    window.location.href = "index.html"; // balik ke login kalau belum login
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    alert("Gagal logout: " + error.message);
  }
});

// ============================
// UPDATE / DELETE TASK
// ============================
document.addEventListener("click", async function (e) {
  if (e.target.tagName === "LI") {
    const id = e.target.dataset.id;
    const completed = !e.target.classList.contains("checked");
    e.target.classList.toggle("checked");
    await updateDoc(doc(db, "tasks", id), { completed });
    updateStats();
  } else if (e.target.tagName === "SPAN") {
    const li = e.target.parentElement;
    const id = li.dataset.id;
    await deleteDoc(doc(db, "tasks", id));
    li.remove();
    updateStats();
  }
});

// ============================
// UPDATE STATS
// ============================
function updateStats() {
  let totalTasks = 0;
  let completedTasks = 0;

  ["yesterday", "today", "tomorrow"].forEach((category) => {
    const container = document.getElementById(category + "-container");
    const tasks = container.querySelectorAll("li");
    const completed = container.querySelectorAll("li.checked");

    document.getElementById(category + "-count").textContent = tasks.length;

    totalTasks += tasks.length;
    completedTasks += completed.length;

    if (tasks.length === 0) {
      if (!container.querySelector(".empty-state")) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.innerHTML = "Belum ada task untuk kategori ini";
        container.appendChild(emptyState);
      }
    } else {
      const emptyState = container.querySelector(".empty-state");
      if (emptyState) emptyState.remove();
    }
  });

  document.getElementById("total-tasks").textContent = totalTasks;
  document.getElementById("completed-tasks").textContent = completedTasks;
  document.getElementById("remaining-tasks").textContent =
    totalTasks - completedTasks;
}
