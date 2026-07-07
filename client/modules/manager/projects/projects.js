let managerProjects = [];
let selectedProjectId = "";

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  window.managerHub?.ensureManagerMigration?.();
  managerProjects = window.managerHub?.getManagerProjects?.() || [];
  selectedProjectId = new URLSearchParams(window.location.search).get("projectId") || managerProjects[0]?._id || "";
  document.getElementById("projectSearch")?.addEventListener("input", renderProjects);
  document.getElementById("projectStatusFilter")?.addEventListener("change", renderProjects);
  renderProjects();
});

function renderProjects() {
  const search = String(document.getElementById("projectSearch")?.value || "").trim().toLowerCase();
  const status = document.getElementById("projectStatusFilter")?.value || "";
  const filtered = managerProjects.filter((project) => {
    const matchesSearch = [project.projectName, project.clientName, project.department].some((value) =>
      String(value || "").toLowerCase().includes(search),
    );
    const matchesStatus = !status || project.status === status;
    return matchesSearch && matchesStatus;
  });

  if (!filtered.some((project) => project._id === selectedProjectId)) {
    selectedProjectId = filtered[0]?._id || "";
  }

  document.getElementById("projectSummary").innerHTML = [
    ["Assigned Projects", filtered.length, "PJ"],
    ["Pending Setup", filtered.filter((item) => !item.teamSize).length, "TM"],
    ["Active Delivery", filtered.filter((item) => item.status === "Active").length, "DL"],
    ["Overdue Watch", filtered.filter((item) => item.overdueTasks > 0).length, "ER"],
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

  document.getElementById("projectCards").innerHTML = filtered.length
    ? filtered
        .map((project) => {
          const actionLinks = buildProjectActionLinks(project);
          return `
            <article class="manager-project-card ${project._id === selectedProjectId ? "is-selected" : ""}">
              <div class="manager-row-between">
                <div>
                  <button class="project-name-link" type="button" onclick="openManagerProjectDetails('${escapeJs(project._id)}')">
                    ${escapeHtml(project.projectName)}
                  </button>
                  <p>${escapeHtml(project.department || "-")} • ${escapeHtml(project.clientName || "-")}</p>
                </div>
                <span class="status-pill ${statusClass(project.status)}">${escapeHtml(project.status || "Planning")}</span>
              </div>
              <div class="manager-meta-grid">
                <span class="manager-badge">Priority ${escapeHtml(project.priority || "Medium")}</span>
                <span class="manager-badge">Budget ${formatCurrency(project.budget)}</span>
                <span class="manager-badge">Team ${project.teamSize || 0}</span>
                <span class="manager-badge">Open Tasks ${project.openTasks || 0}</span>
              </div>
              <p>${escapeHtml(project.description || "No description available.")}</p>
              <div class="manager-progress"><span style="width:${Number(project.progress || 0)}%"></span></div>
              <div class="manager-inline-metrics">
                <span class="muted-line">Start ${formatShortDate(project.startDate)}</span>
                <span class="muted-line">End ${formatShortDate(project.deadline)}</span>
              </div>
              <footer class="manager-button-row">
                <a class="btn btn-primary" href="../team-management/team-management.html?projectId=${encodeURIComponent(project._id)}">Create Team</a>
                <a class="btn ghost-btn" href="../tasks/tasks.html?projectId=${encodeURIComponent(project._id)}">Assign Tasks</a>
                <a class="btn ghost-btn" href="${actionLinks.chatHref}">Open Chat</a>
                ${actionLinks.callHref ? `<a class="btn ghost-btn" href="${actionLinks.callHref}">Audio Call</a>` : `<button class="btn ghost-btn" type="button" disabled>Audio Pending</button>`}
                <a class="btn ghost-btn" href="../meetings/meetings.html?projectId=${encodeURIComponent(project._id)}">Schedule Meeting</a>
                <a class="btn ghost-btn" href="../analytics/analytics.html?projectId=${encodeURIComponent(project._id)}">View Analytics</a>
              </footer>
            </article>
          `;
        })
        .join("")
    : '<div class="manager-empty">No projects match the current filters.</div>';

  document.getElementById("projectTableBody").innerHTML = filtered.length
    ? filtered
        .map(
          (project) => `
            <tr class="${project._id === selectedProjectId ? "selected-row" : ""}">
              <td>
                <button class="project-name-link" type="button" onclick="openManagerProjectDetails('${escapeJs(project._id)}')">
                  ${escapeHtml(project.projectName)}
                </button>
              </td>
              <td>${escapeHtml(project.clientName || "-")}</td>
              <td><span class="status-pill ${statusClass(project.status)}">${escapeHtml(project.status || "-")}</span></td>
              <td>${formatCurrency(project.budget)}</td>
              <td>${Number(project.progress || 0)}%</td>
              <td>${formatShortDate(project.deadline)}</td>
              <td>${project.teamSize || 0}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="7" class="manager-empty">No projects available.</td></tr>';

  renderProjectDetail(filtered.find((project) => project._id === selectedProjectId) || null);
}

function renderProjectDetail(project) {
  const host = document.getElementById("projectDetailPanel");
  if (!host) return;

  if (!project) {
    host.innerHTML = `
      <div class="manager-empty">
        <h3>Select a project</h3>
        <p>Summary, assignment data and direct chat access will appear here.</p>
      </div>
    `;
    return;
  }

  const teams = window.managerHub?.getManagerTeams?.() || [];
  const tasks = window.managerHub?.getManagerTasks?.() || [];
  const relatedTeams = teams.filter((team) => String(team.projectId || "") === String(project._id));
  const relatedTasks = tasks.filter((task) => String(task.projectId || "") === String(project._id));
  const primaryTeam = relatedTeams[0] || null;
  const members = Array.from(new Set(relatedTeams.flatMap((team) => team.members || [])));
  const actionLinks = buildProjectActionLinks(project);

  host.innerHTML = `
    <div class="project-detail-head">
      <div>
        <p class="eyebrow-line">Project Drilldown</p>
        <h2>${escapeHtml(project.projectName || "Untitled Project")}</h2>
        <p class="hero-text">${escapeHtml(project.description || "No project summary added yet.")}</p>
      </div>
      <div class="project-detail-actions">
        <a class="btn btn-primary" href="${actionLinks.chatHref}">Open Chat</a>
        ${actionLinks.callHref ? `<a class="btn ghost-btn" href="${actionLinks.callHref}">Start Audio Call</a>` : `<button class="btn ghost-btn" type="button" disabled>Room Pending</button>`}
      </div>
    </div>
    <div class="project-detail-grid">
      <article class="project-detail-card">
        <span>Manager Assignment</span>
        <strong>${escapeHtml(project.manager || "Assigned manager")}</strong>
        <small>${formatDateTime(project.managerAssignedAt || project.updatedAt || project.createdAt)}</small>
      </article>
      <article class="project-detail-card">
        <span>Team Room</span>
        <strong>${escapeHtml(primaryTeam?.name || "Team not created yet")}</strong>
        <small>${escapeHtml(primaryTeam?.roomId || "Room will appear after team setup")}</small>
      </article>
      <article class="project-detail-card">
        <span>Task Snapshot</span>
        <strong>${relatedTasks.filter((task) => task.status !== "Completed").length} open</strong>
        <small>${relatedTasks.filter((task) => task.status === "Completed").length} completed</small>
      </article>
      <article class="project-detail-card">
        <span>People</span>
        <strong>${members.length || 0} members</strong>
        <small>${escapeHtml(primaryTeam?.teamLead || project.teamLead || "Lead pending")}</small>
      </article>
    </div>
    <div class="project-detail-columns">
      <article class="project-detail-block">
        <h3>Execution Summary</h3>
        <p><strong>Client:</strong> ${escapeHtml(project.clientName || "-")}</p>
        <p><strong>Department:</strong> ${escapeHtml(project.department || "-")}</p>
        <p><strong>Priority:</strong> ${escapeHtml(project.priority || "Medium")}</p>
        <p><strong>Status:</strong> ${escapeHtml(project.status || "Planning")}</p>
        <p><strong>Budget:</strong> ${formatCurrency(project.budget)}</p>
        <p><strong>Timeline:</strong> ${formatShortDate(project.startDate)} to ${formatShortDate(project.deadline)}</p>
      </article>
      <article class="project-detail-block">
        <h3>Assigned Team</h3>
        <p><strong>Manager:</strong> ${escapeHtml(project.manager || "Not set")}</p>
        <p><strong>Team Lead:</strong> ${escapeHtml(primaryTeam?.teamLead || project.teamLead || "Not set")}</p>
        <p><strong>Members:</strong> ${escapeHtml(members.length ? members.join(", ") : "No members assigned")}</p>
        <p><strong>Open Tasks:</strong> ${relatedTasks.map((task) => task.title).slice(0, 3).map(escapeHtml).join(", ") || "No tasks created yet"}</p>
      </article>
    </div>
  `;
}

function buildProjectActionLinks(project) {
  const teams = window.managerHub?.getManagerTeams?.() || [];
  const primaryTeam = teams.find((team) => String(team.projectId || "") === String(project._id));
  const projectQuery = `projectId=${encodeURIComponent(project._id)}&projectName=${encodeURIComponent(project.projectName || "")}`;
  return {
    chatHref: `../chat/chat.html?${projectQuery}`,
    callHref: primaryTeam ? `../chat/chat.html?${projectQuery}&autostart=call` : "",
  };
}

function formatDateTime(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openManagerProjectDetails(projectId) {
  selectedProjectId = projectId;
  renderProjects();
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.openManagerProjectDetails = openManagerProjectDetails;
