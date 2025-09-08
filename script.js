// ============================
// FIREBASE SETUP
// ============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
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
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ============================
// DEVICE ID (unik per device)
// ============================
let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = "device-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  localStorage.setItem("deviceId", deviceId);
}

// ============================
// DOM ELEMENTS
// ============================
const inputBox = document.getElementById("input-box");
let currentCategory = "today";

// Tabs
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
async function addTask() {
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
      deviceId: deviceId,
    });

    inputBox.value = "";
    loadData();
  } catch (e) {
    console.error("Error adding task: ", e);
  }
}

// ============================
// LOAD TASKS (filter by deviceId)
// ============================
async function loadData() {
  ["yesterday", "today", "tomorrow"].forEach((category) => {
    document.getElementById(category + "-container").innerHTML = "";
  });

  try {
    const q = query(collection(db, "tasks"), where("deviceId", "==", deviceId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const category = task.category;
      const container = document.getElementById(category + "-container");

      let li = document.createElement("li");
      li.innerHTML = task.text;
      li.dataset.id = docSnap.id;
      li.dataset.category = category;
      li.dataset.created = task.created;

      if (task.completed) {
        li.classList.add("checked");
      }

      container.appendChild(li);

      let span = document.createElement("span");
      li.appendChild(span);
    });

    updateStats();
  } catch (e) {
    console.error("Error loading tasks: ", e);
  }
}

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
// ALLOW ENTER TO ADD
// ============================
inputBox.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
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

  document.getElementById("add-btn").addEventListener("click", addTask);
  document.getElementById("total-tasks").textContent = totalTasks;
  document.getElementById("completed-tasks").textContent = completedTasks;
  document.getElementById("remaining-tasks").textContent =
    totalTasks - completedTasks;
}

// ============================
// INIT APP
// ============================
loadData();
updateStats();
