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
  orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { auth } from "./firebase-config.js";
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

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
const tasksContainer = document.getElementById("tasks-container");
const taskCount = document.getElementById("task-count");
const totalTasksEl = document.getElementById("total-tasks");
const completedTasksEl = document.getElementById("completed-tasks");
const remainingTasksEl = document.getElementById("remaining-tasks");
const quickFilterBtns = document.querySelectorAll(".quick-filter-btn");
const filterDateInput = document.getElementById("filter-date");

let currentUser = null;
let currentFilter = "today"; // can be: "today","yesterday","tomorrow","all" or "YYYY-MM-DD"

// ============================
// HELPERS - DATES & PARSE
// ============================
function getDateString(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
}

function getDateCategory(dateString) {
  if (!dateString) return null;
  const today = getDateString(0);
  const yesterday = getDateString(-1);
  const tomorrow = getDateString(1);

  if (dateString === yesterday) return "yesterday";
  if (dateString === today) return "today";
  if (dateString === tomorrow) return "tomorrow";
  return null;
}

function getCategoryDate(category) {
  switch (category) {
    case "yesterday":
      return getDateString(-1);
    case "tomorrow":
      return getDateString(1);
    case "today":
    default:
      return getDateString(0);
  }
}

// Safely parse a stored task's date (handles string, Timestamp, number)
function parseTaskDateField(task) {
  if (!task) return null;
  if (task.taskDate) return task.taskDate; // expected "YYYY-MM-DD"
  // fallback: try createdAt
  const created = task.createdAt;
  if (!created) return null;

  // Firestore Timestamp (has toDate), or number (ms), or ISO string
  if (typeof created === "object" && typeof created.toDate === "function") {
    return created.toDate().toISOString().split("T")[0];
  }
  if (typeof created === "number") {
    return new Date(created).toISOString().split("T")[0];
  }
  if (typeof created === "string") {
    return new Date(created).toISOString().split("T")[0];
  }
  return null;
}

