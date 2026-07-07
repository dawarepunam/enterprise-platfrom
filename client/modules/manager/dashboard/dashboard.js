const DASHBOARD_ACTIONS = [
  { title: "View Projects", href: "../projects/projects.html", description: "Open assigned projects, budgets, timelines, and team status.", icon: "PJ" },
  { title: "Create Team", href: "../team-management/team-management.html", description: "Select members, save squad, and create room history.", icon: "TM" },
  { title: "Assign Task", href: "../tasks/tasks.html", description: "Create main tasks, dependencies, deadlines, and subtasks.", icon: "AS" },
  { title: "Open Chat", href: "../chat/chat.html", description: "Persistent team chat with files, notes, and replies.", icon: "CH" },
  { title: "Start Call", href: "../calls/calls.html", description: "Prepare voice room and save call log history.", icon: "CQ" },
  { title: "Schedule Meeting", href: "../meetings/meetings.html", description: "Create video syncs with agenda and notes.", icon: "MT" },
  { title: "Upload File", href: "../files/files.html", description: "Share specs, decks, docs, and related evidence.", icon: "UP" },
  { title: "Share Location", href: "../locations/locations.html", description: "Capture live or manual team/client location points.", icon: "BR" },
  { title: "Generate Report", href: "../reports/reports.html", description: "Prepare PDF, Excel, or CSV admin-ready reports.", icon: "RP" },
];

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  window.managerHub?.ensureManagerMigration?.();
  renderDashboard();
});

function renderDashboard() {
  const stats = window.managerHub?.getDashboardStats?.();
  if (!stats) return;

  document.getElementById("managerFlow").innerHTML = [
    "Admin assigns project to manager and fixes ownership, budget, and deadline.",
    "Manager creates team directly, without team lead dependency, and opens room history.",
    "Manager assigns tasks, coordinates chat/calls/meetings/files/locations, and keeps audit visibility.",
    "Manager monitors performance, shifts or holds members when needed, and sends final reports to admin.",
  ]
    .map(
      (item, index) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>0${index + 1}</strong>
            <span class="manager-badge">Manager Owned</span>
          </div>
          <p>${escapeHtml(item)}</p>
        </article>
      `,
    )
    .join("");

  document.getElementById("dashboardKpis").innerHTML = [
    ["Assigned Projects", stats.assignedProjects, "PJ"],
    ["Pending Projects", stats.pendingProjects, "ER"],
    ["Total Team Members", stats.teamMembers, "TM"],
    ["Open Tasks", stats.openTasks, "TK"],
    ["Completed Tasks", stats.completedTasks, "DL"],
    ["Overdue Tasks", stats.overdueTasks, "BD"],
    ["Upcoming Meetings", stats.upcomingMeetings, "MT"],
    ["Team Productivity", `${stats.teamProductivity}%`, "AN"],
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

  document.getElementById("quickActions").innerHTML = DASHBOARD_ACTIONS.map(
    (action) => `
      <a class="manager-action" href="${action.href}">
        <span class="kpi-icon">${getNavIconSvg(action.icon)}</span>
        <strong>${escapeHtml(action.title)}</strong>
        <span class="muted-line">${escapeHtml(action.description)}</span>
      </a>
    `,
  ).join("");

  document.getElementById("projectWatchlist").innerHTML = stats.projects
    .slice(0, 4)
    .map(
      (project) => `
        <article class="manager-project-card">
          <div class="manager-row-between">
            <div>
              <strong>${escapeHtml(project.projectName)}</strong>
              <p>${escapeHtml(project.clientName || "-")} • ${escapeHtml(project.department || "-")}</p>
            </div>
            <span class="status-pill ${statusClass(project.status)}">${escapeHtml(project.status || "Planning")}</span>
          </div>
          <div class="manager-inline-metrics">
            <span class="manager-badge">Budget ${formatCurrency(project.budget)}</span>
            <span class="manager-badge">Team ${project.teamSize || 0}</span>
            <span class="manager-badge">Open ${project.openTasks || 0}</span>
          </div>
          <div class="manager-progress"><span style="width:${Number(project.progress || 0)}%"></span></div>
          <footer class="manager-button-row">
            <a class="btn btn-primary" href="../projects/projects.html">View Details</a>
            <a class="btn ghost-btn" href="../team-management/team-management.html?projectId=${encodeURIComponent(project._id)}">Create Team</a>
          </footer>
        </article>
      `,
    )
    .join("");

  document.getElementById("taskWatchlist").innerHTML = stats.tasks
    .filter((task) => task.status !== "Completed")
    .sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0))
    .slice(0, 5)
    .map(
      (task) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(task.title)}</strong>
            <span class="priority-pill ${priorityClass(task.priority)}">${escapeHtml(task.priority || "Medium")}</span>
          </div>
          <p>${escapeHtml(task.projectName || "-")} • ${escapeHtml(task.assignee || "Unassigned")}</p>
          <div class="manager-inline-metrics">
            <span class="manager-badge">${escapeHtml(task.status)}</span>
            <span class="manager-badge">Due ${formatShortDate(task.deadline)}</span>
            <span class="manager-badge">${Number(task.progress || 0)}% progress</span>
          </div>
        </article>
      `,
    )
    .join("");

  const timeline = []
    .concat((stats.calls || []).slice(0, 2).map((call) => ({ kind: "Call", title: call.title, when: call.startTime || call.createdAt, state: call.status, note: call.notes || "Voice room saved" })))
    .concat((stats.meetings || []).slice(0, 3).map((meeting) => ({ kind: "Meeting", title: meeting.topic, when: meeting.dateTime || meeting.createdAt, state: meeting.status, note: meeting.agenda || "Agenda added" })))
    .sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));

  document.getElementById("collaborationTimeline").innerHTML = timeline.length
    ? timeline
        .map(
          (item) => `
            <article class="manager-timeline-item">
              <div class="manager-row-between">
                <strong>${escapeHtml(item.title)}</strong>
                <span class="manager-badge">${escapeHtml(item.kind)}</span>
              </div>
              <p>${escapeHtml(item.state)} • ${formatShortDate(item.when)}</p>
              <span class="muted-line">${escapeHtml(item.note)}</span>
            </article>
          `,
        )
        .join("")
    : '<div class="manager-empty">No collaboration history yet.</div>';

  const notifications = []
    .concat(window.managerHub?.getNotifications?.() || [])
    .concat(window.managerHub?.getAuditLogs?.() || [])
    .sort((a, b) => new Date(b.createdAt || b.generatedAt || 0) - new Date(a.createdAt || a.generatedAt || 0))
    .slice(0, 6);

  document.getElementById("notificationList").innerHTML = notifications
    .map((item) => {
      const title = item.title || item.action;
      const text = item.text || item.note;
      return `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(title)}</strong>
            <span class="manager-badge">${formatShortDate(item.createdAt || item.generatedAt)}</span>
          </div>
          <p>${escapeHtml(text || "")}</p>
        </article>
      `;
    })
    .join("");

  const alerts = window.managerHub?.getRiskAlerts?.() || [];
  document.getElementById("riskAlertList").innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
            <article class="manager-list-item">
              <div class="manager-row-between">
                <strong>${escapeHtml(alert.title)}</strong>
                <span class="manager-badge">${escapeHtml(alert.severity)}</span>
              </div>
              <p>${escapeHtml(alert.detail)}</p>
            </article>
          `,
        )
        .join("")
    : '<div class="manager-empty">No active automatic alerts right now.</div>';
}
