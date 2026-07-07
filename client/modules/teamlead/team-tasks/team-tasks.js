const taskPlannerState = {
  tasks: [],
  subtasks: [],
  members: [],
  currentUser: null,
  submitMode: "save",
};

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "TEAM_LEAD",
  });
  if (!ready) return;

  taskPlannerState.currentUser = getCurrentUser?.() || {};
  bindSubtaskForm();
  await loadPlannerData();
  applyQueryContext();
});

function bindSubtaskForm() {
  const form = document.getElementById("subtaskForm");
  form?.addEventListener("submit", saveSubtask);
  form?.querySelectorAll("button[type='submit']").forEach((button) => {
    button.addEventListener("click", () => {
      taskPlannerState.submitMode = button.dataset.submitMode || "save";
    });
  });
  document.getElementById("resetSubtaskForm")?.addEventListener("click", resetSubtaskForm);
}

async function loadPlannerData() {
  const fallbackTasks = filterLeadTasks(window.enterpriseStore?.getTasks?.() || []);
  const fallbackSubtasks = filterLeadSubtasks(window.enterpriseStore?.getSubtasks?.() || []);
  const fallbackMembers = getFallbackMembers();

  try {
    const [tasksResponse, subtasksResponse, membersResponse] = await Promise.all([
      apiRequest("/tasks"),
      apiRequest("/subtasks"),
      apiRequest("/users").catch(() => ({ data: fallbackMembers })),
    ]);

    taskPlannerState.tasks = filterLeadTasks(Array.isArray(tasksResponse.data) ? tasksResponse.data : fallbackTasks);
    taskPlannerState.subtasks = filterLeadSubtasks(Array.isArray(subtasksResponse.data) ? subtasksResponse.data : fallbackSubtasks);
    taskPlannerState.members = normalizeMembers(Array.isArray(membersResponse.data) ? membersResponse.data : fallbackMembers);
  } catch (error) {
    taskPlannerState.tasks = fallbackTasks;
    taskPlannerState.subtasks = fallbackSubtasks;
    taskPlannerState.members = normalizeMembers(fallbackMembers);
  }

  populateTaskOptions();
  populateMemberOptions();
  renderPlanner();
}

function filterLeadTasks(tasks) {
  const currentUser = taskPlannerState.currentUser || {};
  return (tasks || []).filter((task) => String(task.lead || task.teamLead || "") === String(currentUser.name || ""));
}

function filterLeadSubtasks(subtasks) {
  const currentUser = taskPlannerState.currentUser || {};
  return (subtasks || []).filter((item) => String(item.reviewer || item.lead || "") === String(currentUser.name || ""));
}

function getFallbackMembers() {
  return (window.enterpriseStore?.getUsers?.() || []).filter((user) => normalizeRole(user.role) === "MEMBER" && user.status === "ACTIVE");
}

function normalizeMembers(members) {
  const workloadSource = taskPlannerState.subtasks || [];

  return members
    .filter((member) => normalizeRole(member.role) === "MEMBER" && String(member.status || "ACTIVE").toUpperCase() === "ACTIVE")
    .map((member) => {
      const activeLoad = workloadSource.filter((item) => item.assignee === member.name && !["Approved", "Completed"].includes(item.status)).length;
      const score = Math.max(72, 94 - activeLoad * 6);
      return {
        ...member,
        skills: member.skills || [member.department || "Delivery"],
        currentWorkload: activeLoad,
        performanceScore: score,
        availability: activeLoad < 3 ? "Available" : "Busy",
        onlineStatus: activeLoad < 2 ? "Online" : "Focused",
      };
    });
}

function populateTaskOptions() {
  const taskTitleInput = document.getElementById("taskTitle");
  const taskIdInput = document.getElementById("taskId");
  if (!taskTitleInput || !taskIdInput) return;

  if (!taskPlannerState.tasks.length) {
    taskTitleInput.value = "";
    taskTitleInput.placeholder = "No main task available";
    taskIdInput.value = "";
    return;
  }

  taskTitleInput.placeholder = "Type main task title or use Break Down from the card below";
  taskTitleInput.addEventListener("input", () => {
    const resolvedTask = findTaskFromInput(taskTitleInput.value);
    taskIdInput.value = resolvedTask?._id || "";
  });
}

