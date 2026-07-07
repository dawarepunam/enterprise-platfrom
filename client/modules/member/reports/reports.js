document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  const experience = await window.memberWorkflow.loadMemberExperience();
  const stats = window.memberWorkflow.deriveMemberStats(experience, experience.projects);

  document.getElementById("reportHeroChips").innerHTML = [
    `<div class="member-chip"><strong>${stats.completed}</strong><span>Completed</span></div>`,
    `<div class="member-chip"><strong>${stats.review}</strong><span>In Review</span></div>`,
    `<div class="member-chip"><strong>${stats.projects}</strong><span>Projects</span></div>`,
  ].join("");

  document.getElementById("reportTiles").innerHTML = [
    ["Open Tasks", stats.pending + stats.inProgress],
    ["Notifications", stats.notificationCount],
    ["Updates Today", stats.dailyUpdates],
    ["Timer", stats.timerLabel],
  ].map(([label, value]) => `<article class="workspace-tile"><strong>${label}</strong><span>${value}</span><p>Live member report data.</p></article>`).join("");

  document.getElementById("reportProjects").innerHTML = (experience.projects || []).length
    ? experience.projects.map((project) => `
        <article class="list-card project-card">
          <strong>${escapeHtml(project.projectName)}</strong>
          <p>${escapeHtml(project.description || "Assigned project workspace")}</p>
          <div class="card-metrics">
            <div class="metric-mini"><span>Completion</span><strong>${project.completion}%</strong></div>
            <div class="metric-mini"><span>My Tasks</span><strong>${project.myTaskCount}</strong></div>
            <div class="metric-mini"><span>Open</span><strong>${project.openSubtasks}</strong></div>
          </div>
        </article>
      `).join("")
    : '<div class="empty-inline">No reportable projects yet.</div>';
});
