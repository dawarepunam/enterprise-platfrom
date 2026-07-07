document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  window.managerHub?.ensureManagerMigration?.();
  bindTaskForm();
  populateTaskControls();
  renderManagerTasks();
});

function bindTaskForm() {
  document.getElementById("taskForm")?.addEventListener("submit", handleTaskSave);
  document.getElementById("taskProjectId")?.addEventListener("change", () => {
    populateAssigneeOptions();
    renderTaskTeamSummary();
    renderAssigneeBoard();
  });
  document.getElementById("taskAssignee")?.addEventListener("change", renderAssigneeBoard);
  document.getElementById("resetTaskForm")?.addEventListener("click", () => {
    document.getElementById("taskForm")?.reset();
    document.getElementById("taskId").value = "";
    populateAssigneeOptions();
    renderTaskTeamSummary();
    renderAssigneeBoard();
  });
}

function populateTaskControls() {
  const projects = window.managerHub?.getManagerProjects?.() || [];
  const projectSelect = document.getElementById("taskProjectId");
  if (projectSelect) {
    projectSelect.innerHTML = projects.map((project) => `<option value="${project._id}">${escapeHtml(project.projectName)}</option>`).join("");
    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (projectId && projects.some((project) => project._id === projectId)) projectSelect.value = projectId;
  }
  populateAssigneeOptions();
  renderTaskTeamSummary();
  renderAssigneeBoard();
}

function getSelectedProject() {
  const projects = window.managerHub?.getManagerProjects?.() || [];
  return projects.find((item) => item._id === document.getElementById("taskProjectId")?.value) || null;
}

function getSelectedTeam() {
  const project = getSelectedProject();
  const teams = window.managerHub?.getManagerTeams?.() || [];
  return teams.find((item) => String(item.projectId || "") === String(project?._id || "")) || null;
}

function getSelectedTeamMembers() {
  const members = window.managerHub?.getManagerMembers?.() || [];
  const team = getSelectedTeam();
  const memberDirectory = new Map(members.map((member) => [member.name, member]));
  return (team?.members || [])
    .map((memberName) => memberDirectory.get(memberName))
    .filter(Boolean);
}

