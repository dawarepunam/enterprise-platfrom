const FLOW_MODULES = [
  {
    title: "1. Dashboard Control Tower",
    image: "/assets/images/manager-module-dashboard.svg",
    summary: "First screen after manager login. Shows KPI cards, active project list, activity, and shortcut actions without changing the current dashboard route.",
    routes: [
      "/modules/manager/dashboard/dashboard.html",
      "/modules/manager/projects/projects.html",
      "/modules/manager/tasks/tasks.html",
      "/modules/manager/team/team.html",
    ],
    details: [
      "Active Projects card -> opens Assigned Projects.",
      "Pending Tasks card -> opens Tasks with incomplete work.",
      "Team Members card -> opens Users / Team workload context.",
      "Quick Create button -> project, task, meeting, file, sprint actions.",
    ],
  },
  {
    title: "2. Project Workspace",
    image: "/assets/images/manager-module-project-workspace.svg",
    summary: "Project card click opens the full execution workspace with overview, client context, timeline, team, tasks, files, and reports.",
    routes: [
      "/modules/manager/projects/projects.html",
      "/modules/manager/project-details/project-details.html",
    ],
    details: [
      "Project card -> project details workspace.",
      "Client actions -> view client, send update, open portal.",
      "Tabs -> overview, kanban, tasks, timeline, files, activity, reports.",
      "Right action rail -> assign developer, create task, upload files, schedule meeting.",
    ],
  },
  {
    title: "3. Tasks and Kanban",
    image: "/assets/images/manager-module-tasks-kanban.svg",
    summary: "Task creation and board execution merged into the manager flow. This maps task popup, drag status movement, detail drawer, and task routing.",
    routes: [
      "/modules/manager/tasks/tasks.html",
      "/modules/manager/kanban/kanban.html",
    ],
    details: [
      "Create Task -> opens task popup with module, assignee, priority, SLA, and attachments.",
      "Board columns -> backlog, to do, in progress, testing, completed, blocked.",
      "Task click -> opens task detail drawer.",
      "Card move -> updates status and refreshes live board state.",
    ],
  },
  {
    title: "4. Sprint and Team Workload",
    image: "/assets/images/manager-module-sprints-workload.svg",
    summary: "Sprint planning and capacity balancing layer added on top of existing team and reports flow so the manager can see velocity and overloaded users.",
    routes: [
      "/modules/manager/team/team.html",
      "/modules/manager/reports/reports.html",
    ],
    details: [
      "Sprint panel -> create sprint, sprint goal, velocity, burndown.",
      "Workload view -> capacity, pending tasks, free users, overloaded members.",
      "Member card -> shift, hold, or rebalance work.",
      "Burndown and throughput -> used for delivery review and planning.",
    ],
  },
  {
    title: "5. Meetings and Calendar",
    image: "/assets/images/manager-module-meetings-calendar.svg",
    summary: "Meetings module combines schedule popup, Teams/Meet/Zoom choice, upcoming meetings, and calendar timeline in one visual board.",
    routes: [
      "/modules/manager/meetings/meetings.html",
      "/modules/manager/calendar/calendar.html",
    ],
    details: [
      "Schedule Meeting -> popup with title, attendees, date, platform, notes.",
      "Platform selection -> Teams, Google Meet, Zoom, Offline.",
      "Meeting card -> opens meeting details and join link context.",
      "Calendar colors -> meetings, completed tasks, delayed work, client calls.",
    ],
  },
  {
    title: "6. Files and Client Updates",
    image: "/assets/images/manager-module-files-client-updates.svg",
    summary: "File hub and client communication merge. Manager can upload files, preview versions, and push delivery updates to the client from the same execution flow.",
    routes: [
      "/modules/manager/files/files.html",
      "/modules/manager/mailbox/mailbox.html",
    ],
    details: [
      "Upload File -> OneDrive-linked file flow.",
      "File card actions -> preview, download, share, delete, version history.",
      "Send Update -> select client, write update, attach file, send email.",
      "Client portal update -> progress and completed work synced visually.",
    ],
  },
  {
    title: "7. Reports and Automation",
    image: "/assets/images/manager-module-reports-automation.svg",
    summary: "Reports, delivery analytics, and rule-based automation close the loop. This is the manager's final control layer for progress, reminders, and client notifications.",
    routes: [
      "/modules/manager/reports/reports.html",
      "/modules/manager/notifications/notifications.html",
      "/modules/manager/history/history.html",
    ],
    details: [
      "Reports -> project progress, velocity, developer performance, delayed tasks.",
      "Automation -> deadline reminder, task complete notify client, meeting sync.",
      "Notifications -> realtime alerts from task, file, meeting, chat events.",
      "History -> audit trail for delivery events and status changes.",
    ],
  },
];

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  renderGallery();
});

function renderGallery() {
  const host = document.getElementById("flowGalleryCards");
  host.innerHTML = FLOW_MODULES.map(renderModuleCard).join("");
}

function renderModuleCard(module) {
  return `
    <article class="flow-gallery-card">
      <div class="flow-gallery-card-copy">
        <div>
          <p class="flow-eyebrow">Module View</p>
          <h2>${escapeHtml(module.title)}</h2>
          <p>${escapeHtml(module.summary)}</p>
          <div class="flow-route-chip-row">
            ${module.routes.map((route) => `<span class="flow-route-chip">${escapeHtml(route)}</span>`).join("")}
          </div>
        </div>
        <aside class="flow-note-box">
          <h3>Click Flow</h3>
          <ul class="flow-flat-list">
            ${module.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </aside>
      </div>
      <div class="flow-image-wrap">
        <img src="${module.image}" alt="${escapeHtml(module.title)} visual board" />
      </div>
    </article>
  `;
}
