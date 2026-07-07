document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MEMBER",
  });
  if (!ready) return;
  await renderMemberDashboard();
});

async function renderMemberDashboard() {
  const data = await window.memberWorkflow.loadMemberExperience();
  const stats = window.memberWorkflow.deriveMemberStats(data, data.projects);

  setText("totalCount", stats.total);
  setText("activeCount", stats.inProgress);
  setText("reviewCount", stats.review);
  setText("notificationCount", stats.notificationCount);
  setText("attendanceState", stats.attendanceState);
  setText("projectCount", stats.projects);
  setText("timerState", stats.timerLabel);

  document.getElementById("heroBadges").innerHTML = [
    `<div class="member-chip"><strong>${stats.pending}</strong><span>Pending</span></div>`,
    `<div class="member-chip"><strong>${stats.completed}</strong><span>Completed</span></div>`,
    `<div class="member-chip"><strong>${stats.dailyUpdates}</strong><span>Updates Today</span></div>`,
  ].join("");

  document.getElementById("memberProjects").innerHTML = (data.projects || []).length
    ? data.projects
        .slice(0, 4)
        .map(
          (project) => `
            <article class="list-card project-card">
              <div class="project-titlebar">
                <div class="project-copy">
                  <strong>${escapeHtml(project.projectName)}</strong>
                  <p>${escapeHtml(project.description)}</p>
                </div>
                <span class="priority-pill ${priorityClass(project.priority || "Medium")}">${escapeHtml(project.priority || "Medium")}</span>
              </div>
              <div class="card-metrics">
                <div class="metric-mini"><span>Deadline</span><strong>${formatShortDate(project.deadline)}</strong></div>
                <div class="metric-mini"><span>My Tasks</span><strong>${project.myTaskCount}</strong></div>
                <div class="metric-mini"><span>Completion</span><strong>${project.completion}%</strong></div>
              </div>
              <div class="progress-rail"><span style="width:${Math.max(4, project.completion || 0)}%"></span></div>
              <div class="panel-actions">
                <a class="btn btn-primary" href="${window.memberWorkflow.buildProjectDetailsUrl(project)}">Open Project</a>
                <a class="btn ghost-btn" href="${window.memberWorkflow.buildWorkspaceUrl(project)}">Workspace</a>
                <a class="btn ghost-btn" href="../my-tasks/my-tasks.html">View Tasks</a>
                ${project.teamsWebUrl ? `<a class="btn ghost-btn" href="${escapeAttribute(project.teamsWebUrl)}" target="_blank" rel="noreferrer">Open Teams</a>` : ""}
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No assigned projects are visible yet.</p>';

  document.getElementById("memberTaskList").innerHTML = (data.subtasks || []).length
    ? data.subtasks
        .slice()
        .sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0))
        .slice(0, 6)
        .map((subtask) => {
          const task = window.memberWorkflow.getTaskForSubtask(data.tasks, subtask);
          return `
            <article class="list-card">
              <strong>${escapeHtml(subtask.title)}</strong>
              <span class="list-meta">${escapeHtml(task?.projectName || task?.title || "Project")} | ${formatShortDate(subtask.deadline)}</span>
              <div class="meta-row">
                <span class="status-pill ${statusClass(subtask.status || "Assigned")}">${escapeHtml(subtask.status || "Assigned")}</span>
                <span class="priority-pill ${priorityClass(subtask.priority || "Medium")}">${escapeHtml(subtask.priority || "Medium")}</span>
              </div>
            </article>
          `;
        })
        .join("")
    : '<p class="empty-state">No assigned subtasks available yet.</p>';

  const modules = [
    ["../projects/projects.html", "My Projects", "Open assigned project cards and workspace"],
    ["../my-tasks/my-tasks.html", "My Tasks", "Move work from to-do to review"],
    ["../daily-updates/daily-updates.html", "Daily Updates", "Send completed work, hours and blockers"],
    ["../reports/reports.html", "Reports", "Review project progress and workspace updates"],
    ["../file-uploads/file-uploads.html", "Files & Media", "Upload proofs, screenshots and source bundles"],
    ["../reports/reports.html", "Reports", "Track productivity, status and review counts"],
    ["../history/history.html", "Work History", "See your permanent project activity timeline"],
    ["../mailbox/mailbox.html", "Outlook Mail", "Check mail-style alerts and reminders"],
    ["../calendar/calendar.html", "Outlook Calendar", "Review meetings, deadlines and upcoming work"],
  ];

  document.getElementById("memberModules").innerHTML = modules
    .map(
      ([href, title, text]) => `
        <a class="action-card" href="${href}">
          <strong>${title}</strong>
          <span>${text}</span>
        </a>
      `,
    )
    .join("");

  document.getElementById("memberInsights").innerHTML = [
    ["Notifications", stats.notificationCount, "Unread reminders across your workspace"],
    ["Updates Today", stats.dailyUpdates, "Progress reports shared with leads"],
    ["Timer", stats.timerRunning ? stats.timerLabel : "Not Running", "Current tracked session"],
    ["Projects", `${stats.projects}`, "Assigned delivery boards"],
  ]
    .map(
      ([label, value, text]) => `
        <article class="workspace-tile">
          <strong>${label}</strong>
          <span>${value}</span>
          <p>${text}</p>
        </article>
      `,
    )
    .join("");

  window.clearInterval(window.__memberDashboardTimer);
  window.__memberDashboardTimer = window.setInterval(() => {
    const timer = window.memberWorkflow.getMemberTimerState();
    setText("timerState", timer ? window.memberWorkflow.formatDuration(window.memberWorkflow.getActiveTimerElapsed(timer)) : "00:00:00");
  }, 1000);
}

function escapeAttribute(value = "") {
  return String(value).replace(/"/g, "&quot;");
}
