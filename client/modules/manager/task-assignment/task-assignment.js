let projects = [];
let tasks = [];
let members = [];

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });

  if (!ready) return;

  bindTaskForm();
  await loadAssignmentData();
});

function bindTaskForm() {
  document.getElementById("taskForm")?.addEventListener("submit", saveTask);
  document.getElementById("projectId")?.addEventListener("change", () => {
    syncProjectFields();
    renderTaskTable();
  });
  document.getElementById("resetTaskForm")?.addEventListener("click", resetTaskForm);
}

async function loadAssignmentData() {
  try {
    const [projectResponse, taskResponse, userResponse] = await Promise.all([API.get("/projects"), API.get("/tasks"), API.get("/users")]);
    projects = Array.isArray(projectResponse.data) ? projectResponse.data : [];
    tasks = Array.isArray(taskResponse.data) ? taskResponse.data : [];
    const users = Array.isArray(userResponse.data) ? userResponse.data : [];
    members = users.filter((user) => normalizeRole(user.role) === "MEMBER" && user.status === "ACTIVE");
  } catch (error) {
    projects = window.enterpriseStore?.getProjects?.() || [];
    tasks = window.enterpriseStore?.getTasks?.() || [];
    const users = window.enterpriseStore?.getUsers?.() || [];
    members = users.filter((user) => normalizeRole(user.role) === "MEMBER" && user.status === "ACTIVE");
  }

  populateProjectOptions();
  populateUserOptions("assignee", members, "Select member");
  syncProjectFields();
  renderTaskTable();
  renderTaskMetrics();
}

function populateProjectOptions() {
  const target = document.getElementById("projectId");
  if (!target) return;

  const managerName = String(getCurrentUser?.().name || "").toLowerCase();
  const filteredProjects = projects.filter((project) => !project.manager || String(project.manager).toLowerCase() === managerName);

  target.innerHTML = filteredProjects
    .map((project) => `<option value="${project._id}">${escapeHtml(project.projectName)} • ${escapeHtml(project.clientName || "-")}</option>`)
    .join("");

  const queryProjectId = new URLSearchParams(window.location.search).get("projectId");
  if (queryProjectId && filteredProjects.some((project) => String(project._id) === String(queryProjectId))) {
    target.value = queryProjectId;
  }
}

function populateUserOptions(elementId, items, placeholder) {
  const target = document.getElementById(elementId);
  if (!target) return;
  target.innerHTML = [`<option value="">${placeholder}</option>`]
    .concat(items.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} • ${escapeHtml(item.department || "-")}</option>`))
    .join("");
}

function syncProjectFields() {
  const project = getSelectedProject();
  const departmentField = document.getElementById("department");
  if (departmentField) departmentField.value = project?.department || "";
}

function getSelectedProject() {
  const projectId = document.getElementById("projectId")?.value;
  return projects.find((project) => String(project._id) === String(projectId)) || null;
}

function getSelectedProjectTasks() {
  const project = getSelectedProject();
  if (!project) return [];
  return tasks.filter((task) => String(task.projectId) === String(project._id));
}

function renderTaskMetrics() {
  const selectedTasks = getSelectedProjectTasks();
  setText("taskCount", selectedTasks.length);
  setText("reviewCount", selectedTasks.filter((task) => ["Pending", "In Review", "To Do"].includes(task.status)).length);
  setText("assignedToday", selectedTasks.filter((task) => isToday(task.createdAt)).length);
}

function renderTaskTable() {
  const target = document.getElementById("taskTableBody");
  if (!target) return;

  const selectedTasks = getSelectedProjectTasks();
  renderTaskMetrics();

  if (!selectedTasks.length) {
    target.innerHTML = '<tr><td colspan="6" class="empty-state">No tasks yet for this project.</td></tr>';
    return;
  }

  target.innerHTML = selectedTasks
    .map(
      (task) => `
        <tr>
          <td><strong>${escapeHtml(task.title || "-")}</strong><div class="status-note">${escapeHtml(task.projectName || "-")}</div></td>
          <td>${escapeHtml(task.assignee || "-")}</td>
          <td><span class="priority-pill ${priorityClass(task.priority)}">${escapeHtml(task.priority || "Medium")}</span></td>
          <td><span class="status-pill ${statusClass(task.status)}">${escapeHtml(task.status || "-")}</span></td>
          <td>${formatShortDate(task.deadline)}</td>
          <td><button class="btn ghost-btn" type="button" onclick="editTask('${task._id}')">Edit</button></td>
        </tr>
      `,
    )
    .join("");
}

async function saveTask(event) {
  event.preventDefault();

  const project = getSelectedProject();
  if (!project) {
    showToast?.("Select a project first", "error");
    return;
  }

  const payload = {
    _id: document.getElementById("taskId").value || `tsk-${Date.now()}`,
    projectId: project._id,
    projectName: project.projectName,
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    department: project.department,
    manager: getCurrentUser?.().name || project.manager || "",
    lead: "",
    assignee: document.getElementById("assignee").value,
    priority: document.getElementById("priority").value,
    status: document.getElementById("status").value,
    deadline: document.getElementById("deadline").value,
    progress: Number(document.getElementById("progress").value || 0),
    createdAt: new Date().toISOString(),
  };

  try {
    await API.post("/tasks", payload);
  } catch (error) {
    window.enterpriseStore?.upsertTask?.(payload);
  }

  tasks = window.enterpriseStore?.getTasks?.() || tasks.filter((item) => item._id !== payload._id).concat(payload);
  showToast?.("Task assigned successfully", "success");
  resetTaskForm();
  renderTaskTable();
}

function editTask(id) {
  const task = tasks.find((item) => item._id === id);
  if (!task) return;

  document.getElementById("taskId").value = task._id;
  document.getElementById("projectId").value = task.projectId;
  syncProjectFields();
  document.getElementById("title").value = task.title || "";
  document.getElementById("description").value = task.description || "";
  document.getElementById("assignee").value = task.assignee || "";
  document.getElementById("priority").value = task.priority || "Medium";
  document.getElementById("status").value = task.status || "Pending";
  document.getElementById("deadline").value = formatInputDate(task.deadline);
  document.getElementById("progress").value = Number(task.progress || 0);
}

function resetTaskForm() {
  document.getElementById("taskForm")?.reset();
  document.getElementById("taskId").value = "";
  populateProjectOptions();
  populateUserOptions("assignee", members, "Select member");
  syncProjectFields();
}

function isToday(value) {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
}

function formatInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

window.editTask = editTask;