function populateMemberOptions() {
  const target = document.getElementById("subtaskAssignee");
  target.innerHTML = taskPlannerState.members.length
    ? taskPlannerState.members
        .map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} • ${escapeHtml(member.department || "Delivery")} • Load ${member.currentWorkload}</option>`)
        .join("")
    : '<option value="">No member available</option>';
}

function renderPlanner() {
  setText("taskTotal", taskPlannerState.tasks.length);
  setText("subtaskTotal", taskPlannerState.subtasks.length);
  setText("reviewQueue", taskPlannerState.subtasks.filter((item) => item.status === "In Review").length);

  renderMembers();
  renderMainTasks();
  renderSubtasks();
}

function renderMembers() {
  document.getElementById("memberBoard").innerHTML = taskPlannerState.members.length
    ? taskPlannerState.members
        .sort((a, b) => a.currentWorkload - b.currentWorkload || b.performanceScore - a.performanceScore)
        .map(
          (member) => `
            <article class="list-card member-card">
              <div class="card-topline">
                <strong>${escapeHtml(member.name)}</strong>
                <span class="status-pill ${member.currentWorkload < 3 ? "status-active" : "status-in-review"}">${escapeHtml(member.availability)}</span>
              </div>
              <span class="list-meta">Skills: ${escapeHtml((member.skills || []).join(", "))}</span>
              <div class="meta-row">
                <span class="status-note">Workload ${member.currentWorkload}</span>
                <span class="status-note">Performance ${member.performanceScore}%</span>
                <span class="status-note">${escapeHtml(member.onlineStatus)}</span>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No active member found for assignment.</p>';
}

