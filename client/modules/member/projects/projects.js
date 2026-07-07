document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MEMBER",
  });
  if (!ready) return;
  await renderMemberProjects();
});

async function renderMemberProjects() {
  const experience = await window.memberWorkflow.loadMemberExperience();
  const selectedStatus = String(new URLSearchParams(window.location.search).get("status") || "ALL").toUpperCase();
  const allProjects = experience.projects || [];
  const projects = selectedStatus === "ALL"
    ? allProjects
    : allProjects.filter((project) => String(project.status || "").toUpperCase() === selectedStatus);
  const openSubtasks = projects.reduce((sum, project) => sum + Number(project.openSubtasks || 0), 0);
  const roomCount = projects.filter((project) => project.roomId).length;

  setText("assignedProjectCount", projects.length);
  setText("projectOpenSubtasks", openSubtasks);
  setText("projectRoomsReady", roomCount);

  document.getElementById("projectHeroChips").innerHTML = [
    `<a class="member-chip" href="${window.memberWorkflow.buildProjectsUrl("ALL")}"><strong>${allProjects.length}</strong><span>All Projects</span></a>`,
    `<a class="member-chip" href="${window.memberWorkflow.buildProjectsUrl("ACTIVE")}"><strong>${allProjects.filter((item) => String(item.status || "").toUpperCase() === "ACTIVE").length}</strong><span>Active</span></a>`,
    `<a class="member-chip" href="${window.memberWorkflow.buildProjectsUrl("COMPLETED")}"><strong>${allProjects.filter((item) => String(item.status || "").toUpperCase() === "COMPLETED").length}</strong><span>Completed</span></a>`,
  ].join("");

  document.getElementById("projectCardGrid").innerHTML = projects.length
    ? projects
        .map(
          (project) => `
            <article class="list-card project-card">
              <div class="project-titlebar">
                <div class="project-copy">
                  <strong>${escapeHtml(project.projectName)}</strong>
                  <p>${escapeHtml(project.description)}</p>
                </div>
                <span class="status-pill ${statusClass(project.status || "Active")}">${escapeHtml(project.status || "Active")}</span>
              </div>
              <div class="card-metrics">
                <div class="metric-mini"><span>Client</span><strong>${escapeHtml(project.clientName || "Internal")}</strong></div>
                <div class="metric-mini"><span>Due Date</span><strong>${formatShortDate(project.deadline)}</strong></div>
                <div class="metric-mini"><span>Priority</span><strong>${escapeHtml(project.priority || "Medium")}</strong></div>
                <div class="metric-mini"><span>Status</span><strong>${escapeHtml(project.status || "Active")}</strong></div>
                <div class="metric-mini"><span>Completion</span><strong>${project.completion}%</strong></div>
                <div class="metric-mini"><span>Team</span><strong>${escapeHtml(project.teamName || "Assigned Team")}</strong></div>
                <div class="metric-mini"><span>Manager</span><strong>${escapeHtml(project.manager || "Unassigned")}</strong></div>
              </div>
              <div class="progress-rail"><span style="width:${Math.max(4, project.completion || 0)}%"></span></div>
              <div class="chip-row">
                <span class="icon-chip">${escapeHtml(String(project.myTaskCount || 0))} tasks</span>
                <span class="icon-chip">${escapeHtml(String(project.members?.length || 0))} members</span>
                <span class="icon-chip">${project.roomId ? "Workspace Ready" : "Workspace Pending"}</span>
              </div>
              <div class="panel-actions">
                <a class="btn btn-primary" href="${window.memberWorkflow.buildProjectDetailsUrl(project)}">Open Project</a>
                <button class="btn ghost-btn" type="button" onclick="openMemberProjectTeams('${escapeAttribute(project.projectId)}')">Open Teams</button>
                <a class="btn ghost-btn" href="${project.oneDriveShareUrl ? escapeAttribute(project.oneDriveShareUrl) : '../file-uploads/file-uploads.html'}" ${project.oneDriveShareUrl ? 'target="_blank" rel="noreferrer"' : ""}>Files</a>
                <a class="btn ghost-btn" href="/modules/collaboration/meetings/meetings.html">Meetings</a>
                <a class="btn ghost-btn" href="../reports/reports.html">Reports</a>
                <a class="btn ghost-btn" href="../daily-updates/daily-updates.html">Daily Updates</a>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No projects match this filter yet.</p>';
}

async function openMemberProjectTeams(projectId) {
  try {
    const teamsUrl = await window.memberWorkflow.getMicrosoftTeamsUrl(projectId);
    window.location.href = teamsUrl;
  } catch (error) {
    showToast?.(error.message || "Unable to open Microsoft Teams.", "error", { title: "Teams Unavailable" });
  }
}

function escapeAttribute(value = "") {
  return String(value).replace(/"/g, "&quot;");
}

window.openMemberProjectTeams = openMemberProjectTeams;