// ============================
// FEEDBACK (small toast)
// ============================
function showFeedback(message, type = "success") {
  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = `feedback-message ${type}`;
  feedbackDiv.textContent = message;
  feedbackDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 18px;
    background: ${type === "success" ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)"};
    color: white;
    border-radius: 10px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.25);
    z-index: 9999;
    font-weight: 600;
  `;
  document.body.appendChild(feedbackDiv);
  setTimeout(() => {
    feedbackDiv.style.opacity = "0";
    setTimeout(() => feedbackDiv.remove(), 300);
  }, 2200);
}

// ============================
// ADD TASK
// ============================
// ============================
// ADD TASK
// ============================
async function addTask(user) {
  if (!user) {
    alert("Anda harus login terlebih dahulu!");
    return;
  }
  if (!inputBox || inputBox.value.trim() === "") {
    alert("Masukan satu agenda !!");
    return;
  }

  // Ambil tanggal dari input
  const taskDateInput = document.getElementById("task-date");
  if (!taskDateInput || !taskDateInput.value) {
    showFeedback("Harap pilih tanggal untuk task ini!", "error");
    return;
  }
  const taskDate = taskDateInput.value;

  const payload = {
    text: inputBox.value.trim(),
    category: getDateCategory(taskDate) || "today",
    taskDate: taskDate,
    completed: false,
    createdAt: Timestamp.now(),
    userId: user.uid,
  };

  try {
    await addDoc(collection(db, "tasks"), payload);
    inputBox.value = "";
    taskDateInput.value = "";
    showFeedback("Task berhasil ditambahkan!", "success");
    await loadData(user);
  } catch (err) {
    console.error("Error adding task:", err);
    showFeedback("Gagal menambahkan task: " + (err.message || err), "error");
  }
}


// ============================
// LOAD TASKS (and update stats)
// ============================
async function loadData(user) {
  if (!user) return;

  tasksContainer.innerHTML = "";
  try {
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    let totalTasks = 0;
    let completedTasks = 0;
    let displayedCount = 0;

    // iterate all tasks for stats and display filter
    snapshot.forEach((docSnap) => {
      totalTasks++;
      const data = docSnap.data();
      if (data.completed) completedTasks++;

      const taskDate = parseTaskDateField(data); // YYYY-MM-DD or null
      const taskCategory = getDateCategory(taskDate); // yesterday/today/tomorrow/null

      // decide if show according to currentFilter
      let show = false;
      if (currentFilter === "all") {
        show = true;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(currentFilter)) {
        // specific date string
        if (taskDate === currentFilter) show = true;
      } else {
        // named filters: today/yesterday/tomorrow
        if (taskCategory === currentFilter) show = true;
      }

      if (show) {
        const li = document.createElement("li");
        li.textContent = data.text || "(no text)";
        li.dataset.id = docSnap.id;
        li.dataset.taskDate = taskDate || "";
        li.dataset.category = taskCategory || "";
        if (data.completed) li.classList.add("checked");

        // delete button
        const span = document.createElement("span");
        span.setAttribute("title", "Hapus task");
        span.style.cursor = "pointer";
        span.style.userSelect = "none";
        // span text is set by CSS ::before; but put fallback
        span.innerHTML = "&times;";
        li.appendChild(span);

        tasksContainer.appendChild(li);
        displayedCount++;
      }
    });

    // update counters
    taskCount.textContent = displayedCount;
    totalTasksEl.textContent = totalTasks;
    completedTasksEl.textContent = completedTasks;
    remainingTasksEl.textContent = Math.max(0, totalTasks - completedTasks);

    // empty state when nothing displayed
    if (displayedCount === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.innerHTML = "Belum ada task untuk filter ini";
      tasksContainer.appendChild(emptyState);
    }
  } catch (err) {
    console.error("Error loading tasks:", err);
    showFeedback("Gagal memuat tasks: " + (err.message || err), "error");
  }
}

// ============================
// AUTH STATE (Login/Logout)
// ============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadData(user);
  } else {
    currentUser = null;
    // redirect to login
    window.location.href = "index.html";
  }
});

// ============================
// BUTTONS & FILTER HOOKS
// ============================
if (addBtn) {
  addBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Anda harus login terlebih dahulu!");
      return;
    }
    addTask(currentUser);
  });
}
if (inputBox) {
  inputBox.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!currentUser) {
        alert("Anda harus login terlebih dahulu!");
        return;
      }
      addTask(currentUser);
    }
  });
}

// quick filter buttons
quickFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    quickFilterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    currentFilter = f || "today";
    // clear explicit date input when using quick filter
    if (filterDateInput) filterDateInput.value = "";
    if (currentUser) loadData(currentUser);
  });
});

// filter-date input -> use specific date as filter
if (filterDateInput) {
  filterDateInput.addEventListener("change", () => {
    const val = filterDateInput.value;
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      // clear active quick buttons
      quickFilterBtns.forEach((b) => b.classList.remove("active"));
      currentFilter = val;
      if (currentUser) loadData(currentUser);
    }
  });
}

// logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      showFeedback("Berhasil logout!", "success");
      setTimeout(() => (window.location.href = "index.html"), 800);
    } catch (err) {
      console.error("Logout error:", err);
      showFeedback("Gagal logout: " + (err.message || err), "error");
    }
  });
}

// ============================
// CLICK DELEGATION: TOGGLE COMPLETE & DELETE
// ============================
document.addEventListener("click", async (e) => {
  // if click an element inside a list item
  const li = e.target.closest("li");
  if (!li) return;

  // If clicked the span (delete)
  if (e.target.closest("span")) {
    const id = li.dataset.id;
    if (!id) return;
    try {
      await deleteDoc(doc(db, "tasks", id));
      showFeedback("Task berhasil dihapus!", "success");
      // reload to keep stats consistent
      if (currentUser) await loadData(currentUser);
    } catch (err) {
      console.error("Error deleting task:", err);
      showFeedback("Gagal menghapus task!", "error");
    }
    return;
  }

  // else: toggle completed
  const id = li.dataset.id;
  if (!id) return;
  const newCompleted = !li.classList.contains("checked");
  // optimistic UI
  li.classList.toggle("checked", newCompleted);
  try {
    await updateDoc(doc(db, "tasks", id), { completed: newCompleted });
    // reload to update counters
    if (currentUser) await loadData(currentUser);
  } catch (err) {
    console.error("Error updating task:", err);
    // revert UI
    li.classList.toggle("checked", !newCompleted);
    showFeedback("Gagal update task!", "error");
  }
});

// ============================
// small animation CSS (optional)
// ============================
const style = document.createElement("style");
style.textContent = `
@keyframes slideInRight { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
@keyframes slideOutRight { from { transform: translateX(0); opacity: 1 } to { transform: translateX(20px); opacity: 0 } }
`;
document.head.appendChild(style);