function renderMainTasks() {
  document.getElementById("taskCards").innerHTML = taskPlannerState.tasks.length
    ? taskPlannerState.tasks
        .map(
          (task) => `
            <article class="list-card">
              <div class="card-topline">
                <strong>${escapeHtml(task.title)}</strong>
                <span class="priority-pill ${priorityClass(task.priority || "Medium")}">${escapeHtml(task.priority || "Medium")}</span>
              </div>
              <span class="list-meta">${escapeHtml(task.projectName || "")} • ${escapeHtml(task.status || "Assigned")}</span>
              <p class="status-note">${escapeHtml(task.description || "Open this task and split it into visible subtasks for the team.")}</p>
              <div class="meta-row">
                <span class="status-note">Deadline ${formatShortDate(task.deadline)}</span>
                <span class="status-note">Progress ${Number(task.progress || 0)}%</span>
                <button class="btn tiny-btn" type="button" onclick="prefillTask('${task._id}')">Break Down</button>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No main task assigned by the manager yet.</p>';
}

function renderSubtasks() {
  document.getElementById("subtaskCards").innerHTML = taskPlannerState.subtasks.length
    ? taskPlannerState.subtasks
        .map(
          (subtask) => `
            <article class="list-card subtask-card">
              <div class="card-topline">
                <strong>${escapeHtml(subtask.title)}</strong>
                <span class="status-pill ${statusClass(subtask.status || "Assigned")}">${escapeHtml(subtask.status || "Assigned")}</span>
              </div>
              <span class="list-meta">${escapeHtml(getTaskTitle(subtask.taskId))} • ${escapeHtml(subtask.assignee || "Unassigned")}</span>
              <p class="status-note">${escapeHtml(subtask.instructions || subtask.description || "Instructions not added yet.")}</p>
              <div class="meta-row">
                <span class="status-note">Hours ${Number(subtask.estimatedHours || 0)}</span>
                <span class="status-note">Deadline ${formatShortDate(subtask.deadline)}</span>
                <button class="btn tiny-btn" type="button" onclick="openSubtaskChat('${escapeJs(subtask.roomId || "")}')">Open Chat</button>
                <button class="btn tiny-btn" type="button" onclick="startSubtaskCall('${escapeJs(subtask.teamId || "")}')">Call</button>
                <button class="btn tiny-btn" type="button" onclick="startSubtaskMeeting('${escapeJs(subtask.teamId || "")}')">Meeting</button>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No subtasks created yet. Use the planner to assign one.</p>';
}

async function saveSubtask(event) {
  event.preventDefault();
  const taskInput = document.getElementById("taskTitle");
  const taskIdInput = document.getElementById("taskId");
  const typedTask = taskInput?.value.trim() || "";
  const selectedTaskId = taskIdInput?.value || "";
  let task =
    taskPlannerState.tasks.find((item) => String(item._id) === String(selectedTaskId)) ||
    findTaskFromInput(typedTask);

  if (!typedTask) {
    showToast?.("Main task title type kara.", "error", { title: "Task Missing" });
    return;
  }

  if (!task) {
    task = await createCustomMainTask(typedTask);
  }

  if (taskInput) {
    taskInput.value = buildTaskLabel(task);
  }
  if (taskIdInput) {
    taskIdInput.value = task._id;
  }

  const payload = {
    taskId: task._id,
    projectId: task.projectId,
    title: document.getElementById("subtaskTitle").value.trim(),
    description: document.getElementById("subtaskInstructions").value.trim(),
    instructions: document.getElementById("subtaskInstructions").value.trim(),
    assignee: document.getElementById("subtaskAssignee").value,
    reviewer: taskPlannerState.currentUser?.name || task.lead || "",
    reviewerId: taskPlannerState.currentUser?._id || task.leadId || null,
    priority: document.getElementById("subtaskPriority").value,
    status: document.getElementById("subtaskStatus").value,
    deadline: document.getElementById("subtaskDeadline").value || task.deadline || "",
    estimatedHours: Number(document.getElementById("subtaskHours").value || 0),
    progress: document.getElementById("subtaskStatus").value === "Active" ? 20 : 0,
  };

  try {
    const response = await apiRequest("/subtasks", {
      method: "POST",
      body: payload,
    });
    const saved = response.data;
    taskPlannerState.subtasks.unshift(saved);
    window.enterpriseStore?.upsertSubtask?.(saved);
    showToast?.("Assignment saved. Popup, notification and email workflow triggered.", "success", {
      title: "Task Assigned",
      actionUrl: saved.roomId ? `../../collaboration/chat/chat.html?roomId=${encodeURIComponent(saved.roomId)}` : "../approvals/approvals.html",
    });
    renderPlanner();
    resetSubtaskForm();
    if (taskPlannerState.submitMode === "chat" && saved.roomId) {
      window.location.href = `../../collaboration/chat/chat.html?roomId=${encodeURIComponent(saved.roomId)}&welcome=assigned`;
    }
  } catch (error) {
    const localRecord = {
      _id: `sub-${Date.now()}`,
      ...payload,
      roomId: `local_${Date.now()}`,
    };
    window.enterpriseStore?.upsertSubtask?.(localRecord);
    taskPlannerState.subtasks.unshift(localRecord);
    showToast?.(error.message || "Backend unavailable, saved locally for demo continuity.", "warning", { title: "Local Save" });
    renderPlanner();
    resetSubtaskForm();
  }
}

function resetSubtaskForm() {
  document.getElementById("subtaskForm")?.reset();
  document.getElementById("taskId").value = "";
  document.getElementById("subtaskPriority").value = "Medium";
  document.getElementById("subtaskStatus").value = "Assigned";
}

function getTaskTitle(taskId) {
  return taskPlannerState.tasks.find((task) => String(task._id) === String(taskId))?.title || "Main task";
}

function applyQueryContext() {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get("taskId");
  if (taskId) {
    prefillTask(taskId);
  }

  const subtaskId = params.get("subtaskId");
  if (subtaskId) {
    const match = taskPlannerState.subtasks.find((item) => String(item._id) === String(subtaskId));
    if (match?.taskId) {
      prefillTask(match.taskId);
      showToast?.("Review-triggered context loaded for this subtask.", "info", { title: "Focused Task" });
    }
  }
}

function prefillTask(taskId) {
  const task = taskPlannerState.tasks.find((item) => String(item._id) === String(taskId));
  if (task) {
    document.getElementById("taskId").value = taskId;
    document.getElementById("taskTitle").value = buildTaskLabel(task);
    document.getElementById("subtaskPriority").value = task.priority || "Medium";
    document.getElementById("subtaskDeadline").value = task.deadline ? String(task.deadline).slice(0, 10) : "";
    showToast?.(`Breakdown opened for ${task.title}.`, "info", { title: "Task Ready" });
  }
}

function buildTaskLabel(task) {
  return `${task.title}${task.projectName ? ` - ${task.projectName}` : ""}`;
}

function normalizeText(value = "") {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function findTaskFromInput(rawValue = "") {
  const query = normalizeText(rawValue);
  if (!query) return null;

  return (
    taskPlannerState.tasks.find((task) => normalizeText(buildTaskLabel(task)) === query) ||
    taskPlannerState.tasks.find((task) => normalizeText(task.title) === query) ||
    taskPlannerState.tasks.find((task) => normalizeText(buildTaskLabel(task)).includes(query)) ||
    null
  );
}

async function createCustomMainTask(taskTitle) {
  const payload = {
    title: taskTitle,
    description: document.getElementById("subtaskInstructions").value.trim() || "Custom main task created by team lead.",
    priority: document.getElementById("subtaskPriority").value || "Medium",
    status: "Assigned",
    deadline: document.getElementById("subtaskDeadline").value || "",
    lead: taskPlannerState.currentUser?.name || "",
    leadId: taskPlannerState.currentUser?._id || null,
    leadEmail: taskPlannerState.currentUser?.email || "",
    department: taskPlannerState.currentUser?.department || "Delivery",
    projectName: "Custom Team Lead Task",
  };

  try {
    const response = await apiRequest("/tasks", {
      method: "POST",
      body: payload,
    });
    const task = response.data;
    taskPlannerState.tasks.unshift(task);
    window.enterpriseStore?.upsertTask?.(task);
    renderPlanner();
    showToast?.("Custom main task create zala.", "success", { title: "Main Task Ready" });
    return task;
  } catch (error) {
    const localTask = {
      _id: `local-task-${Date.now()}`,
      ...payload,
      progress: 0,
    };
    taskPlannerState.tasks.unshift(localTask);
    window.enterpriseStore?.upsertTask?.(localTask);
    renderPlanner();
    showToast?.(error.message || "Backend unavailable, custom main task saved locally.", "warning", { title: "Local Main Task" });
    return localTask;
  }
}

async function startSubtaskCall(teamId) {
  if (!teamId) {
    showToast?.("Chat room team is not ready yet.", "warning", { title: "Call Not Ready" });
    return;
  }

  try {
    await apiRequest("/communications/calls/start", {
      method: "POST",
      body: { teamId, mode: "AUDIO" },
    });
    showToast?.("Call popup sent to assigned members.", "success", { title: "Call Started" });
  } catch (error) {
    showToast?.(error.message || "Unable to start call.", "error", { title: "Call Failed" });
  }
}

async function startSubtaskMeeting(teamId) {
  if (!teamId) {
    showToast?.("Assign the task first to create its meeting room.", "warning", { title: "Meeting Not Ready" });
    return;
  }

  try {
    await apiRequest("/meetings/start", {
      method: "POST",
      body: { teamId, title: "Task Clarification Meeting", meetingType: "VIDEO" },
    });
    showToast?.("Meeting invitation sent with popup and email workflow.", "success", { title: "Meeting Started" });
  } catch (error) {
    showToast?.(error.message || "Unable to start meeting.", "error", { title: "Meeting Failed" });
  }
}

function openSubtaskChat(roomId) {
  if (!roomId) {
    showToast?.("Chat room will appear after backend assignment sync.", "warning", { title: "Chat Pending" });
    return;
  }

  window.location.href = `../../collaboration/chat/chat.html?roomId=${encodeURIComponent(roomId)}&welcome=chat`;
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.prefillTask = prefillTask;
window.startSubtaskCall = startSubtaskCall;
window.startSubtaskMeeting = startSubtaskMeeting;
window.openSubtaskChat = openSubtaskChat;