function populateAssigneeOptions() {
  const memberSelect = document.getElementById("taskAssignee");
  if (!memberSelect) return;
  const selectedMembers = getSelectedTeamMembers();
  const queryMember = new URLSearchParams(window.location.search).get("memberName");
  const grouped = selectedMembers.reduce((acc, member) => {
    const key = member.department || "Unassigned";
    acc[key] = acc[key] || [];
    acc[key].push(member);
    return acc;
  }, {});

  memberSelect.innerHTML = ['<option value="">Unassigned</option>']
    .concat(
      Object.entries(grouped)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([department, members]) => `
            <optgroup label="${escapeHtml(department)}">
              ${members
                .map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} • Load ${Number(member.workload || 0)}%</option>`)
                .join("")}
            </optgroup>
          `,
        ),
    )
    .join("");

  if (queryMember && selectedMembers.some((member) => member.name === queryMember)) {
    memberSelect.value = queryMember;
  }
}

function renderTaskTeamSummary() {
  const target = document.getElementById("taskTeamSummary");
  if (!target) return;
  const project = getSelectedProject();
  const selectedMembers = getSelectedTeamMembers();
  if (!project) {
    target.innerHTML = '<div class="manager-empty">Select a project to load its team.</div>';
    return;
  }
  if (!selectedMembers.length) {
    target.innerHTML = `
      <article class="manager-list-item">
        <strong>No team found for ${escapeHtml(project.projectName)}</strong>
        <p>Create the team first so tasks can be assigned to specific project members only.</p>
        <div class="manager-button-row">
          <a class="btn ghost-btn" href="../team-management/team-management.html?projectId=${encodeURIComponent(project._id)}">Create Team</a>
        </div>
      </article>
    `;
    return;
  }

  target.innerHTML = `
    <article class="manager-list-item">
      <div class="manager-row-between">
        <strong>${escapeHtml(project.projectName)} Team Ready</strong>
        <span class="manager-badge">${selectedMembers.length} member${selectedMembers.length === 1 ? "" : "s"}</span>
      </div>
      <p>Tasks can be assigned only to saved team members for this project.</p>
      <div class="manager-inline-metrics">
        ${selectedMembers.map((member) => `<span class="manager-badge">${escapeHtml(member.name)} • ${escapeHtml(member.department || "-")}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderAssigneeBoard() {
  const target = document.getElementById("taskAssigneeBoard");
  if (!target) return;
  const selectedMembers = getSelectedTeamMembers();
  const currentAssignee = document.getElementById("taskAssignee")?.value || "";
  if (!selectedMembers.length) {
    target.innerHTML = '<div class="manager-empty">No team members available for this project yet.</div>';
    return;
  }

  target.innerHTML = selectedMembers
    .map(
      (member) => `
        <button class="manager-member-card ${currentAssignee === member.name ? "is-selected" : ""}" type="button" onclick="selectTaskAssignee('${escapeJs(member.name)}')">
          <div class="manager-member-head">
            <img class="manager-avatar" src="${escapeHtml(getSafeProfileImage(member.profilePhoto))}" alt="${escapeHtml(member.name)}" />
            <div>
              <strong>${escapeHtml(member.name)}</strong>
              <p>${escapeHtml(member.department || "-")} • ${escapeHtml(member.availability || "Available")}</p>
            </div>
          </div>
          <div class="manager-member-stats">
            <span class="manager-badge">Skills ${(member.skills || []).slice(0, 2).join(", ") || "-"}</span>
            <span class="manager-badge">Workload ${Number(member.workload || 0)}%</span>
            <span class="manager-badge">Performance ${Number(member.performanceScore || 0)}</span>
          </div>
        </button>
      `,
    )
    .join("");
}

function selectTaskAssignee(memberName) {
  const select = document.getElementById("taskAssignee");
  if (!select) return;
  select.value = memberName;
  renderAssigneeBoard();
}

function handleTaskSave(event) {
  event.preventDefault();
  const project = getSelectedProject();
  if (!project) return;
  const team = getSelectedTeam();

  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDescription").value.trim();
  const subtasks = document.getElementById("taskSubtasks").value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const task = window.managerHub?.saveTask?.({
    _id: document.getElementById("taskId").value || `tsk-${Date.now()}`,
    projectId: project._id,
    projectName: project.projectName,
    teamId: team?._id || "",
    teamName: team?.name || "",
    department: project.department,
    manager: getCurrentUser?.().name || "Manager",
    title,
    description,
    assignee: document.getElementById("taskAssignee").value,
    priority: document.getElementById("taskPriority").value,
    status: document.getElementById("taskStatus").value,
    deadline: document.getElementById("taskDeadline").value,
    estimatedHours: Number(document.getElementById("taskHours").value || 0),
    dependencies: document.getElementById("taskDependencies").value.split(",").map((item) => item.trim()).filter(Boolean),
    tags: document.getElementById("taskTags").value.split(",").map((item) => item.trim()).filter(Boolean),
    attachments: [],
    progress: document.getElementById("taskStatus").value === "Completed" ? 100 : document.getElementById("taskStatus").value === "In Progress" ? 48 : 0,
    subtasks,
  });

  if (task && subtasks.length) {
    const existing = window.enterpriseStore?.getSubtasks?.() || [];
    const extra = subtasks.map((item) => ({
      _id: `sub-${Date.now()}-${item.slice(0, 3).toLowerCase()}`,
      taskId: task._id,
      title: item,
      assignee: task.assignee,
      status: "Assigned",
    }));
    window.enterpriseStore?.saveSubtasks?.(existing.concat(extra));
  }

  renderManagerTasks();
  renderTaskTeamSummary();
  renderAssigneeBoard();
}

function renderManagerTasks() {
  const tasks = window.managerHub?.getManagerTasks?.() || [];
  const metricsHost = document.getElementById("taskMetrics");
  if (metricsHost) {
    metricsHost.innerHTML = [
      ["Open Tasks", tasks.filter((task) => task.status !== "Completed").length, "TK"],
      ["In Review", tasks.filter((task) => task.status === "In Review").length, "RV"],
      ["Blocked", tasks.filter((task) => task.status === "Blocked").length, "ER"],
      ["Completed", tasks.filter((task) => task.status === "Completed").length, "DL"],
    ]
      .map(
        ([label, value, icon]) => `
          <article class="manager-kpi">
            <span class="kpi-icon">${getNavIconSvg(icon)}</span>
            <strong>${escapeHtml(String(value))}</strong>
            <span>${escapeHtml(label)}</span>
          </article>
        `,
      )
      .join("");
  }

  document.getElementById("managerTaskTable").innerHTML = tasks
    .sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0))
    .map(
      (task) => `
        <tr>
          <td>
            <strong>${escapeHtml(task.title)}</strong>
            <div class="muted-line">${escapeHtml(task.description || "No description")}</div>
          </td>
          <td>${escapeHtml(task.projectName || "-")}</td>
          <td>${escapeHtml(task.assignee || "Unassigned")}</td>
          <td><span class="priority-pill ${priorityClass(task.priority)}">${escapeHtml(task.priority || "Medium")}</span></td>
          <td><span class="status-pill ${statusClass(task.status)}">${escapeHtml(task.status || "-")}</span></td>
          <td>${formatShortDate(task.deadline)}</td>
          <td>${Number(task.estimatedHours || 0)}h</td>
        </tr>
      `,
    )
    .join("");
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getSafeProfileImage(value, fallback = "../../../assets/images/default-avatar.png") {
  if (typeof window.resolveWorkspaceImageSrc === "function") {
    return window.resolveWorkspaceImageSrc(value, fallback);
  }
  return String(value || "").trim() || fallback;
}

window.selectTaskAssignee = selectTaskAssignee;
