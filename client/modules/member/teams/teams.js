document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  await loadMemberTeamsProjects();
});

async function loadMemberTeamsProjects() {
  const experience = await window.memberWorkflow.loadMemberExperience();
  const projects = experience.projects || [];

  document.getElementById("teamsHeroChips").innerHTML = [
    `<div class="member-chip"><strong>${projects.length}</strong><span>Project Groups</span></div>`,
    `<div class="member-chip"><strong>${projects.filter((item) => item.roomId).length}</strong><span>Chat Ready</span></div>`,
    `<div class="member-chip"><strong>${projects.filter((item) => item.teamsWebUrl).length}</strong><span>Teams Linked</span></div>`,
  ].join("");

  document.getElementById("teamsProjectGrid").innerHTML = projects.length
    ? projects.map((project) => `
        <article class="list-card project-card">
          <div class="project-titlebar">
            <div class="project-copy">
              <strong>${escapeHtml(project.projectName)}</strong>
              <p>${escapeHtml(project.description || "Project collaboration group")}</p>
            </div>
            <span class="status-pill ${statusClass(project.status || "Active")}">${escapeHtml(project.status || "Active")}</span>
          </div>
          <div class="card-metrics">
            <div class="metric-mini"><span>Team</span><strong>${escapeHtml(project.teamName || "Assigned Team")}</strong></div>
            <div class="metric-mini"><span>Members</span><strong>${escapeHtml(String(project.members?.length || 0))}</strong></div>
            <div class="metric-mini"><span>Completion</span><strong>${project.completion}%</strong></div>
          </div>
          <div class="panel-actions">
            <a class="btn btn-primary" href="${window.memberWorkflow.buildWorkspaceUrl(project)}">Open Project Chat</a>
            <button class="btn ghost-btn" type="button" onclick="redirectToMicrosoftTeams('${escapeAttribute(project.projectId)}')">Open Microsoft Teams</button>
            <a class="btn ghost-btn" href="${window.memberWorkflow.buildProjectDetailsUrl(project)}">Project Details</a>
          </div>
        </article>
      `).join("")
    : '<div class="empty-inline">No project groups are assigned yet.</div>';
}

async function redirectToMicrosoftTeams(projectId) {
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

window.redirectToMicrosoftTeams = redirectToMicrosoftTeams;
