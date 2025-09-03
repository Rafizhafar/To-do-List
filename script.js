const inputBox = document.getElementById("input-box");
let currentCategory = "today";

// Initialize tabs
document.querySelectorAll(".date-tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    // Remove active class from all tabs
    document
      .querySelectorAll(".date-tab")
      .forEach((t) => t.classList.remove("active"));
    // Add active class to clicked tab
    this.classList.add("active");

    // Hide all sections
    document.querySelectorAll(".task-section").forEach((section) => {
      section.style.display = "none";
    });

    // Show selected section
    currentCategory = this.dataset.date;
    document.getElementById(currentCategory + "-section").style.display =
      "block";
  });
});

function addTask() {
  if (inputBox.value.trim() === "") {
    alert("Masukan satu agenda !!");
    return;
  }

  const listContainer = document.getElementById(currentCategory + "-container");
  let li = document.createElement("li");
  li.innerHTML = inputBox.value.trim();
  li.dataset.category = currentCategory;
  li.dataset.created = new Date().toISOString();

  listContainer.appendChild(li);

  let span = document.createElement("span");
  li.appendChild(span);

  inputBox.value = "";
  saveData();
  updateStats();
}

// Event delegation for all task containers
document.addEventListener("click", function (e) {
  if (e.target.tagName === "LI") {
    e.target.classList.toggle("checked");
    saveData();
    updateStats();
  } else if (e.target.tagName === "SPAN") {
    e.target.parentElement.remove();
    saveData();
    updateStats();
  }
});

// Allow Enter key to add task
inputBox.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});

function saveData() {
  const allTasks = {};
  ["yesterday", "today", "tomorrow"].forEach((category) => {
    const container = document.getElementById(category + "-container");
    const tasks = [];
    container.querySelectorAll("li").forEach((li) => {
      tasks.push({
        text: li.firstChild.textContent,
        completed: li.classList.contains("checked"),
        created: li.dataset.created,
      });
    });
    allTasks[category] = tasks;
  });

  // Store in memory (localStorage not available in Claude artifacts)
  window.todoData = allTasks;
}

function loadData() {
  if (!window.todoData) return;

  ["yesterday", "today", "tomorrow"].forEach((category) => {
    const container = document.getElementById(category + "-container");
    container.innerHTML = "";

    if (window.todoData[category]) {
      window.todoData[category].forEach((task) => {
        let li = document.createElement("li");
        li.innerHTML = task.text;
        li.dataset.category = category;
        li.dataset.created = task.created;

        if (task.completed) {
          li.classList.add("checked");
        }

        container.appendChild(li);

        let span = document.createElement("span");
        li.appendChild(span);
      });
    }
  });
  updateStats();
}

function updateStats() {
  let totalTasks = 0;
  let completedTasks = 0;

  ["yesterday", "today", "tomorrow"].forEach((category) => {
    const container = document.getElementById(category + "-container");
    const tasks = container.querySelectorAll("li");
    const completed = container.querySelectorAll("li.checked");
    const remaining = tasks.length - completed.length;

    // Update category counter
    document.getElementById(category + "-count").textContent = tasks.length;

    // Add to totals
    totalTasks += tasks.length;
    completedTasks += completed.length;

    // Show empty state if no tasks
    if (tasks.length === 0) {
      if (!container.querySelector(".empty-state")) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.innerHTML = "Belum ada task untuk kategori ini";
        container.appendChild(emptyState);
      }
    } else {
      const emptyState = container.querySelector(".empty-state");
      if (emptyState) {
        emptyState.remove();
      }
    }
  });

  // Update summary statistics
  document.getElementById("total-tasks").textContent = totalTasks;
  document.getElementById("completed-tasks").textContent = completedTasks;
  document.getElementById("remaining-tasks").textContent =
    totalTasks - completedTasks;
}

// Initialize app
loadData();
updateStats();
