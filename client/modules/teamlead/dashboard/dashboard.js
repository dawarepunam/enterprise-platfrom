const dashboardState = {
  projects: [],
  tasks: [],
  subtasks: [],
  rooms: [],
  meetings: [],
  currentUser: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "TEAM_LEAD",
  });
  if (!ready) return;

  dashboardState.currentUser = getCurrentUser?.() || {};
  await loadDashboardData();
  connectSocket?.();
});

async function loadDashboardData() {
  const fallback = buildFallbackDashboard();

  try {
    const [projectsResponse, tasksResponse, subtasksResponse, roomsResponse, meetingsResponse] = await Promise.all([
      apiRequest("/projects/teamlead"),
      apiRequest("/tasks"),
      apiRequest("/subtasks/reviews/pending").catch(() => ({ data: [] })),
      apiRequest("/chat/rooms/my").catch(() => ({ data: [] })),
      apiRequest("/meetings").catch(() => ({ data: [] })),
    ]);

    dashboardState.projects = Array.isArray(projectsResponse.data) && projectsResponse.data.length ? projectsResponse.data : fallback.projects;
    dashboardState.tasks = filterLeadTasks(Array.isArray(tasksResponse.data) ? tasksResponse.data : fallback.tasks);
    dashboardState.subtasks = Array.isArray(subtasksResponse.data) && subtasksResponse.data.length ? subtasksResponse.data : fallback.subtasks;
    dashboardState.rooms = Array.isArray(roomsResponse.data) ? roomsResponse.data : [];
    dashboardState.meetings = Array.isArray(meetingsResponse.data) ? meetingsResponse.data : [];
  } catch (error) {
    dashboardState.projects = fallback.projects;
    dashboardState.tasks = fallback.tasks;
    dashboardState.subtasks = fallback.subtasks;
    dashboardState.rooms = fallback.rooms;
    dashboardState.meetings = fallback.meetings;
  }

  if (!dashboardState.projects.length) {
    dashboardState.projects = deriveProjectsFromTasks(dashboardState.tasks);
  }

  renderDashboard();
}

function buildFallbackDashboard() {
  const currentUser = dashboardState.currentUser || {};
  const storeProjects = window.enterpriseStore?.getProjects?.() || [];
  const storeTasks = filterLeadTasks(window.enterpriseStore?.getTasks?.() || []);
  const storeSubtasks = (window.enterpriseStore?.getSubtasks?.() || []).filter((item) => String(item.reviewer || currentUser.name || "") === String(currentUser.name || ""));
  return {
    projects: storeProjects.filter((item) => String(item.teamLead || item.lead || "") === String(currentUser.name || "")),
    tasks: storeTasks,
    subtasks: storeSubtasks,
    rooms: [],
    meetings: [],
  };
}

function filterLeadTasks(tasks) {
  const currentUser = dashboardState.currentUser || {};
  return (tasks || []).filter((task) => String(task.lead || task.teamLead || "") === String(currentUser.name || ""));
}

function deriveProjectsFromTasks(tasks) {
  const map = new Map();
  tasks.forEach((task) => {
    const key = String(task.projectId || task.projectName || task._id);
    if (!map.has(key)) {
      map.set(key, {
        _id: task.projectId || key,
        projectName: task.projectName || "Untitled Project",
        clientName: task.clientName || "Internal",
        budget: task.budget || 0,
        priority: task.priority || "Medium",
        deadline: task.deadline || "",
        requirementDocs: [],
      });
    }
  });
  return Array.from(map.values());
}

function renderDashboard() {
  const delayedTasks = dashboardState.tasks.filter((task) => isDelayed(task.deadline, task.status));
  const reviewQueue = dashboardState.subtasks.filter((item) => item.status === "In Review");
  const coverageSet = new Set();

  dashboardState.rooms.forEach((room) => {
    (room.members || []).forEach((name) => coverageSet.add(name));
  });

  setText("projectCount", dashboardState.projects.length);
  setText("taskCount", dashboardState.tasks.length);
  setText("reviewCount", reviewQueue.length);
  setText("delayCount", delayedTasks.length);
  setText("roomCount", dashboardState.rooms.length);
  setText("meetingCount", dashboardState.meetings.filter((item) => item.status === "LIVE" || isToday(item.createdAt || item.startedAt)).length);
  setText("coverageCount", coverageSet.size);

  renderProjects();
  renderFlow();
  renderBreakdown();
  renderAttention();
}

function renderProjects() {
  const target = document.getElementById("projectBoard");
  target.innerHTML = dashboardState.projects.length
    ? dashboardState.projects
        .map(
          (project) => `
            <article class="list-card project-card">
              <div class="card-topline">
                <strong>${escapeHtml(project.projectName || "Untitled Project")}</strong>
                <span class="priority-pill ${priorityClass(project.priority || "Medium")}">${escapeHtml(project.priority || "Medium")}</span>
              </div>
              <span class="list-meta">${escapeHtml(project.clientName || "Internal Client")} • Deadline ${formatShortDate(project.deadline)}</span>
              <p class="status-note">Budget ${formatCurrency(project.budget || 0)} • ${countProjectTasks(project)} tasks • ${countProjectSubtasks(project)} subtasks</p>
              <p class="status-note">${escapeHtml(project.description || "Requirement details are attached in project docs and task chat rooms.")}</p>
              <div class="doc-list">
                ${renderDocs(project.requirementDocs)}
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No project has been assigned to this team lead yet.</p>';
}

function renderDocs(docs = []) {
  if (!Array.isArray(docs) || !docs.length) {
    return '<span class="status-pill status-planning">Requirement docs pending</span>';
  }

  return docs
    .map((doc) => `<a class="doc-chip" href="${escapeHtml(doc.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(doc.name || "Requirement doc")}</a>`)
    .join("");
}

function renderFlow() {
  const flow = [
    "Manager assigns a project or macro task to the team lead.",
    "Team lead reads requirements and identifies modules, dependencies and deadlines.",
    "Each main task is broken into visible subtasks with owner, hours and instructions.",
    "Assigning a subtask creates notification popup, email log and dedicated team chat room.",
    "Members submit work for review and the lead approves, rejects or escalates delays.",
  ];

  document.getElementById("flowBoard").innerHTML = flow
    .map((item, index) => `<article class="flow-step"><strong>${String(index + 1).padStart(2, "0")}</strong><p>${escapeHtml(item)}</p></article>`)
    .join("");
}

function renderBreakdown() {
  const target = document.getElementById("breakdownBoard");
  target.innerHTML = dashboardState.tasks.length
    ? dashboardState.tasks
        .map((task) => {
          const taskSubtasks = getTaskSubtasks(task._id);
          return `
            <article class="list-card breakdown-card">
              <div class="card-topline">
                <strong>${escapeHtml(task.title)}</strong>
                <span class="status-pill ${statusClass(task.status || "Assigned")}">${escapeHtml(task.status || "Assigned")}</span>
              </div>
              <span class="list-meta">${escapeHtml(task.projectName || "-")} • ${Number(task.progress || 0)}% progress • Deadline ${formatShortDate(task.deadline)}</span>
              <div class="subtask-stack">
                ${taskSubtasks.length
                  ? taskSubtasks
                      .map(
                        (subtask) => `
                          <div class="subtask-row">
                            <span>${escapeHtml(subtask.title)}</span>
                            <small>${escapeHtml(subtask.assignee || "Unassigned")} • ${escapeHtml(subtask.status || "Pending")}</small>
                          </div>
                        `,
                      )
                      .join("")
                  : '<p class="empty-inline">This task has not been broken down yet.</p>'}
              </div>
            </article>
          `;
        })
        .join("")
    : '<p class="empty-state">No manager tasks found for this team lead.</p>';
}

function renderAttention() {
  const delayedTasks = dashboardState.tasks.filter((task) => isDelayed(task.deadline, task.status)).map((task) => ({
    title: `Delay risk: ${task.title}`,
    note: `${task.projectName || "Project"} deadline crossed. Extend, reassign or escalate to manager.`,
    actionUrl: "../team-tasks/team-tasks.html",
    tone: "warning",
  }));

  const reviews = dashboardState.subtasks.filter((item) => item.status === "In Review").map((item) => ({
    title: `Review pending: ${item.title}`,
    note: `${item.assignee || "Member"} submitted this item. Open approvals to approve or request changes.`,
    actionUrl: "../approvals/approvals.html",
    tone: "info",
  }));

  const meetings = dashboardState.meetings.slice(0, 3).map((meeting) => ({
    title: meeting.title || "Team meeting",
    note: `${meeting.status || "SCHEDULED"} • ${meeting.meetingType || "VIDEO"} • ${formatShortDate(meeting.startedAt || meeting.createdAt)}`,
    actionUrl: "../../collaboration/meetings/meetings.html",
    tone: "success",
  }));

  const items = [...reviews, ...delayedTasks, ...meetings].slice(0, 8);
  document.getElementById("attentionBoard").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="list-card attention-card ${item.tone}">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-note">${escapeHtml(item.note)}</span>
              <a class="text-link" href="${item.actionUrl}">Open</a>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No urgent lead actions right now.</p>';
}

function getTaskSubtasks(taskId) {
  const storeSubtasks = window.enterpriseStore?.getSubtasks?.() || [];
  const pendingFromApi = dashboardState.subtasks || [];
  const merged = [...storeSubtasks, ...pendingFromApi];
  const seen = new Set();

  return merged.filter((item) => {
    const matches = String(item.taskId) === String(taskId);
    if (!matches) return false;
    const key = String(item._id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countProjectTasks(project) {
  return dashboardState.tasks.filter((task) => String(task.projectId || "") === String(project._id || "") || String(task.projectName || "") === String(project.projectName || "")).length;
}

function countProjectSubtasks(project) {
  const taskIds = dashboardState.tasks
    .filter((task) => String(task.projectId || "") === String(project._id || "") || String(task.projectName || "") === String(project.projectName || ""))
    .map((task) => String(task._id));

  return getUniqueSubtasks().filter((item) => taskIds.includes(String(item.taskId))).length;
}

function getUniqueSubtasks() {
  const merged = [...(window.enterpriseStore?.getSubtasks?.() || []), ...(dashboardState.subtasks || [])];
  const seen = new Set();
  return merged.filter((item) => {
    const key = String(item._id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isDelayed(deadline, status) {
  if (!deadline) return false;
  if (["Approved", "Completed"].includes(status)) return false;
  return new Date(deadline) < new Date();
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}
