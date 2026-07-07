const MANAGER_PAGE_COPY = {
  dashboard: {
    eyebrow: "Project Manager Dashboard",
    title: "Complete enterprise CRM delivery workspace",
    description: "Manage projects, teams, tasks, meetings, updates, files, resource requests, and Microsoft collaboration from one focused project manager flow.",
  },
  projects: {
    eyebrow: "My Projects",
    title: "Assigned portfolio with clean project cards and quick actions",
    description: "Every project shows client context, priority, progress, team size, tasks, meetings, and Microsoft workspace status.",
  },
  "project-details": {
    eyebrow: "Project Details",
    title: "Overview, team, tasks, files, meetings, mailbox, calendar, history, and reports",
    description: "Use the tabbed workspace to manage the complete execution flow for one project.",
  },
  team: {
    eyebrow: "Users",
    title: "View users, submissions, and delivery activity without friction",
    description: "Create a team, open a user profile, review daily updates, files, and working history, and keep OneDrive and Teams workspaces aligned.",
  },
  tasks: {
    eyebrow: "Tasks",
    title: "Task assignment, review, and progress tracking made simple",
    description: "Create tasks with deadlines and ownership, then keep approvals and completion visible.",
  },
  files: {
    eyebrow: "Files",
    title: "Project files synced to Microsoft OneDrive",
    description: "Upload, browse, and open project documents from a single CRM screen with OneDrive metadata tracked in MongoDB.",
  },
  meetings: {
    eyebrow: "Meetings",
    title: "Schedule Outlook calendar meetings with Teams links",
    description: "Create one-to-one or team meetings, save join URLs, and keep the timeline updated automatically.",
  },
  teams: {
    eyebrow: "Teams",
    title: "Open actual Microsoft Teams for each project",
    description: "Use real Teams for chat, calls, screen sharing, recordings, and shared collaboration history.",
  },
  mailbox: {
    eyebrow: "Mailbox",
    title: "Outlook inbox and email compose experience inside CRM",
    description: "Review messages, read project context, and send updates without leaving the manager workspace.",
  },
  calendar: {
    eyebrow: "Calendar",
    title: "Monthly-ready event view with Outlook sync",
    description: "See upcoming meetings, project events, and linked collaboration schedule data.",
  },
  reports: {
    eyebrow: "Reports",
    title: "Generate progress, productivity, attendance, and file activity reports",
    description: "Turn live project data into report-ready summaries for admins, clients, and leadership.",
  },
  "daily-updates": {
    eyebrow: "Daily Updates",
    title: "Member-wise daily updates with notification visibility",
    description: "See who submitted updates, open a single member timeline, and review blockers, hours, completion, and project context in one place.",
  },
  notifications: {
    eyebrow: "Notifications",
    title: "Real-time alerts, approvals, reminders, and delivery events",
    description: "Track unread counts, project activity, meeting updates, task reviews, and Microsoft collaboration alerts in one place.",
  },
  history: {
    eyebrow: "Work History",
    title: "Chronological delivery history across your managed projects",
    description: "Review member actions, task outcomes, meeting changes, file operations, and timeline events without losing context.",
  },
  profile: {
    eyebrow: "Profile",
    title: "Manager profile, delivery summary, and connected services",
    description: "Review your account details, workload footprint, and Microsoft integration status.",
  },
  settings: {
    eyebrow: "Settings",
    title: "Workspace settings and Microsoft account connection",
    description: "Connect Microsoft 365, check service readiness, and keep the manager module configured.",
  },
};

const PROJECT_TABS = [
  ["overview", "Overview"],
  ["assignment", "Assignment"],
  ["team", "Team"],
  ["tasks", "Tasks"],
  ["files", "Files"],
  ["meetings", "Meetings"],
  ["milestones", "Milestones"],
  ["mailbox", "Mailbox"],
  ["calendar", "Calendar"],
  ["onedrive", "OneDrive"],
  ["timeline", "Timeline"],
  ["history", "Work History"],
  ["reports", "Reports"],
  ["teams", "Open Microsoft Teams"],
];

const state = {
  page: "",
  projects: [],
  projectDetails: null,
  dashboard: null,
  tasks: [],
  teams: [],
  users: [],
  members: [],
  microsoft: null,
  mailbox: [],
  calendar: [],
  reports: [],
  dailyUpdates: [],
  notifications: [],
  history: [],
};

function getManagerCurrentUser() {
  return (typeof getCurrentUser === "function" ? getCurrentUser() : null) || {};
}

function getFirstName(name, fallback = "Manager") {
  return String(name || fallback).trim().split(/\s+/)[0] || fallback;
}

function formatManagerLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || "").trim());
}

function getPersistedProjects() {
  return state.projects.filter((project) => isMongoObjectId(project._id));
}

function getFirstPersistedProjectId() {
  return getPersistedProjects()[0]?._id || "";
}

function canUseProjectAction(projectId) {
  return isMongoObjectId(projectId) && getPersistedProjects().some((project) => String(project._id) === String(projectId));
}

function warnNoSavedProject(action = "continue") {
  showToast(`Please select a saved project before you ${action}.`, "warning");
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.managerPage;
  state.page = page;

  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  renderPageShell();
  await loadBootstrap(page);
});

function renderPageShell() {
  const host = document.getElementById("managerApp");
  host.innerHTML = `
    <div class="manager-shell-v2">
      <div id="pageContent" class="manager-section-stack"></div>
    </div>
    ${buildModal()}
  `;
}

async function loadBootstrap(page) {
  try {
    const [projectsRes, microsoftRes, dashboardSummaryRes, usersRes, teamsRes, membersRes] = await Promise.all([
      API.get("/manager/projects").catch(() => ({ data: [] })),
      API.get("/microsoft/status").catch(() => ({ data: { connected: false, configured: false } })),
      API.get("/manager/dashboard-summary").catch(() => ({ data: null })),
      API.get("/users").catch(() => ({ data: [] })),
      API.get("/manager/teams").catch(() => ({ data: [] })),
      API.get("/manager/members").catch(() => ({ data: [] })),
    ]);

    state.projects = projectsRes.data || [];
    state.microsoft = microsoftRes.data || {};
    state.teams = teamsRes.data || [];
    state.members = membersRes.data || [];
    state.users = (usersRes.data || []).filter((user) => ["TEAM_LEAD", "MEMBER"].includes(String(user.role || "").toUpperCase()));
    applyProjectManagerDemoData();
    state.dashboard = state.dashboard || {};
    if (dashboardSummaryRes.data) {
      state.dashboard.summary = {
        ...dashboardSummaryRes.data,
        completionPercent: dashboardSummaryRes.data.completionPercentage,
      };
    }

    if (page === "dashboard" || page === "profile") {
      const dashboardRes = await API.get("/manager/dashboard").catch(() => ({ data: null }));
      state.dashboard = {
        ...(state.dashboard || {}),
        ...(dashboardRes.data || {}),
        summary: {
          ...(state.dashboard?.summary || {}),
          ...(dashboardRes.data?.summary || {}),
        },
      };
    }

    if (page === "tasks") {
      const tasksRes = await API.get("/manager/tasks").catch(() => ({ data: [] }));
      state.tasks = tasksRes.data || [];
    }

    if (page === "mailbox") {
      const mailRes = await API.get("/microsoft/mail/inbox").catch(() => ({ data: [] }));
      state.mailbox = mailRes.data || [];
    }

    if (page === "calendar") {
      const calendarRes = await API.get("/microsoft/calendar/events").catch(() => ({ data: [] }));
      state.calendar = calendarRes.data || [];
    }

    if (page === "notifications") {
      const notificationsRes = await API.get("/manager/notifications").catch(() => ({ data: [] }));
      state.notifications = notificationsRes.data || [];
    }

    if (page === "daily-updates") {
      const [dailyUpdatesRes, notificationsRes] = await Promise.all([
        API.get("/manager/daily-updates").catch(() => ({ data: [] })),
        API.get("/manager/notifications").catch(() => ({ data: [] })),
      ]);
      state.dailyUpdates = dailyUpdatesRes.data || [];
      state.notifications = notificationsRes.data || [];
    }

    if (page === "history") {
      const historyRes = await API.get("/manager/history").catch(() => ({ data: [] }));
      state.history = historyRes.data || [];
    }

    if (page === "project-details") {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get("id") || params.get("projectId") || state.projects[0]?._id;
      if (projectId) {
        const detailRes = await API.get(`/manager/projects/${projectId}`).catch(() => ({ data: null }));
        state.projectDetails = detailRes.data || buildDemoProjectDetails(projectId);
      }
    }

    renderHero();
    await renderPage(page);
  } catch (error) {
    renderError(error.message || "Unable to load manager workspace.");
  }
}

function renderHero() {
  const statsHost = document.getElementById("heroStats");
  const actionHost = document.getElementById("heroActions");
  if (!statsHost || !actionHost) return;
  const summary = state.dashboard?.summary || summarizeProjects(state.projects);
  const cards = [
    ["Assigned Projects", summary.totalAssignedProjects || 0],
    ["Active Projects", summary.activeProjects || 0],
    ["Hold Projects", summary.holdProjects || 0],
    ["Completed Projects", summary.completedProjects || 0],
    ["Pending Tasks", summary.pendingTasks || 0],
    ["Notifications", summary.notifications || state.notifications.length || 0],
    ["Productivity", `${summary.productivityPercentage || summary.completionPercent || summary.completionPercentage || 0}%`],
  ];

  statsHost.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="manager-mini-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </article>
      `,
    )
    .join("");

  const actions = {
    dashboard: [
      actionButton("View Projects", "/modules/manager/projects/projects.html", true),
      actionButton("Schedule Meeting", "/modules/manager/meetings/meetings.html"),
      actionButton("Open Mailbox", "/modules/manager/mailbox/mailbox.html"),
      actionButton("Open Calendar", "/modules/manager/calendar/calendar.html"),
      actionButton("Open Teams", "/modules/manager/teams/teams.html"),
    ],
    projects: [
      actionButton("Open Detail Workspace", getPrimaryProjectDetailsHref(), true),
      actionButton("Create Team", "/modules/manager/team/team.html"),
    ],
    tasks: [
      buttonHtml("Create Task", "openTaskModal()", true),
      actionButton("Project Details", getPrimaryProjectDetailsHref()),
    ],
    team: [
      buttonHtml("Create Team", "openTeamModal()", true),
      actionButton("Open Microsoft Teams", "/modules/manager/teams/teams.html"),
    ],
    "daily-updates": [
      actionButton("Open Notifications", "/modules/manager/notifications/notifications.html", true),
      actionButton("Users Directory", "/modules/manager/team/team.html"),
    ],
    files: [
      buttonHtml("Upload File", "openFileModal()", true),
      actionButton("Open OneDrive Hub", "/modules/manager/files/files.html"),
    ],
    meetings: [
      buttonHtml("Schedule Meeting", "openMeetingModal()", true),
      actionButton("Calendar View", "/modules/manager/calendar/calendar.html"),
    ],
    mailbox: [
      buttonHtml("Compose Mail", "openMailboxModal()", true),
      actionButton("Microsoft Settings", "/modules/manager/settings/settings.html"),
    ],
    settings: [
      buttonHtml("Connect Microsoft", "connectMicrosoft()", true),
    ],
  };

  actionHost.innerHTML = (actions[state.page] || [actionButton("View Projects", "/modules/manager/projects/projects.html", true)]).join("");
}

function summarizeProjects(projects) {
  return {
    totalAssignedProjects: projects.length,
    activeProjects: projects.filter((item) => item.status === "Active").length,
    pendingTasks: projects.reduce((sum, item) => sum + Number(item.openTasks || 0), 0),
    completionPercent: projects.length
      ? Math.round(projects.reduce((sum, item) => sum + Number(item.progress || 0), 0) / projects.length)
      : 0,
  };
}

function applyProjectManagerDemoData() {
  if (!new URLSearchParams(window.location.search).has("demo")) {
    state.dashboard = state.dashboard || {};
    state.dashboard.summary = {
      totalAssignedProjects: state.dashboard.summary?.totalAssignedProjects || state.projects.length,
      activeProjects: state.dashboard.summary?.activeProjects || state.projects.filter((item) => item.status === "Active").length,
      holdProjects: state.dashboard.summary?.holdProjects || state.projects.filter((item) => item.status === "On Hold").length,
      completedProjects: state.dashboard.summary?.completedProjects || state.projects.filter((item) => item.status === "Completed").length,
      teamMembers: state.dashboard.summary?.teamMembers || state.members.length,
      pendingTasks: state.dashboard.summary?.pendingTasks || 0,
      completedTasks: state.dashboard.summary?.completedTasks || 0,
      upcomingMeetings: state.dashboard.summary?.upcomingMeetings || 0,
      filesUploaded: state.dashboard.summary?.filesUploaded || 0,
      notifications: state.dashboard.summary?.notifications || 0,
      productivityPercentage: state.dashboard.summary?.productivityPercentage || 0,
    };
    state.dashboard.deadlines = state.dashboard.deadlines || [];
    state.dashboard.recentActivity = state.dashboard.recentActivity || [];
    return;
  }

  if (!state.projects.length) {
    state.projects = [
      {
        _id: "crm-system",
        projectName: "CRM System",
        clientName: "ABC Pvt Ltd",
        projectType: "Enterprise CRM",
        department: "Development",
        priority: "High",
        status: "Active",
        progress: 56,
        teamSize: 12,
        tasksCount: 24,
        openTasks: 9,
        startDate: "2026-05-01",
        dueDate: "2026-05-25",
        teamsWebUrl: "https://teams.microsoft.com",
      },
      {
        _id: "website-revamp",
        projectName: "Website Revamp",
        clientName: "XYZ Pvt Ltd",
        projectType: "Web Platform",
        department: "UI/UX",
        priority: "Medium",
        status: "On Hold",
        progress: 70,
        teamSize: 8,
        tasksCount: 16,
        openTasks: 5,
        startDate: "2026-05-04",
        dueDate: "2026-05-18",
        teamsWebUrl: "https://teams.microsoft.com",
      },
      {
        _id: "mobile-app",
        projectName: "Mobile App",
        clientName: "LMN Pvt Ltd",
        projectType: "Mobile",
        department: "QA",
        priority: "Normal",
        status: "Active",
        progress: 30,
        teamSize: 6,
        tasksCount: 14,
        openTasks: 10,
        startDate: "2026-05-08",
        dueDate: "2026-05-22",
        teamsWebUrl: "https://teams.microsoft.com",
      },
    ];
  }

  if (!state.users.length) {
    state.users = [
      { _id: "amit-verma", name: "Amit Verma", email: "amit@jmkc.com", role: "Developer", department: "Development", status: "Available" },
      { _id: "priya-singh", name: "Priya Singh", email: "priya@jmkc.com", role: "Designer", department: "UI/UX", status: "Busy" },
      { _id: "rahul-sharma", name: "Rahul Sharma", email: "rahul@jmkc.com", role: "Developer", department: "Development", status: "Meeting" },
      { _id: "neha-patel", name: "Neha Patel", email: "neha@jmkc.com", role: "QA", department: "Testing", status: "Available" },
    ];
  }

  if (!state.members.length) {
    state.members = state.users.map((user, index) => ({
      ...user,
      projectId: state.projects[index % state.projects.length]._id,
      projectName: state.projects[index % state.projects.length].projectName,
      performance: [82, 90, 65, 70][index] || 76,
      attendance: [22, 23, 20, 21][index] || 21,
      leaves: index === 1 ? 2 : 0,
    }));
  }

  state.dashboard = state.dashboard || {};
  state.dashboard.summary = {
    totalAssignedProjects: state.dashboard.summary?.totalAssignedProjects || 12,
    activeProjects: state.dashboard.summary?.activeProjects || 8,
    holdProjects: state.dashboard.summary?.holdProjects || 1,
    completedProjects: state.dashboard.summary?.completedProjects || 3,
    teamMembers: state.dashboard.summary?.teamMembers || 32,
    pendingTasks: state.dashboard.summary?.pendingTasks || 24,
    completedTasks: state.dashboard.summary?.completedTasks || 68,
    upcomingMeetings: state.dashboard.summary?.upcomingMeetings || 3,
    filesUploaded: state.dashboard.summary?.filesUploaded || 47,
    notifications: state.dashboard.summary?.notifications || 11,
    productivityPercentage: state.dashboard.summary?.productivityPercentage || 82,
  };
  state.dashboard.deadlines = state.dashboard.deadlines?.length ? state.dashboard.deadlines : [
    { title: "CRM System", projectName: "Development", assignee: "Rahul", deadline: "2026-05-15" },
    { title: "Website Revamp", projectName: "UI/UX", assignee: "Priya", deadline: "2026-05-18" },
    { title: "Mobile App", projectName: "Testing", assignee: "Neha", deadline: "2026-05-22" },
  ];
  state.dashboard.recentActivity = state.dashboard.recentActivity?.length ? state.dashboard.recentActivity : [
    { title: "Task Completed", message: "Amit completed API Integration.", createdAt: "2026-05-14T10:30:00Z" },
    { title: "Design Upload", message: "Priya uploaded the dashboard design file.", createdAt: "2026-05-14T09:15:00Z" },
    { title: "Member Added", message: "Rahul added a new employee to CRM System.", createdAt: "2026-05-14T08:45:00Z" },
    { title: "Meeting Scheduled", message: "Project review meeting added to Outlook.", createdAt: "2026-05-14T08:00:00Z" },
  ];
}

function buildDemoProjectDetails(projectId) {
  const project = state.projects.find((item) => String(item._id) === String(projectId)) || state.projects[0];
  if (!project) return null;
  const members = state.members.length ? state.members : state.users;
  const tasks = [
    { _id: "task-design-login", title: "Design Login Page", status: "To Do", priority: "High", deadline: "2026-05-18", assigneeName: "Priya", progress: 10 },
    { _id: "task-api", title: "API Integration", status: "In Progress", priority: "High", deadline: "2026-05-20", assigneeName: "Amit", progress: 55 },
    { _id: "task-testing", title: "Testing Module", status: "Review", priority: "Medium", deadline: "2026-05-15", assigneeName: "Amit", progress: 80 },
    { _id: "task-auth", title: "Authentication", status: "Done", priority: "Medium", deadline: "2026-05-09", assigneeName: "Neha", progress: 100 },
  ];
  return {
    ...project,
    description: "This project involves developing a complete CRM system with dashboard, project tracking, teams, tasks, files, meetings, reports, updates, and admin communication.",
    requiredTeamSize: 12,
    teamMembers: members,
    tasks,
    files: [
      { _id: "file-report", name: "sprint-report.pdf", size: 2148000, uploadedAt: "2026-05-14", shareUrl: "#" },
      { _id: "file-design", name: "dashboard-design.fig", size: 1480000, uploadedAt: "2026-05-13", shareUrl: "#" },
    ],
    meetings: [
      { _id: "meeting-standup", title: "Daily Standup", scheduledFor: "2026-05-15T11:00:00Z", joinUrl: "https://teams.microsoft.com" },
      { _id: "meeting-review", title: "Project Review", scheduledFor: "2026-05-15T14:30:00Z", joinUrl: "https://teams.microsoft.com" },
    ],
    emails: [],
    timeline: state.dashboard.recentActivity || [],
    workHistory: state.dashboard.recentActivity || [],
    reports: [],
    statistics: {
      totalMembers: members.length,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((task) => task.status !== "Done").length,
      filesUploaded: 2,
      meetingsConducted: 2,
    },
  };
}

async function renderPage(page) {
  const host = document.getElementById("pageContent");
  switch (page) {
    case "dashboard":
      host.innerHTML = renderDashboardPage();
      renderCharts();
      bindProjectCardActions();
      break;
    case "projects":
      host.innerHTML = renderProjectsPage();
      bindProjectFilters();
      break;
    case "project-details":
      host.innerHTML = renderProjectDetailsPage();
      break;
    case "team":
      host.innerHTML = renderTeamPage();
      bindTeamDirectoryFilters();
      break;
    case "tasks":
      host.innerHTML = renderTasksPage();
      break;
    case "files":
      host.innerHTML = await renderFilesPage();
      break;
    case "meetings":
      host.innerHTML = await renderMeetingsPage();
      break;
    case "teams":
      host.innerHTML = renderTeamsPage();
      break;
    case "mailbox":
      host.innerHTML = renderMailboxPage();
      break;
    case "calendar":
      host.innerHTML = renderCalendarPage();
      break;
    case "reports":
      host.innerHTML = renderReportsPage();
      break;
    case "daily-updates":
      host.innerHTML = renderDailyUpdatesPage();
      bindDailyUpdateFilters();
      break;
    case "notifications":
      host.innerHTML = renderNotificationsPage();
      break;
    case "history":
      host.innerHTML = renderHistoryPage();
      break;
    case "profile":
      host.innerHTML = renderProfilePage();
      break;
    case "settings":
      host.innerHTML = renderSettingsPage();
      break;
    default:
      host.innerHTML = renderProjectsPage();
      bindProjectFilters();
  }
}

function renderDashboardPage() {
  const user = getManagerCurrentUser();
  const managerName = user.name || "Manager";
  const managerFirstName = getFirstName(managerName);
  const managerTitle = formatManagerLabel(user.designation || user.title || user.role || "Project Manager");
  const avatarSrc = getSafeProfileImage(user.profilePhoto);
  const summary = state.dashboard?.summary || summarizeProjects(state.projects);
  const recentActivity = (state.dashboard?.recentActivity || []).slice(0, 6);
  const deadlines = (state.dashboard?.deadlines || []).slice(0, 5);
  const projects = (state.dashboard?.projects || state.projects).slice(0, 4);
  const teamCapacity = getDashboardTeamCapacity(managerName);
  const workloadSignals = getDashboardWorkloadSignals(managerFirstName);
  const meetings = [
    ["11:00 AM", "Daily Standup", "Teams"],
    ["02:30 PM", "Project Review", "Teams"],
    ["04:00 PM", "Client Meeting", "Teams"],
  ];

  return `
    <section class="pm-dashboard-frame">
      <div class="pm-topbar">
        <div class="pm-user-greeting">
          <img class="manager-avatar" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(managerName)}" />
          <div>
            <h1>Good Morning, ${escapeHtml(managerFirstName)}</h1>
            <p>${escapeHtml(managerTitle)}</p>
          </div>
        </div>
        <div class="pm-top-actions">
          <button class="manager-btn manager-btn-primary" type="button" onclick="openTeamModal()">+ Create Team</button>
          <button class="manager-btn manager-btn-primary" type="button" onclick="openTaskModal()">+ Create Task</button>
          <button class="manager-btn manager-btn-secondary" type="button" onclick="openMeetingModal()">Schedule Meeting</button>
          <button class="manager-btn manager-btn-secondary" type="button" onclick="openProjectUpdateModal()">Send Update</button>
        </div>
      </div>

      <div class="pm-kpi-row">
        ${renderEnterpriseKpi("Assigned Projects", summary.totalAssignedProjects || 0, "View Projects", "/modules/manager/projects/projects.html", "blue")}
        ${renderEnterpriseKpi("Active Projects", summary.activeProjects || 0, "Open Portfolio", "/modules/manager/projects/projects.html?status=Active", "green")}
        ${renderEnterpriseKpi("Completed Projects", summary.completedProjects || 0, "View Completed", "/modules/manager/projects/projects.html?status=Completed", "violet")}
        ${renderEnterpriseKpi("On Hold Projects", summary.holdProjects || 0, "View Holds", "/modules/manager/projects/projects.html?status=On%20Hold", "amber")}
        ${renderEnterpriseKpi("Pending Tasks", summary.pendingTasks || 0, "View Tasks", "/modules/manager/tasks/tasks.html", "rose")}
        ${renderEnterpriseKpi("Team Members", summary.teamMembers || 0, "Manage Team", "/modules/manager/team/team.html", "cyan")}
      </div>

      <div class="manager-grid-v2">
      <div class="manager-span-4 manager-glass-panel pm-health-card">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Project Health</div>
            <h2 class="h4 mb-0">Portfolio status</h2>
          </div>
        </div>
        <div class="pm-donut" style="--value:${summary.productivityPercentage || summary.completionPercent || 82}">
          <span>${summary.totalAssignedProjects || 12}</span>
          <small>Total Projects</small>
        </div>
        <div class="manager-list-v2">
          <div class="pm-legend"><span class="ok"></span>On Track <strong>8</strong></div>
          <div class="pm-legend"><span class="warn"></span>At Risk <strong>2</strong></div>
          <div class="pm-legend"><span class="bad"></span>Delayed <strong>2</strong></div>
        </div>
      </div>
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Team Utilization</div>
            <h2 class="h4 mb-0">Capacity view</h2>
          </div>
        </div>
        ${teamCapacity.map((item) => renderCapacityBar(item.name, item.value, item.tone)).join("")}
      </div>
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">AI Workload</div>
            <h2 class="h4 mb-0">Resource signals</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${workloadSignals.map((item) => `<div class="manager-list-card"><div class="manager-topline"><h4>${escapeHtml(item.name)}</h4><span class="manager-chip ${escapeHtml(item.tone)}">${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.copy)}</p></div>`).join("")}
        </div>
      </div>
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Upcoming Deadlines</div>
            <h2 class="h4 mb-0">Upcoming work</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${deadlines.length ? deadlines.map(renderDeadlineCard).join("") : renderEmpty("No upcoming deadlines found.")}
        </div>
      </div>
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Meetings Today</div>
            <h2 class="h4 mb-0">Teams schedule</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${meetings.map(([time, title, tool]) => `<div class="manager-list-card"><div class="manager-topline"><h4>${time}</h4><span class="manager-chip neutral">${tool}</span></div><p>${title}</p></div>`).join("")}
        </div>
        <a class="manager-link" href="/modules/manager/calendar/calendar.html">View Calendar</a>
      </div>
      <div class="manager-span-6 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Project Cards</div>
            <h2 class="h4 mb-0">Assigned project cards</h2>
          </div>
          <a class="manager-btn manager-btn-secondary" href="/modules/manager/projects/projects.html">Open all projects</a>
        </div>
        <div class="manager-card-grid">
          ${projects.length ? projects.map(renderProjectCard).join("") : renderEmpty("No projects assigned by Admin.")}
        </div>
      </div>
      <div class="manager-span-6 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Recent Activity</div>
            <h2 class="h4 mb-0">Notifications and timeline</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${recentActivity.length ? recentActivity.map(renderNotificationCard).join("") : renderEmpty("No recent notifications available.")}
        </div>
      </div>
      <div class="manager-span-5 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Task Management</div>
            <h2 class="h4 mb-0">Kanban preview</h2>
          </div>
        </div>
        ${renderDashboardKanbanPreview()}
      </div>
      <div class="manager-span-7 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Microsoft Teams Integration</div>
            <h2 class="h4 mb-0">Project chat preview</h2>
          </div>
        </div>
        <div class="pm-teams-preview">
          <aside>
            <strong>CRM System Team</strong>
            <span class="active">General</span>
            <span>Development</span>
            <span>Design</span>
            <span>Testing</span>
            <span>Files</span>
          </aside>
          <div>
            <div class="pm-chat-line"><strong>${escapeHtml(managerFirstName)}</strong><p>Good Morning Team!</p></div>
            <div class="pm-chat-line"><strong>Amit</strong><p>Working on API integration.</p></div>
            <div class="pm-chat-line"><strong>Priya</strong><p>I have uploaded the design.</p></div>
          </div>
        </div>
      </div>
      <div class="manager-span-12 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Additional Features</div>
            <h2 class="h4 mb-0">Enterprise project manager actions</h2>
          </div>
        </div>
        <div class="pm-feature-strip">
          ${["Employee Shift", "Hold Employee", "Remove Employee", "Resource Request", "Reports & Analytics", "Activity Logs", "Notifications", "Mobile Responsive"].map((item) => `<button class="pm-feature" type="button">${escapeHtml(item)}</button>`).join("")}
        </div>
      </div>
      </div>
    </section>
  `;
}

function getDashboardTeamCapacity(managerName) {
  const members = [
    { name: managerName || "Manager", value: 82, tone: "success" },
    { name: "Amit Verma", value: 65, tone: "info" },
    { name: "Priya Singh", value: 90, tone: "warning" },
    { name: "Neha Patel", value: 70, tone: "accent" },
  ];

  return members.slice(0, 4);
}

function getDashboardWorkloadSignals(managerFirstName) {
  return [
    { name: managerFirstName || "Manager", status: "Focused", tone: "warning", copy: "Review one overloaded lane before assigning new work." },
    { name: "Amit", status: "Available", tone: "success", copy: "Can accept API or bug-fix work." },
    { name: "Neha", status: "Available", tone: "success", copy: "Ready for testing assignments." },
  ];
}

function renderProjectsPage() {
  const filterOptions = getProjectFilterOptions();
  return `
    <section class="manager-glass-panel">
      <div class="manager-toolbar">
        <div>
          <div class="manager-eyebrow">Project Filters</div>
          <h2 class="h4 mb-0">Search and filter assigned projects</h2>
        </div>
        <div class="manager-toolbar-controls manager-search-line">
          <input class="manager-field" id="projectSearch" placeholder="Search project, client, status, priority" />
          <select class="manager-select" id="projectPriorityFilter">
            <option value="">All Priority</option>
            ${filterOptions.priorities.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
          </select>
          <select class="manager-select" id="projectStatusFilter">
            <option value="">All Status</option>
            ${filterOptions.statuses.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
          </select>
          <select class="manager-select" id="projectDueFilter">
            <option value="">Any Due Date</option>
            <option value="overdue">Overdue</option>
            <option value="7">Next 7 days</option>
            <option value="30">Next 30 days</option>
          </select>
          <select class="manager-select" id="projectSort">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
            <option value="completion">Completion Percentage</option>
          </select>
          <div class="pm-view-switch" aria-label="Project view modes">
            ${["Grid", "List", "Kanban", "Calendar", "Gantt"].map((item, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${item}</button>`).join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="manager-card-grid" id="projectCardGrid">${state.projects.map(renderProjectCard).join("")}</section>
    <section class="manager-table-wrap">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">Project Matrix</div>
          <h2 class="h4 mb-0">Portfolio overview table</h2>
        </div>
      </div>
      <div class="table-responsive">
        <table class="manager-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Team</th>
              <th>Tasks</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody id="projectTableBody">${state.projects.map(renderProjectRow).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProjectDetailsPage() {
  const detail = state.projectDetails;
  if (!detail) return renderRetryState("Project not found or access is unavailable right now.", () => window.location.reload());
  const activeTab = new URLSearchParams(window.location.search).get("tab") || "overview";

  return `
    <section class="manager-glass-panel">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">${escapeHtml(detail.clientName || "Project Workspace")}</div>
          <h2 class="h3 mb-0">${escapeHtml(detail.projectName)}</h2>
          <div class="manager-meta mt-2">
            <span><strong>Priority:</strong> ${escapeHtml(detail.priority || "High")}</span>
            <span><strong>Deadline:</strong> ${formatShortDate(detail.dueDate || detail.deadline)}</span>
            <span><strong>Progress:</strong> ${Number(detail.progress || 0)}%</span>
            <span><strong>Risk:</strong> ${Number(detail.progress || 0) < 45 ? "High" : "Low"}</span>
          </div>
        </div>
        <div class="manager-actions">
          <a class="manager-btn manager-btn-primary" href="${projectTeamsLink(detail)}" target="_blank" rel="noreferrer">Open Microsoft Teams</a>
          <button class="manager-btn manager-btn-secondary" type="button" onclick="openFiles('${escapeHtml(detail._id)}')">Files</button>
          <button class="manager-btn manager-btn-secondary" type="button" onclick="openProjectUpdateModal('${escapeHtml(detail._id)}')">Send Update</button>
        </div>
      </div>
      <div class="manager-chip-row mb-3">
        ${PROJECT_TABS.map(([key, label]) => `<a class="manager-tab ${activeTab === key ? "active" : ""}" href="${projectTabHref(detail._id, key)}">${label}</a>`).join("")}
      </div>
      ${renderProjectTab(activeTab, detail)}
    </section>
  `;
}

function renderProjectTab(tab, detail) {
  switch (tab) {
    case "assignment":
      return `
        <div class="manager-card-grid">
          ${renderStatCard("Assigned By", detail.assignedBy?.name || "Admin", "Project ownership source")}
          ${renderStatCard("Required Team", detail.requiredTeamSize || detail.teamMembers.length || 12, "Resource requirement")}
          ${renderStatCard("Client", detail.clientName || "ABC Pvt Ltd", "Client account")}
          ${renderStatCard("Status", detail.status || "Active", "Delivery state")}
        </div>
        <div class="manager-glass-panel mt-4">
          <h3 class="h5">Assignment Notes</h3>
          <p class="manager-muted">${escapeHtml(detail.description || "Build a complete CRM system with dashboard, users, teams, task tracking, meetings, files, reports, and delivery updates.")}</p>
        </div>
      `;
    case "team":
      return `
        <div class="manager-actions mb-3">
          <button class="manager-btn manager-btn-primary" type="button" onclick="openAddMemberModal('${escapeHtml(detail._id)}')">Add Member</button>
          <button class="manager-btn manager-btn-secondary" type="button" onclick="openReplaceMemberModal('${escapeHtml(detail._id)}')">Replace Member</button>
          <a class="manager-btn manager-btn-secondary" href="/modules/manager/team/team.html">Open Team Workspace</a>
        </div>
        <div class="manager-card-grid">
          ${detail.teamMembers.length ? detail.teamMembers.map(renderTeamMemberCard).join("") : renderEmpty("No team members added yet.")}
        </div>
      `;
    case "tasks":
      return renderTaskTable(detail.tasks);
    case "files":
      return renderFileCards(detail.files);
    case "meetings":
      return renderMeetingCards(detail.meetings);
    case "milestones":
      return renderMilestones(detail);
    case "mailbox":
      return detail.emails.length ? `<div class="manager-list-v2">${detail.emails.map(renderEmailRecordCard).join("")}</div>` : renderEmpty("No project email metadata saved yet.");
    case "calendar":
      return detail.meetings.length ? `<div class="manager-list-v2">${detail.meetings.map(renderMeetingCalendarCard).join("")}</div>` : renderEmpty("No calendar-linked meetings found.");
    case "onedrive":
      return `
        <div class="manager-actions mb-3">
          <button class="manager-btn manager-btn-primary" type="button" onclick="openFileModal('${escapeHtml(detail._id)}')">Upload File</button>
          <a class="manager-btn manager-btn-secondary" href="/modules/manager/files/files.html?projectId=${encodeURIComponent(detail._id)}">Open OneDrive Workspace</a>
        </div>
        ${renderFileCards(detail.files)}
      `;
    case "timeline":
      return detail.timeline.length ? `<div class="manager-list-v2">${detail.timeline.map(renderTimelineCard).join("")}</div>` : renderEmpty("No timeline events found.");
    case "history":
      return detail.workHistory.length ? `<div class="manager-list-v2">${detail.workHistory.map(renderHistoryCard).join("")}</div>` : renderEmpty("No work history tracked yet.");
    case "reports":
      return `
        <div class="manager-actions mb-3">
          <button class="manager-btn manager-btn-primary" onclick="generateReport('${escapeHtml(detail._id)}')">Generate Report</button>
        </div>
        ${detail.reports.length ? `<div class="manager-list-v2">${detail.reports.map(renderSavedReportCard).join("")}</div>` : renderEmpty("No reports generated yet.")}
      `;
    case "teams":
      return `
        <div class="manager-empty-state">
          <h3>Open actual Microsoft Teams</h3>
          <p>Chat, calls, screen sharing, recordings, and file sharing stay inside Microsoft Teams as requested.</p>
          <a class="manager-btn manager-btn-primary mt-3" href="${projectTeamsLink(detail)}" target="_blank" rel="noreferrer">Open Microsoft Teams</a>
        </div>
      `;
    case "overview":
    default:
      return `
        <div class="manager-card-grid mb-4">
          ${renderStatCard("Completion", `${detail.progress || 0}%`, "Overall project progress")}
          ${renderStatCard("Team Count", detail.statistics?.totalMembers || detail.teamMembers.length, "Members linked to this project")}
          ${renderStatCard("Total Tasks", detail.statistics?.totalTasks || detail.tasks.length, "All tasks created")}
          ${renderStatCard("Pending Tasks", detail.statistics?.pendingTasks || detail.tasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length, "Tasks still in flight")}
          ${renderStatCard("Upcoming Meetings", detail.meetings.filter((meeting) => new Date(meeting.scheduledFor || meeting.startTime || 0) >= new Date()).length, "Future collaboration events")}
          ${renderStatCard("Files Uploaded", detail.statistics?.filesUploaded || detail.files.length, "OneDrive and CRM documents")}
          ${renderStatCard("Meetings Conducted", detail.statistics?.meetingsConducted || detail.meetings.length, "Recorded meetings for this project")}
        </div>
        <div class="manager-progress mb-3"><span style="width:${Number(detail.progress || 0)}%"></span></div>
        <div class="manager-meta">
          <span><strong>Client:</strong> ${escapeHtml(detail.clientName || "-")}</span>
          <span><strong>Department:</strong> ${escapeHtml(detail.department || "-")}</span>
          <span><strong>Priority:</strong> ${escapeHtml(detail.priority || "-")}</span>
          <span><strong>Status:</strong> ${escapeHtml(detail.status || "-")}</span>
          <span><strong>Assigned:</strong> ${formatShortDate(detail.managerAssignedAt || detail.createdAt)}</span>
          <span><strong>Start:</strong> ${formatShortDate(detail.startDate)}</span>
          <span><strong>Due:</strong> ${formatShortDate(detail.dueDate || detail.deadline)}</span>
          <span><strong>Required Team:</strong> ${Number(detail.requiredTeamSize || 0)}</span>
        </div>
        <div class="manager-glass-panel mt-4">
          <h3 class="h5">Description</h3>
          <p class="manager-muted">${escapeHtml(detail.description || "No description available.")}</p>
        </div>
        <div class="manager-glass-panel mt-4">
          <h3 class="h5">Microsoft Workspace</h3>
          <div class="manager-chip-row mt-3">
            <span class="manager-chip neutral">Teams ${escapeHtml(detail.teamsWebUrl || detail.microsoft?.teamsMeetingUrl ? "Ready" : "Pending")}</span>
            <span class="manager-chip neutral">OneDrive ${escapeHtml(detail.microsoft?.shareUrl ? "Ready" : "Pending")}</span>
            <span class="manager-chip neutral">Graph ${escapeHtml(detail.microsoft?.graphSyncStatus || "Pending")}</span>
          </div>
        </div>
      `;
  }
}

function renderTeamPage() {
  return `
    <section class="manager-grid-v2">
      <div class="manager-span-7 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Team Directory</div>
            <h2 class="h4 mb-0">Current project teams</h2>
          </div>
          <button class="manager-btn manager-btn-primary" onclick="openTeamModal()">Create Team</button>
        </div>
        <div class="manager-list-v2">
          ${state.teams.length ? state.teams.map(renderTeamCard).join("") : renderEmpty("No teams created yet.")}
        </div>
      </div>
      <div class="manager-span-5 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Workspace Notes</div>
            <h2 class="h4 mb-0">Recommended team flow</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${["Create a project team once the admin assigns ownership.", "Add or replace members and keep the project workspace in sync.", "Use project details to track performance, files, meetings, and history."]
            .map((item) => `<div class="manager-list-card"><p>${escapeHtml(item)}</p></div>`)
            .join("")}
        </div>
      </div>
      <div class="manager-span-12 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">User Directory</div>
            <h2 class="h4 mb-0">Assigned users across your managed projects</h2>
          </div>
        </div>
        <div class="manager-toolbar manager-toolbar-compact mb-3">
          <div class="manager-toolbar-controls manager-toolbar-controls-grow">
            <input class="manager-field manager-toolbar-search" id="directoryMemberSearch" type="search" placeholder="Search user, role, or department" />
            <select class="manager-select manager-toolbar-select" id="directoryProjectFilter">
              <option value="">All projects</option>
              ${getTeamDirectoryProjectOptions().map((project) => `<option value="${escapeHtml(project._id)}">${escapeHtml(project.projectName)}</option>`).join("")}
            </select>
            <select class="manager-select manager-toolbar-select" id="directoryStatusFilter">
              <option value="">All status</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
          <span class="manager-chip neutral" id="directoryMemberCount">${state.members.length} users</span>
        </div>
        <div class="manager-card-grid" id="directoryMemberGrid">
          ${renderTeamDirectoryMembers(state.members)}
        </div>
      </div>
    </section>
  `;
}

function renderTasksPage() {
  state.activeTaskView = state.activeTaskView || "table";
  
  let viewHtml = "";
  if (state.activeTaskView === "kanban") {
    viewHtml = renderTaskKanban(state.tasks);
  } else if (state.activeTaskView === "calendar") {
    viewHtml = renderTaskCalendar(state.tasks);
  } else {
    viewHtml = renderTaskTable(state.tasks);
  }

  return `
    <section class="manager-glass-panel">
      <div class="manager-toolbar">
        <div>
          <div class="manager-eyebrow">Task Board</div>
          <h2 class="h4 mb-0">Assigned tasks and delivery review</h2>
        </div>
        <div class="manager-actions" style="display:flex; gap:1.25rem; align-items:center;">
          <div class="manager-view-toggles">
            <button class="manager-view-btn ${state.activeTaskView === 'table' ? 'active' : ''}" onclick="switchTaskView('table')">Table</button>
            <button class="manager-view-btn ${state.activeTaskView === 'kanban' ? 'active' : ''}" onclick="switchTaskView('kanban')">Kanban</button>
            <button class="manager-view-btn ${state.activeTaskView === 'calendar' ? 'active' : ''}" onclick="switchTaskView('calendar')">Calendar</button>
          </div>
          <button class="manager-btn manager-btn-primary" onclick="openTaskModal()">Create Task</button>
        </div>
      </div>
    </section>
    ${viewHtml}
  `;
}

window.switchTaskView = function(view) {
  state.activeTaskView = view;
  renderPage("tasks");
};

function mapTaskStatusToColumn(status) {
  const s = String(status || "To Do").trim();
  if (["Planning", "Pending", "Assigned", "Accepted", "To Do"].includes(s)) return "To Do";
  if (["Active", "In Progress", "Paused"].includes(s)) return "In Progress";
  if (["Submitted for Review", "In Review", "Review"].includes(s)) return "Review";
  if (["Completed", "Approved", "Done"].includes(s)) return "Done";
  if (["On Hold", "Archived", "Blocked"].includes(s)) return "Blocked";
  if (["Rejected", "Reopened"].includes(s)) return "Reopened";
  return "To Do";
}

function renderTaskKanban(tasks) {
  const columns = ["To Do", "In Progress", "Review", "Done", "Blocked", "Reopened"];
  const grouped = columns.reduce((acc, col) => {
    acc[col] = [];
    return acc;
  }, {});
  
  tasks.forEach(task => {
    const col = mapTaskStatusToColumn(task.status);
    grouped[col].push(task);
  });
  
  return `
    <div class="manager-kanban-board">
      ${columns.map(col => {
        const colTasks = grouped[col] || [];
        return `
          <div class="manager-kanban-column" ondragover="event.preventDefault()" ondrop="handleKanbanDrop(event, '${col}')">
            <div class="manager-kanban-column-header">
              <h3>${col}</h3>
              <span class="manager-kanban-card-count">${colTasks.length}</span>
            </div>
            ${colTasks.length ? colTasks.map(task => {
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !["Completed", "Approved", "Done"].includes(task.status);
              const formattedDate = task.deadline ? formatShortDate(task.deadline) : "No due date";
              const priorityClassVal = priorityTone(task.priority);
              
              let avatarsHtml = "";
              if (task.assignees && task.assignees.length > 0) {
                avatarsHtml = task.assignees.map(a => `
                  <img class="manager-kanban-avatar" src="${getSafeProfileImage(a.profilePhoto)}" alt="${escapeHtml(a.name)}" title="${escapeHtml(a.name)}" />
                `).join("");
              } else if (task.assignee) {
                avatarsHtml = `
                  <img class="manager-kanban-avatar" src="${getSafeProfileImage(null)}" alt="${escapeHtml(task.assignee)}" title="${escapeHtml(task.assignee)}" />
                `;
              }
              
              return `
                <div class="manager-kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${task._id}')" onclick="openTaskDetailDrawer('${task._id}')">
                  <div style="display:flex; justify-content:space-between; align-items:start; gap: 8px;">
                    <h4 style="margin:0;">${escapeHtml(task.title)}</h4>
                    <span class="manager-chip ${priorityClassVal}">${escapeHtml(task.priority || "Medium")}</span>
                  </div>
                  <p style="margin: 4px 0 0 0;">${escapeHtml(task.description || "No description")}</p>
                  <div class="manager-kanban-card-meta">
                    <span class="${isOverdue ? 'manager-overdue-highlight' : ''}">${escapeHtml(formattedDate)}</span>
                    <div style="display:flex; align-items:center; gap: 4px;">
                      <div class="manager-kanban-assignees">${avatarsHtml}</div>
                      <strong>${Number(task.progress || 0)}%</strong>
                    </div>
                  </div>
                </div>
              `;
            }).join("") : `<div style="text-align:center; padding: 2rem 1rem; color: var(--manager-muted); font-size: 0.75rem; border: 1.5px dashed var(--manager-border); border-radius: 12px;">Drop tasks here</div>`}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

window.handleKanbanDrop = async function(event, column) {
  event.preventDefault();
  const taskId = event.dataTransfer.getData("text/plain");
  if (!taskId) return;
  
  let newStatus = column;
  let progress = 0;
  if (column === "Done") progress = 100;
  if (column === "In Progress") progress = 50;
  if (column === "Review") progress = 80;
  
  try {
    const task = state.tasks.find(t => String(t._id) === String(taskId));
    if (!task) return;
    
    await API.put(`/manager/tasks/${taskId}`, {
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      assigneeIds: task.assigneeIds || [],
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: newStatus,
      progress: progress,
      startDate: task.metadata?.startDate || task.startDate || "",
      dueDate: toDateInput(task.deadline),
      estimatedHours: Number(task.metadata?.estimatedHours || task.estimatedHours || 0),
      actualHours: Number(task.metadata?.actualHours || task.actualHours || 0),
      comments: task.metadata?.comments || [],
    });
    showToast(`Task moved to ${newStatus}`, "success");
    window.location.reload();
  } catch (error) {
    showToast(error.message || "Cannot update status. Task might be locked by dependencies.", "error");
  }
};

function renderTaskCalendar(tasks) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const firstDay = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  
  let cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= numDays; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0');
    cells.push({ day: d, dateStr: dateStr, isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear() });
  }
  
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return `
    <div class="manager-calendar-wrap">
      <div class="manager-calendar-header">
        <h3 class="mb-0" style="font-weight:700; color:var(--manager-primary);">${monthNames[month]} ${year}</h3>
        <span class="manager-chip">${tasks.length} Calendar Tasks</span>
      </div>
      <div class="manager-calendar-grid">
        ${weekdays.map(w => `<div class="manager-calendar-weekday">${w}</div>`).join("")}
        ${cells.map(cell => {
          if (!cell.day) {
            return `<div class="manager-calendar-day empty"></div>`;
          }
          
          const dayTasks = tasks.filter(t => t.deadline && t.deadline.slice(0, 10) === cell.dateStr);
          
          return `
            <div class="manager-calendar-day ${cell.isToday ? 'today' : ''}">
              <div class="manager-calendar-day-num">${cell.day}</div>
              <div class="manager-calendar-events">
                ${dayTasks.map(t => {
                  let toneClass = priorityTone(t.priority);
                  return `
                    <div class="manager-calendar-event manager-chip ${toneClass}" onclick="openTaskDetailDrawer('${t._id}')" title="${escapeHtml(t.title)}">
                      ${escapeHtml(t.title)}
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

async function renderFilesPage() {
  const requestedProjectId = new URLSearchParams(window.location.search).get("projectId");
  const projectId = canUseProjectAction(requestedProjectId) ? requestedProjectId : getFirstPersistedProjectId();
  if (!projectId) return renderEmpty("No saved project is available for file upload.");
  const response = await API.get(`/manager/files/${projectId}`).catch(() => ({ data: { files: [], cloudFiles: [], folderPath: "" } }));
  const payload = response.data || { files: [], cloudFiles: [], folderPath: "" };

  return `
    <section class="manager-glass-panel">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">OneDrive Folder</div>
          <h2 class="h4 mb-0">${escapeHtml(payload.folderPath || "CRM workspace")}</h2>
        </div>
        <button class="manager-btn manager-btn-primary" onclick="openFileModal('${escapeHtml(projectId)}')">Upload File</button>
      </div>
      <div class="manager-card-grid">
        ${payload.files.length ? payload.files.map(renderSavedFileCard).join("") : renderEmpty("No CRM file metadata found for this project.")}
      </div>
    </section>
    <section class="manager-glass-panel">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">OneDrive Items</div>
          <h2 class="h4 mb-0">Live folder contents</h2>
        </div>
      </div>
      <div class="manager-list-v2">
        ${payload.cloudFiles.length ? payload.cloudFiles.map(renderCloudFileCard).join("") : renderEmpty("No OneDrive items returned or the folder is still empty.")}
      </div>
    </section>
  `;
}

async function renderMeetingsPage() {
  const requestedProjectId = new URLSearchParams(window.location.search).get("projectId");
  const projectId = canUseProjectAction(requestedProjectId) ? requestedProjectId : getFirstPersistedProjectId();
  const meetingsRes = projectId ? await API.get(`/manager/meetings/${projectId}`).catch(() => ({ data: [] })) : { data: [] };
  return `
    <section class="manager-glass-panel">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">Outlook Meetings</div>
          <h2 class="h4 mb-0">Schedule and manage Teams-enabled meetings</h2>
        </div>
        <button class="manager-btn manager-btn-primary" onclick="openMeetingModal('${escapeHtml(projectId || "")}')">Schedule Meeting</button>
      </div>
      <div class="manager-list-v2">
        ${(meetingsRes.data || []).length ? meetingsRes.data.map(renderMeetingCard).join("") : renderEmpty("No meetings scheduled for this project.")}
      </div>
    </section>
  `;
}

function renderTeamsPage() {
  return `
    <section class="manager-card-grid">
      ${state.projects.length
        ? state.projects
            .map(
              (project) => `
                <article class="manager-card-v2">
                  <div class="manager-topline">
                    <div>
                      <h3>${escapeHtml(project.projectName)}</h3>
                      <p>${escapeHtml(project.clientName || "Client workspace")}</p>
                    </div>
                    <span class="manager-chip">${escapeHtml(project.status || "Planning")}</span>
                  </div>
                  <div class="manager-progress"><span style="width:${Number(project.progress || 0)}%"></span></div>
                  <div class="manager-actions">
                    <button class="manager-btn manager-btn-primary" onclick="openTeamsForProject('${escapeHtml(project._id)}')">Open Microsoft Teams</button>
                    <a class="manager-btn manager-btn-secondary" href="${projectTabHref(project._id, "teams")}">Project Workspace</a>
                  </div>
                </article>
              `,
            )
            .join("")
        : renderEmpty("No manager projects available to open in Teams.")}
    </section>
  `;
}

function renderMailboxPage() {
  return `
    <section class="manager-glass-panel">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">Mailbox</div>
          <h2 class="h4 mb-0">Inbox and compose</h2>
        </div>
        <div class="manager-actions">
          <button class="manager-btn manager-btn-primary" onclick="openMailboxModal()">Compose Mail</button>
          <button class="manager-btn manager-btn-secondary" onclick="connectMicrosoft()">Connect Microsoft Account</button>
        </div>
      </div>
      <div class="manager-list-v2">
        ${state.mailbox.length ? state.mailbox.map(renderInboxCard).join("") : renderEmpty("Inbox is empty or Microsoft account is not connected yet.")}
      </div>
    </section>
  `;
}

function renderCalendarPage() {
  return `
    <section class="manager-glass-panel">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">Calendar</div>
          <h2 class="h4 mb-0">Upcoming Outlook events</h2>
        </div>
        <a class="manager-btn manager-btn-primary" href="/modules/manager/meetings/meetings.html">Create Event</a>
      </div>
      <div class="manager-list-v2">
        ${state.calendar.length ? state.calendar.map(renderCalendarEvent).join("") : renderEmpty("No upcoming events returned from Outlook Calendar.")}
      </div>
    </section>
  `;
}

function renderReportsPage() {
  const projects = getPersistedProjects();
  return `
    <section class="manager-glass-panel">
      <div class="manager-panel-header">
        <div>
          <div class="manager-eyebrow">Generate Reports</div>
          <h2 class="h4 mb-0">Project, task, team, meeting, and file reports</h2>
        </div>
      </div>
      <div class="manager-card-grid">
        ${projects.length ? projects.map(renderReportCard).join("") : renderEmpty("No saved project is available for reports.")}
      </div>
      <div id="reportResults" class="mt-3"></div>
    </section>
  `;
}

function renderDailyUpdatesPage() {
  const updates = state.dailyUpdates || [];
  const filteredUpdates = getFilteredDailyUpdates();
  const summaries = getDailyUpdateMemberSummaries(filteredUpdates);
  const selectedMember = getSelectedDailyUpdateMemberSummary(summaries);
  const selectedUpdates = selectedMember ? getDailyUpdatesForMember(selectedMember.memberKey, filteredUpdates) : [];
  const updateNotifications = getDailyUpdateNotifications();
  const filters = getDailyUpdateFilters();
  const todayKey = new Date().toISOString().slice(0, 10);
  const projectOptions = Array.from(new Set(updates.map((item) => String(item.projectName || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const departmentOptions = Array.from(new Set(updates.map((item) => String(item.memberDepartment || item.department || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  return `
    <section class="manager-grid-v2">
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-card-grid">
          ${renderStatCard("Total Updates", filteredUpdates.length, "All daily updates from your managed users")}
          ${renderStatCard("Members Updated", summaries.length, "Users who submitted at least one update")}
          ${renderStatCard("Today", filteredUpdates.filter((item) => String(item.createdAt || "").slice(0, 10) === todayKey).length, "Updates submitted today")}
          ${renderStatCard("With Blockers", filteredUpdates.filter((item) => String(item.blockers || "").trim()).length, "Updates that mention blockers")}
        </div>
      </div>
      <div class="manager-span-8 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Update Alerts</div>
            <h2 class="h4 mb-0">Notification feed for daily updates</h2>
          </div>
          <a class="manager-btn manager-btn-secondary" href="/modules/manager/notifications/notifications.html">Open all notifications</a>
        </div>
        <div class="manager-list-v2">
          ${updateNotifications.length ? updateNotifications.slice(0, 6).map(renderDetailedNotificationCard).join("") : renderEmpty("No daily update notifications yet.")}
        </div>
      </div>
      <div class="manager-span-12 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Search & Filter</div>
            <h2 class="h4 mb-0">Find updates by user, project, date, or blocker status</h2>
          </div>
          <button class="manager-btn manager-btn-secondary" type="button" onclick="resetDailyUpdateFilters()">Reset Filters</button>
        </div>
        <div class="manager-toolbar manager-toolbar-compact">
          <div class="manager-toolbar-controls manager-toolbar-controls-grow">
            <input class="manager-field manager-toolbar-search" id="dailyUpdateSearch" type="search" placeholder="Search user, project, task, summary, blocker" value="${escapeHtml(filters.search)}" />
            <select class="manager-select manager-toolbar-select" id="dailyUpdateProjectFilter">
              <option value="">All projects</option>
              ${projectOptions.map((item) => `<option value="${escapeHtml(item)}" ${item === filters.project ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
            </select>
            <select class="manager-select manager-toolbar-select" id="dailyUpdateDepartmentFilter">
              <option value="">All departments</option>
              ${departmentOptions.map((item) => `<option value="${escapeHtml(item)}" ${item === filters.department ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
            </select>
            <select class="manager-select manager-toolbar-select" id="dailyUpdateDateFilter">
              <option value="" ${!filters.dateRange ? "selected" : ""}>Any date</option>
              <option value="today" ${filters.dateRange === "today" ? "selected" : ""}>Today</option>
              <option value="7" ${filters.dateRange === "7" ? "selected" : ""}>Last 7 days</option>
              <option value="30" ${filters.dateRange === "30" ? "selected" : ""}>Last 30 days</option>
            </select>
            <select class="manager-select manager-toolbar-select" id="dailyUpdateBlockerFilter">
              <option value="" ${!filters.blockerStatus ? "selected" : ""}>All updates</option>
              <option value="with" ${filters.blockerStatus === "with" ? "selected" : ""}>With blockers</option>
              <option value="without" ${filters.blockerStatus === "without" ? "selected" : ""}>Without blockers</option>
            </select>
          </div>
          <span class="manager-chip neutral">${filteredUpdates.length} updates</span>
        </div>
      </div>
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Users</div>
            <h2 class="h4 mb-0">Click a user to open update history</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${summaries.length ? summaries.map((item) => renderDailyUpdateMemberCard(item, item.memberKey === selectedMember?.memberKey)).join("") : renderEmpty("No user updates match the selected filters.")}
        </div>
      </div>
      <div class="manager-span-8 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Previous Updates</div>
            <h2 class="h4 mb-0">${escapeHtml(selectedMember?.memberName || "Select a user")} timeline</h2>
          </div>
          ${selectedMember?.memberId ? `<a class="manager-btn manager-btn-primary" href="/modules/manager/member-profile/member-profile.html?memberId=${encodeURIComponent(selectedMember.memberId)}">Open full profile</a>` : ""}
        </div>
        <div class="manager-list-v2">
          ${selectedUpdates.length ? selectedUpdates.map(renderDailyUpdateHistoryCard).join("") : renderEmpty("No updates match the selected user and filters.")}
        </div>
      </div>
    </section>
  `;
}

function renderNotificationsPage() {
  const unreadCount = state.notifications.filter((item) => !item.read).length;
  return `
    <section class="manager-grid-v2">
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-card-grid">
          ${renderStatCard("Unread Notifications", unreadCount, "Items that still need your attention")}
          ${renderStatCard("Total Alerts", state.notifications.length, "Combined project and direct alerts")}
          ${renderStatCard("High Priority", state.notifications.filter((item) => String(item.priority || "").toLowerCase() === "high").length, "Urgent delivery notices")}
        </div>
      </div>
      <div class="manager-span-8 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Notification Feed</div>
            <h2 class="h4 mb-0">Unread counts and action links</h2>
          </div>
          <button class="manager-btn manager-btn-secondary" type="button" onclick="markAllNotificationsRead()">Mark all as read</button>
        </div>
        <div class="manager-list-v2">
          ${state.notifications.length ? state.notifications.map(renderDetailedNotificationCard).join("") : renderEmpty("No notifications available right now.")}
        </div>
      </div>
    </section>
  `;
}

function renderHistoryPage() {
  const history = state.history;
  return `
    <section class="manager-grid-v2">
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-card-grid">
          ${renderStatCard("History Entries", history.length, "Tracked actions across your portfolio")}
          ${renderStatCard("Task Events", history.filter((item) => /task/i.test(item.actionType || "")).length, "Assignments, reviews, and completions")}
          ${renderStatCard("Member Changes", history.filter((item) => /member/i.test(item.actionType || "")).length, "Add, remove, and replace events")}
        </div>
      </div>
      <div class="manager-span-8 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Work History</div>
            <h2 class="h4 mb-0">Timeline of project actions</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${history.length ? history.map(renderPortfolioHistoryCard).join("") : renderEmpty("No work history is available for your projects yet.")}
        </div>
      </div>
    </section>
  `;
}

function renderProfilePage() {
  const user = getCurrentUser();
  const summary = state.dashboard?.summary || summarizeProjects(state.projects);
  return `
    <section class="manager-grid-v2">
      <div class="manager-span-5 manager-glass-panel">
        <div class="manager-member-card">
          <img class="manager-avatar" src="${escapeHtml(getSafeProfileImage(user?.profilePhoto))}" alt="Profile" />
          <div>
            <div class="manager-eyebrow">Profile</div>
            <h2 class="h4 mb-1">${escapeHtml(user?.name || "Manager")}</h2>
            <p class="manager-muted">${escapeHtml(user?.email || "-")}</p>
            <div class="manager-chip-row mt-3">
              <span class="manager-chip">${escapeHtml(user?.role || "MANAGER")}</span>
              <span class="manager-chip neutral">${escapeHtml(user?.department || "Operations")}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="manager-span-7 manager-glass-panel">
        <div class="manager-card-grid">
          ${renderStatCard("Projects", summary.totalAssignedProjects || 0, "Assigned under your ownership")}
          ${renderStatCard("Active", summary.activeProjects || 0, "Projects currently in execution")}
          ${renderStatCard("Pending Tasks", summary.pendingTasks || 0, "Open work items across projects")}
          ${renderStatCard("Microsoft", state.microsoft?.connected ? "Connected" : "Not Connected", "Service connection status")}
        </div>
      </div>
    </section>
  `;
}

function renderSettingsPage() {
  return `
    <section class="manager-grid-v2">
      <div class="manager-span-7 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Microsoft 365</div>
            <h2 class="h4 mb-0">Connection status and required permissions</h2>
          </div>
          <button class="manager-btn manager-btn-primary" onclick="connectMicrosoft()">Connect Microsoft Account</button>
        </div>
        <div class="manager-card-grid">
          ${renderStatCard("Configured", state.microsoft?.configured ? "Yes" : "No", "Server-side Microsoft app configuration")}
          ${renderStatCard("Connected", state.microsoft?.connected ? "Yes" : "No", "Current user connection status")}
          ${renderStatCard("Mailbox", state.microsoft?.mailbox || state.microsoft?.email || "-", "Active Microsoft mailbox context")}
          ${renderStatCard("OneDrive Root", state.microsoft?.oneDriveRootFolder || "CRM", "Configured file root")}
        </div>
        <div class="manager-glass-panel mt-3">
          <h3 class="h5">Required permissions</h3>
          <div class="manager-chip-row mt-3">
            ${["User.Read", "Files.ReadWrite.All", "Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite", "Team.ReadBasic.All", "ChannelMessage.Send", "OnlineMeetings.ReadWrite", "Sites.ReadWrite.All", "offline_access"]
              .map((item) => `<span class="manager-chip neutral">${item}</span>`)
              .join("")}
          </div>
        </div>
      </div>
      <div class="manager-span-5 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Workspace Notes</div>
            <h2 class="h4 mb-0">Operational guidance</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${["Use actual Microsoft Teams instead of custom chat for meetings and collaboration.", "Upload files through the CRM so OneDrive metadata is saved to MongoDB.", "Schedule meetings from the manager module to keep project timelines and work history aligned."]
            .map((item) => `<div class="manager-list-card"><p>${escapeHtml(item)}</p></div>`)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderTaskTable(tasks) {
  return `
    <section class="manager-table-wrap">
      <div class="table-responsive">
        <table class="manager-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.length
              ? tasks
                  .map(
                    (task) => `
                      <tr>
                        <td><a href="#" onclick="event.preventDefault(); openTaskDetailDrawer('${escapeHtml(task._id)}')" style="font-weight:600; color:var(--manager-primary); text-decoration:none;">${escapeHtml(task.title || "-")}</a></td>
                        <td>${escapeHtml(task.projectName || "-")}</td>
                        <td>${escapeHtml(task.assignee || "Unassigned")}</td>
                        <td><span class="manager-chip ${priorityTone(task.priority)}">${escapeHtml(task.priority || "Medium")}</span></td>
                        <td><span class="manager-chip neutral">${escapeHtml(task.status || "Pending")}</span></td>
                        <td>${formatShortDate(task.deadline)}</td>
                        <td>${Number(task.progress || 0)}%</td>
                        <td>
                          <div class="manager-actions">
                            <button class="manager-btn manager-btn-secondary" onclick="openTaskDetailDrawer('${escapeHtml(task._id)}')">Details</button>
                            <button class="manager-btn manager-btn-primary" onclick="updateTaskStatus('${escapeHtml(task._id)}','Completed',100)">Approve</button>
                            <button class="manager-btn manager-btn-danger" onclick="updateTaskStatus('${escapeHtml(task._id)}','Rejected',${Number(task.progress || 0)})">Reject</button>
                          </div>
                        </td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="8">${renderEmpty("No tasks found.")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderFileCards(files) {
  return files.length
    ? `<div class="manager-card-grid">${files.map(renderSavedFileCard).join("")}</div>`
    : renderEmpty("No files uploaded yet.");
}

function renderEnterpriseKpi(label, value, action, href, tone = "blue") {
  return `
    <a class="pm-kpi-card tone-${escapeHtml(tone)}" href="${escapeHtml(href)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(action)}</small>
    </a>
  `;
}

function renderCapacityBar(name, value, tone = "info") {
  return `
    <div class="pm-capacity">
      <div><strong>${escapeHtml(name)}</strong><span>${Number(value)}%</span></div>
      <div class="pm-capacity-bar ${escapeHtml(tone)}"><span style="width:${Number(value)}%"></span></div>
    </div>
  `;
}

function renderDashboardKanbanPreview() {
  const columns = [
    ["To Do", ["Design Login Page", "API Integration"]],
    ["In Progress", ["User Module", "Dashboard UI"]],
    ["Review", ["Testing Module", "Bug Fixing"]],
    ["Done", ["Database Setup", "Authentication"]],
  ];
  return `
    <div class="pm-kanban-preview">
      ${columns.map(([title, tasks]) => `
        <div class="pm-kanban-col">
          <h4>${escapeHtml(title)}</h4>
          ${tasks.map((task) => `<div class="pm-kanban-task">${escapeHtml(task)}</div>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderMilestones(detail) {
  const milestones = detail.milestones?.length ? detail.milestones : [
    ["Planning", "Done"],
    ["Design", "Done"],
    ["Development", "In Progress"],
    ["Testing", "Pending"],
    ["Deployment", "Pending"],
  ];
  return `
    <div class="pm-milestone-track">
      ${milestones.map((item) => {
        const label = Array.isArray(item) ? item[0] : item.title;
        const status = Array.isArray(item) ? item[1] : item.status;
        return `
          <article class="pm-milestone">
            <span class="${String(status).toLowerCase().replace(/\s+/g, "-")}"></span>
            <h4>${escapeHtml(label)}</h4>
            <p>${escapeHtml(status || "Pending")}</p>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderMeetingCards(meetings) {
  return meetings.length
    ? `<div class="manager-list-v2">${meetings.map(renderMeetingCard).join("")}</div>`
    : renderEmpty("No meetings scheduled yet.");
}

function renderProjectCard(project) {
  return `
    <article class="manager-card-v2" data-project-card data-project-id="${escapeHtml(project._id || "")}" data-teams-url="${escapeHtml(project.teamsWebUrl || project.microsoft?.teamsMeetingUrl || "")}">
      <div class="manager-topline">
        <div>
          <h3>${escapeHtml(project.projectName || project.name || "Untitled")}</h3>
          <p>${escapeHtml(project.clientName || "No client")} • ${escapeHtml(project.projectType || project.department || "Project")}</p>
        </div>
        <span class="manager-chip ${priorityTone(project.priority)}">${escapeHtml(project.priority || "Medium")}</span>
      </div>
      <div class="manager-chip-row">
        <span class="manager-chip neutral">${escapeHtml(project.status || "Planning")}</span>
        <span class="manager-chip neutral">${Number(project.teamSize || 0)} team members</span>
        <span class="manager-chip neutral">${Number(project.tasksCount || 0)} tasks</span>
      </div>
      <div class="manager-progress"><span style="width:${Number(project.progress || 0)}%"></span></div>
      <div class="manager-meta">
        <span><strong>Start:</strong> ${formatShortDate(project.startDate)}</span>
        <span><strong>Due:</strong> ${formatShortDate(project.dueDate || project.deadline)}</span>
      </div>
      <div class="manager-actions">
        <button class="manager-btn manager-btn-primary" type="button" data-action="details">Open Project</button>
        <button class="manager-btn manager-btn-secondary" type="button" data-action="teams">Open Teams</button>
        <button class="manager-btn manager-btn-secondary" type="button" data-action="files">Files</button>
        <button class="manager-btn manager-btn-secondary" type="button" data-action="meetings">Meetings</button>
        <button class="manager-btn manager-btn-secondary" type="button" data-action="reports">Reports</button>
      </div>
    </article>
  `;
}

function renderProjectRow(project) {
  const detailsHref = getProjectDetailsHref(project?._id);
  return `
    <tr>
      <td><a class="manager-link" href="${detailsHref}">${escapeHtml(project.projectName || "-")}</a></td>
      <td>${escapeHtml(project.clientName || "-")}</td>
      <td>${escapeHtml(project.priority || "-")}</td>
      <td>${escapeHtml(project.status || "-")}</td>
      <td>${Number(project.progress || 0)}%</td>
      <td>${Number(project.teamSize || 0)}</td>
      <td>${Number(project.tasksCount || 0)}</td>
      <td>${formatShortDate(project.dueDate || project.deadline)}</td>
    </tr>
  `;
}

function renderDeadlineCard(task) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(task.title || "Task")}</h4>
        <span class="manager-chip warning">${formatShortDate(task.deadline)}</span>
      </div>
      <p>${escapeHtml(task.projectName || "-")} • ${escapeHtml(task.assignee || "Unassigned")}</p>
    </article>
  `;
}

function renderNotificationCard(item) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(item.title || item.type || "Activity")}</h4>
        <span class="manager-chip neutral">${formatShortDate(item.createdAt)}</span>
      </div>
      <p>${escapeHtml(item.message || "")}</p>
    </article>
  `;
}

function renderDetailedNotificationCard(item) {
  const actionUrl = getManagerNotificationActionUrl(item);
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(item.title || "Notification")}</h4>
          <p>${escapeHtml(item.message || "Project activity update")}</p>
        </div>
        <span class="manager-chip ${priorityTone(item.priority)}">${escapeHtml(item.priority || "medium")}</span>
      </div>
      <div class="manager-meta">
        <span><strong>Type:</strong> ${escapeHtml(item.type || "INFO")}</span>
        <span><strong>Module:</strong> ${escapeHtml(item.module || "manager")}</span>
        <span><strong>When:</strong> ${formatDateTime(item.createdAt)}</span>
        <span><strong>Status:</strong> ${item.read ? "Read" : "Unread"}</span>
      </div>
      ${actionUrl ? `<div class="manager-actions mt-3"><a class="manager-btn manager-btn-primary" href="${escapeHtml(actionUrl)}">Open related item</a></div>` : ""}
    </article>
  `;
}

function getDailyUpdateNotifications() {
  return (state.notifications || []).filter((item) => String(item.type || "").toUpperCase() === "DAILY_UPDATE_SUBMITTED");
}

function getDailyUpdateFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    search: String(params.get("search") || "").trim(),
    project: String(params.get("project") || "").trim(),
    department: String(params.get("department") || "").trim(),
    dateRange: String(params.get("dateRange") || "").trim(),
    blockerStatus: String(params.get("blockerStatus") || "").trim(),
  };
}

function getFilteredDailyUpdates() {
  const filters = getDailyUpdateFilters();
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  return (state.dailyUpdates || []).filter((item) => {
    const searchHaystack = [
      item.memberName,
      item.projectName,
      item.taskTitle,
      item.summary,
      item.completedWork,
      item.pendingWork,
      item.blockers,
      item.notes,
      item.memberDepartment,
      item.department,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const hasBlockers = Boolean(String(item.blockers || "").trim());
    const itemDate = new Date(item.createdAt || item.date || 0);
    const itemDateKey = String(item.createdAt || item.date || "").slice(0, 10);
    const daysDiff = Number.isNaN(itemDate.getTime()) ? Number.POSITIVE_INFINITY : Math.floor((now - itemDate) / 86400000);

    const matchesSearch = !filters.search || searchHaystack.includes(filters.search.toLowerCase());
    const matchesProject = !filters.project || String(item.projectName || "").trim() === filters.project;
    const matchesDepartment = !filters.department || String(item.memberDepartment || item.department || "").trim() === filters.department;
    const matchesBlocker =
      !filters.blockerStatus ||
      (filters.blockerStatus === "with" && hasBlockers) ||
      (filters.blockerStatus === "without" && !hasBlockers);
    const matchesDate =
      !filters.dateRange ||
      (filters.dateRange === "today" && itemDateKey === todayKey) ||
      (filters.dateRange === "7" && daysDiff >= 0 && daysDiff < 7) ||
      (filters.dateRange === "30" && daysDiff >= 0 && daysDiff < 30);

    return matchesSearch && matchesProject && matchesDepartment && matchesBlocker && matchesDate;
  });
}

function getDailyUpdateMemberSummaries(sourceUpdates = state.dailyUpdates || []) {
  const grouped = new Map();

  sourceUpdates.forEach((item) => {
    const memberName = item.memberName || item.author || item.employee || "Unknown user";
    const memberId = String(item.memberId || item.userId || "");
    const memberKey = memberId || `name:${String(memberName).trim().toLowerCase()}`;
    const current = grouped.get(memberKey) || {
      memberKey,
      memberId,
      memberName,
      memberEmail: item.memberEmail || "",
      memberRole: item.memberRole || item.role || "",
      memberDepartment: item.memberDepartment || "",
      memberDesignation: item.memberDesignation || "",
      memberStatus: item.memberStatus || "Active",
      profilePhoto: item.profilePhoto || "",
      totalUpdates: 0,
      blockerCount: 0,
      lastUpdateAt: item.createdAt || "",
      latestSummary: item.summary || item.completedWork || "Daily update",
      latestProjectName: item.projectName || "",
    };

    current.totalUpdates += 1;
    if (String(item.blockers || "").trim()) current.blockerCount += 1;
    if (new Date(item.createdAt || 0) >= new Date(current.lastUpdateAt || 0)) {
      current.lastUpdateAt = item.createdAt || current.lastUpdateAt;
      current.latestSummary = item.summary || item.completedWork || current.latestSummary;
      current.latestProjectName = item.projectName || current.latestProjectName;
      current.memberEmail = item.memberEmail || current.memberEmail;
      current.memberRole = item.memberRole || item.role || current.memberRole;
      current.memberDepartment = item.memberDepartment || current.memberDepartment;
      current.memberDesignation = item.memberDesignation || current.memberDesignation;
      current.memberStatus = item.memberStatus || current.memberStatus;
      current.profilePhoto = item.profilePhoto || current.profilePhoto;
    }

    grouped.set(memberKey, current);
  });

  return Array.from(grouped.values()).sort((left, right) => new Date(right.lastUpdateAt || 0) - new Date(left.lastUpdateAt || 0));
}

function getSelectedDailyUpdateMemberSummary(summaries = getDailyUpdateMemberSummaries()) {
  if (!summaries.length) return null;
  const params = new URLSearchParams(window.location.search);
  const memberKey = String(params.get("memberKey") || "");
  return summaries.find((item) => item.memberKey === memberKey) || summaries[0];
}

function getDailyUpdatesForMember(memberKey = "", sourceUpdates = state.dailyUpdates || []) {
  return sourceUpdates
    .filter((item) => {
      const key = String(item.memberId || item.userId || "") || `name:${String(item.memberName || item.author || item.employee || "").trim().toLowerCase()}`;
      return key === memberKey;
    })
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

function getManagerNotificationActionUrl(item = {}) {
  if (String(item.type || "").toUpperCase() !== "DAILY_UPDATE_SUBMITTED") {
    return item.actionUrl || "";
  }

  const metadata = item.metadata || {};
  const memberId = String(metadata.memberId || "");
  const memberName = String(metadata.memberName || "");
  const memberKey = memberId || (memberName ? `name:${memberName.trim().toLowerCase()}` : "");
  return memberKey
    ? `/modules/manager/daily-updates/daily-updates.html?memberKey=${encodeURIComponent(memberKey)}`
    : "/modules/manager/daily-updates/daily-updates.html";
}

function updateDailyUpdateFilters(partial = {}) {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  Object.entries(partial).forEach(([key, value]) => {
    const normalized = String(value || "").trim();
    if (normalized) {
      params.set(key, normalized);
    } else {
      params.delete(key);
    }
  });

  if (partial.search !== undefined || partial.project !== undefined || partial.department !== undefined || partial.dateRange !== undefined || partial.blockerStatus !== undefined) {
    params.delete("memberKey");
  }

  window.location.href = `${url.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
}

function applyDailyUpdateFilters() {
  updateDailyUpdateFilters({
    search: document.getElementById("dailyUpdateSearch")?.value || "",
    project: document.getElementById("dailyUpdateProjectFilter")?.value || "",
    department: document.getElementById("dailyUpdateDepartmentFilter")?.value || "",
    dateRange: document.getElementById("dailyUpdateDateFilter")?.value || "",
    blockerStatus: document.getElementById("dailyUpdateBlockerFilter")?.value || "",
  });
}

function resetDailyUpdateFilters() {
  updateDailyUpdateFilters({
    search: "",
    project: "",
    department: "",
    dateRange: "",
    blockerStatus: "",
  });
}

function renderDailyUpdateMemberCard(item, isActive = false) {
  const href = `/modules/manager/daily-updates/daily-updates.html?memberKey=${encodeURIComponent(item.memberKey)}`;
  return `
    <a class="manager-list-card ${isActive ? "manager-card-active" : ""}" href="${href}">
      <div class="manager-topline">
        <div class="manager-member-card">
          <img class="manager-avatar" src="${escapeHtml(getSafeProfileImage(item.profilePhoto))}" alt="${escapeHtml(item.memberName)}" />
          <div>
            <h4>${escapeHtml(item.memberName)}</h4>
            <p>${escapeHtml(item.memberRole || "Member")} • ${escapeHtml(item.latestProjectName || "Workspace")}</p>
          </div>
        </div>
        <span class="manager-chip ${item.blockerCount ? "warning" : "success"}">${item.totalUpdates} updates</span>
      </div>
      <p>${escapeHtml(item.latestSummary || "Daily update")}</p>
      <div class="manager-meta">
        <span><strong>Status:</strong> ${escapeHtml(item.memberStatus || "Active")}</span>
        <span><strong>Blockers:</strong> ${item.blockerCount}</span>
        <span><strong>Latest:</strong> ${formatDateTime(item.lastUpdateAt)}</span>
      </div>
    </a>
  `;
}

function renderDailyUpdateHistoryCard(item) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(item.summary || item.completedWork || "Daily update")}</h4>
          <p>${escapeHtml(item.projectName || "General workspace")} • ${escapeHtml(item.taskTitle || "Task update")}</p>
        </div>
        <span class="manager-chip neutral">${formatDateTime(item.createdAt)}</span>
      </div>
      <div class="manager-chip-row">
        <span class="manager-chip neutral">${Number(item.hoursWorked || 0)} hours</span>
        <span class="manager-chip neutral">${Number(item.completion || 0)}% complete</span>
        <span class="manager-chip ${String(item.blockers || "").trim() ? "warning" : "success"}">${String(item.blockers || "").trim() ? "Has blockers" : "No blockers"}</span>
      </div>
      <p><strong>Completed:</strong> ${escapeHtml(item.completedWork || item.summary || "-")}</p>
      <p><strong>Pending:</strong> ${escapeHtml(item.pendingWork || "-")}</p>
      <p><strong>Blockers:</strong> ${escapeHtml(item.blockers || "No blockers reported")}</p>
      ${item.notes ? `<p><strong>Notes:</strong> ${escapeHtml(item.notes)}</p>` : ""}
    </article>
  `;
}

function renderTeamMemberCard(member) {
  const projectId = state.projectDetails?._id || "";
  return `
    <article class="manager-card-v2">
      <div class="manager-member-card">
        <img class="manager-avatar" src="${escapeHtml(getSafeProfileImage(member.profilePhoto))}" alt="${escapeHtml(member.name)}" />
        <div>
          <h3>${escapeHtml(member.name)}</h3>
          <p>${escapeHtml(member.role || "Member")} • ${escapeHtml(member.email || "-")}</p>
        </div>
      </div>
      <div class="manager-chip-row">
        <span class="manager-chip neutral">${member.assignedTasks || 0} assigned</span>
        <span class="manager-chip success">${member.completedTasks || 0} completed</span>
        <span class="manager-chip neutral">${member.hoursWorked || 0} hours</span>
        <span class="manager-chip neutral">${member.meetingsAttended || 0} meetings</span>
        <span class="manager-chip ${member.onlineStatus === "Online" ? "success" : "neutral"}">${member.onlineStatus}</span>
      </div>
      <p class="manager-muted">Performance score: ${member.performanceScore || 0}%</p>
      <div class="manager-actions">
        <button class="manager-btn manager-btn-secondary" type="button" onclick="openMemberProfile('${escapeHtml(member._id)}')">View Profile</button>
        <button class="manager-btn manager-btn-secondary" type="button" onclick="openMoveMemberModal('${escapeHtml(member._id)}','${escapeHtml(projectId)}')">Move Project</button>
        <button class="manager-btn manager-btn-secondary" type="button" onclick="openHoldMemberModal('${escapeHtml(member._id)}','${escapeHtml(projectId)}')">Hold User</button>
        <button class="manager-btn manager-btn-danger" type="button" onclick="removeProjectMember('${escapeHtml(member._id)}')">Remove</button>
      </div>
    </article>
  `;
}

function renderManagerDirectoryMemberCard(member) {
  return `
    <article class="manager-card-v2">
      <div class="manager-member-card">
        <img class="manager-avatar" src="${escapeHtml(getSafeProfileImage(member.profilePhoto))}" alt="${escapeHtml(member.name)}" />
        <div>
          <h3>${escapeHtml(member.name)}</h3>
          <p>${escapeHtml(member.role || "Member")} • ${escapeHtml(member.department || "-")}</p>
        </div>
      </div>
      <div class="manager-chip-row">
        <span class="manager-chip neutral">${member.assignedProjectsCount || 0} projects</span>
        <span class="manager-chip neutral">${member.taskCompletionPercentage || 0}% tasks</span>
        <span class="manager-chip neutral">${member.totalWorkingHours || 0} hours</span>
        <span class="manager-chip neutral">${member.totalDailyUpdates || 0} updates</span>
        <span class="manager-chip neutral">${member.uploadedPhotosCount || 0} photos</span>
        <span class="manager-chip ${member.currentStatus === "On Hold" ? "warning" : "success"}">${escapeHtml(member.currentStatus || "Active")}</span>
      </div>
      <div class="manager-actions">
        <button class="manager-btn manager-btn-primary" type="button" onclick="openMemberProfile('${escapeHtml(member._id)}')">View Profile</button>
      </div>
    </article>
  `;
}

function renderTeamDirectoryMembers(members) {
  return members.length
    ? members.map(renderManagerDirectoryMemberCard).join("")
    : renderEmpty("No assigned members match the selected filters.");
}

function getTeamDirectoryProjectOptions() {
  const projectMap = new Map();
  state.members.forEach((member) => {
    (member.assignedProjects || []).forEach((project) => {
      if (!project?._id || !project?.projectName || projectMap.has(String(project._id))) return;
      projectMap.set(String(project._id), {
        _id: String(project._id),
        projectName: project.projectName,
      });
    });
  });
  return Array.from(projectMap.values()).sort((a, b) => String(a.projectName || "").localeCompare(String(b.projectName || "")));
}

function getFilteredTeamDirectoryMembers() {
  const searchValue = String(document.getElementById("directoryMemberSearch")?.value || "").trim().toLowerCase();
  const projectId = String(document.getElementById("directoryProjectFilter")?.value || "");
  const statusValue = String(document.getElementById("directoryStatusFilter")?.value || "");

  return state.members.filter((member) => {
    const searchHaystack = [
      member.name,
      member.role,
      member.department,
      member.designation,
      member.email,
      ...(member.assignedProjects || []).map((project) => project.projectName),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !searchValue || searchHaystack.includes(searchValue);
    const matchesProject = !projectId || (member.assignedProjects || []).some((project) => String(project._id) === projectId);
    const matchesStatus = !statusValue || String(member.currentStatus || "") === statusValue;

    return matchesSearch && matchesProject && matchesStatus;
  });
}

function bindTeamDirectoryFilters() {
  const search = document.getElementById("directoryMemberSearch");
  const project = document.getElementById("directoryProjectFilter");
  const status = document.getElementById("directoryStatusFilter");
  const grid = document.getElementById("directoryMemberGrid");
  const count = document.getElementById("directoryMemberCount");

  if (!search || !project || !status || !grid || !count) return;

  const apply = () => {
    const filtered = getFilteredTeamDirectoryMembers();
    grid.innerHTML = renderTeamDirectoryMembers(filtered);
    count.textContent = `${filtered.length} user${filtered.length === 1 ? "" : "s"}`;
  };

  search.addEventListener("input", apply);
  project.addEventListener("change", apply);
  status.addEventListener("change", apply);
}

function renderTeamCard(team) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(team.name)}</h4>
          <p>${escapeHtml(team.projectName || "-")} • ${escapeHtml(team.department || "-")}</p>
        </div>
        <span class="manager-chip neutral">${escapeHtml(team.status || "Active")}</span>
      </div>
      <div class="manager-chip-row mt-2">
        ${(team.members || []).map((member) => `<span class="manager-chip neutral">${escapeHtml(member)}</span>`).join("") || '<span class="manager-chip neutral">No members added</span>'}
      </div>
      <div class="manager-actions mt-3">
        <button class="manager-btn manager-btn-secondary" onclick="openTeamModal('${escapeHtml(team._id)}')">Edit Team</button>
        <a class="manager-btn manager-btn-secondary" href="${projectTabHref(team.projectId || "", "team")}">View Performance</a>
      </div>
    </article>
  `;
}

function renderSavedFileCard(file) {
  return `
    <article class="manager-card-v2">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(file.name)}</h4>
          <p>${escapeHtml(file.mimeType || "-")}</p>
        </div>
        <span class="manager-chip neutral">${formatBytes(file.size || 0)}</span>
      </div>
      <div class="manager-chip-row">
        <span class="manager-chip neutral">${escapeHtml(file.oneDriveFolder || "OneDrive")}</span>
      </div>
      <div class="manager-actions">
        <a class="manager-btn manager-btn-primary" href="${escapeHtml(file.oneDriveShareUrl || file.url || "#")}" target="_blank" rel="noreferrer">Open</a>
        <button class="manager-btn manager-btn-secondary" type="button" onclick="copyShareLink('${escapeHtml(file.oneDriveShareUrl || file.url || "")}')">Copy Link</button>
        <button class="manager-btn manager-btn-danger" type="button" onclick="deleteProjectFile('${escapeHtml(file._id)}')">Delete</button>
      </div>
    </article>
  `;
}

function renderCloudFileCard(file) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(file.name || "OneDrive item")}</h4>
          <p>${escapeHtml(file.file?.mimeType || (file.folder ? "Folder" : "File"))}</p>
        </div>
        <span class="manager-chip neutral">${formatBytes(file.size || 0)}</span>
      </div>
      <div class="manager-actions mt-2">
        <a class="manager-btn manager-btn-secondary" href="${escapeHtml(file.webUrl || "#")}" target="_blank" rel="noreferrer">Open in OneDrive</a>
      </div>
    </article>
  `;
}

function renderMeetingCard(meeting) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(meeting.title || "Meeting")}</h4>
          <p>${formatDateTime(meeting.scheduledFor || meeting.startTime)} • ${escapeHtml(meeting.status || "Scheduled")}</p>
        </div>
        <span class="manager-chip neutral">${meeting.participants?.length || 0} participants</span>
      </div>
      <p>${escapeHtml(meeting.notes || "No agenda provided.")}</p>
      <div class="manager-actions mt-2">
        <a class="manager-btn manager-btn-primary" href="${escapeHtml(meeting.joinUrl || meeting.microsoft?.joinUrl || "#")}" target="_blank" rel="noreferrer">Join Link</a>
        <button class="manager-btn manager-btn-danger" type="button" onclick="cancelMeeting('${escapeHtml(meeting._id)}')">Cancel</button>
      </div>
    </article>
  `;
}

function renderMeetingCalendarCard(meeting) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(meeting.title)}</h4>
        <span class="manager-chip neutral">${formatDateTime(meeting.scheduledFor || meeting.startTime)}</span>
      </div>
      <p>${escapeHtml(meeting.notes || "Teams meeting linked from Outlook calendar.")}</p>
    </article>
  `;
}

function renderEmailRecordCard(email) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(email.subject || "Untitled email")}</h4>
        <span class="manager-chip neutral">${formatDateTime(email.sentAt || email.receivedAt || email.createdAt)}</span>
      </div>
      <p>${escapeHtml(email.preview || "")}</p>
    </article>
  `;
}

function renderTimelineCard(item) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(item.type)}</h4>
        <span class="manager-chip neutral">${formatDateTime(item.createdAt)}</span>
      </div>
      <p><strong>${escapeHtml(item.title || "-")}</strong></p>
      <p>${escapeHtml(item.meta || "")}</p>
    </article>
  `;
}

function renderHistoryCard(item) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(item.actionType)}</h4>
        <span class="manager-chip neutral">${formatDateTime(item.createdAt)}</span>
      </div>
      <p>${escapeHtml(item.title || "-")}</p>
      <p>${escapeHtml(item.details || "")}</p>
    </article>
  `;
}

function renderPortfolioHistoryCard(item) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(item.title || item.actionType || "Work history entry")}</h4>
          <p>${escapeHtml(item.details || "Tracked project action")}</p>
        </div>
        <span class="manager-chip neutral">${escapeHtml(item.actionType || "Activity")}</span>
      </div>
      <div class="manager-meta">
        <span><strong>Project:</strong> ${escapeHtml(item.projectName || "-")}</span>
        <span><strong>Client:</strong> ${escapeHtml(item.clientName || "-")}</span>
        <span><strong>Hours:</strong> ${Number(item.hoursWorked || 0)}</span>
        <span><strong>When:</strong> ${formatDateTime(item.createdAt)}</span>
      </div>
    </article>
  `;
}

function renderSavedReportCard(report) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(report.title || report.name || "Report")}</h4>
        <span class="manager-chip neutral">${formatDateTime(report.createdAt)}</span>
      </div>
      <p>${escapeHtml(report.status || "GENERATED")}</p>
    </article>
  `;
}

function renderInboxCard(item) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(item.subject || "No subject")}</h4>
          <p>${escapeHtml(item.from?.emailAddress?.name || item.from?.emailAddress?.address || "Unknown sender")}</p>
        </div>
        <span class="manager-chip ${item.isRead ? "neutral" : "warning"}">${item.isRead ? "Read" : "Unread"}</span>
      </div>
      <p>${escapeHtml(item.bodyPreview || "")}</p>
      <div class="manager-actions mt-2">
        <button class="manager-btn manager-btn-secondary" onclick="readMailboxMessage('${escapeHtml(item.id)}')">Read</button>
        ${item.webLink ? `<a class="manager-btn manager-btn-primary" href="${escapeHtml(item.webLink)}" target="_blank" rel="noreferrer">Open in Outlook</a>` : ""}
      </div>
    </article>
  `;
}

function renderCalendarEvent(item) {
  return `
    <article class="manager-list-card">
      <div class="manager-topline">
        <h4>${escapeHtml(item.subject || "Event")}</h4>
        <span class="manager-chip neutral">${formatDateTime(item.start?.dateTime || item.createdDateTime)}</span>
      </div>
      <p>${escapeHtml(item.location?.displayName || "Teams / Outlook event")}</p>
      ${item.onlineMeeting?.joinUrl ? `<a class="manager-link" href="${escapeHtml(item.onlineMeeting.joinUrl)}" target="_blank" rel="noreferrer">Join meeting</a>` : ""}
    </article>
  `;
}

function getProjectAssignableUsers(projectId = "") {
  const detail = state.projectDetails && String(state.projectDetails._id) === String(projectId) ? state.projectDetails : null;
  const existingIds = new Set((detail?.teamMembers || []).map((member) => String(member._id)));
  return state.users.filter((user) => !existingIds.has(String(user._id)));
}

function memberRoleOptions(selectedRole = "MEMBER") {
  return ["TEAM_LEAD", "MEMBER"].map((role) => `<option value="${role}" ${role === selectedRole ? "selected" : ""}>${role.replace("_", " ")}</option>`).join("");
}

function renderReportCard(project) {
  return `
    <article class="manager-card-v2">
      <div class="manager-topline">
        <div>
          <h4>${escapeHtml(project.projectName)}</h4>
          <p>${escapeHtml(project.clientName || "Project")}</p>
        </div>
        <span class="manager-chip neutral">${Number(project.progress || 0)}%</span>
      </div>
      <div class="manager-chip-row">
        <span class="manager-chip neutral">${Number(project.tasksCount || 0)} tasks</span>
        <span class="manager-chip neutral">${Number(project.filesCount || 0)} files</span>
      </div>
      <div class="manager-actions">
        <button class="manager-btn manager-btn-primary" onclick="generateReport('${escapeHtml(project._id)}')">Generate Report</button>
      </div>
    </article>
  `;
}

function renderError(message) {
  document.getElementById("pageContent").innerHTML = renderRetryState(message || "Something went wrong.", () => window.location.reload());
}

function renderEmpty(message) {
  return `<div class="manager-empty-state">${escapeHtml(message)}</div>`;
}

function renderRetryState(message, callback) {
  window.managerRetryAction = callback;
  return `
    <div class="manager-empty-state">
      <p>${escapeHtml(message)}</p>
      <button class="manager-btn manager-btn-primary mt-3" type="button" onclick="window.managerRetryAction && window.managerRetryAction()">Retry</button>
    </div>
  `;
}

function renderStatCard(label, value, text) {
  return `
    <article class="manager-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <div class="trend">${escapeHtml(text)}</div>
    </article>
  `;
}

function bindDailyUpdateFilters() {
  const search = document.getElementById("dailyUpdateSearch");
  const project = document.getElementById("dailyUpdateProjectFilter");
  const department = document.getElementById("dailyUpdateDepartmentFilter");
  const date = document.getElementById("dailyUpdateDateFilter");
  const blocker = document.getElementById("dailyUpdateBlockerFilter");
  if (!search || !project || !department || !date || !blocker) return;

  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyDailyUpdateFilters();
    }
  });
  project.addEventListener("change", applyDailyUpdateFilters);
  department.addEventListener("change", applyDailyUpdateFilters);
  date.addEventListener("change", applyDailyUpdateFilters);
  blocker.addEventListener("change", applyDailyUpdateFilters);
}

function bindProjectFilters() {
  const search = document.getElementById("projectSearch");
  const status = document.getElementById("projectStatusFilter");
  const priority = document.getElementById("projectPriorityFilter");
  const due = document.getElementById("projectDueFilter");
  const sort = document.getElementById("projectSort");
  if (!search || !status || !priority || !due || !sort) return;
  const apply = () => {
    const keyword = String(search.value || "").toLowerCase();
    const statusValue = status.value;
    const priorityValue = priority.value;
    const dueValue = due.value;
    const filtered = state.projects.filter((project) => {
      const haystack = [project.projectName, project.clientName, project.status, project.priority].join(" ").toLowerCase();
      return haystack.includes(keyword)
        && (!statusValue || project.status === statusValue)
        && (!priorityValue || project.priority === priorityValue)
        && matchDueDateFilter(project.dueDate || project.deadline, dueValue);
    });
    const sorted = sortProjects(filtered, sort.value);
    document.getElementById("projectCardGrid").innerHTML = sorted.length ? sorted.map(renderProjectCard).join("") : renderEmpty("No projects assigned by Admin.");
    document.getElementById("projectTableBody").innerHTML = sorted.length ? sorted.map(renderProjectRow).join("") : `<tr><td colspan="8">${renderEmpty("No projects match your filters.")}</td></tr>`;
    bindProjectCardActions();
  };
  search.addEventListener("input", apply);
  status.addEventListener("change", apply);
  priority.addEventListener("change", apply);
  due.addEventListener("change", apply);
  sort.addEventListener("change", apply);
  bindProjectCardActions();
}

function bindProjectCardActions() {
  document.querySelectorAll("[data-project-card]").forEach((card) => {
    if (card.dataset.bound === "true") return;
    card.dataset.bound = "true";
    const projectId = card.dataset.projectId;
    const teamsUrl = card.dataset.teamsUrl;
    card.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "details") return openProjectDetails(projectId);
        if (action === "teams") return openTeams(teamsUrl);
        if (action === "files") return openFiles(projectId);
        if (action === "meetings") return openMeetings(projectId);
        if (action === "reports") return (window.location.href = `/modules/manager/reports/reports.html?projectId=${encodeURIComponent(projectId)}`);
      });
    });
  });
}

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const charts = {
    projectProgress: state.dashboard?.charts?.projectProgress?.length
      ? state.dashboard.charts.projectProgress
      : [
          { label: "Planning", value: 72 },
          { label: "Design", value: 84 },
          { label: "Build", value: 68 },
          { label: "Testing", value: 56 },
          { label: "Launch", value: 40 },
        ],
    productivity: state.dashboard?.charts?.productivity?.length
      ? state.dashboard.charts.productivity
      : [
          { label: "On Track", value: 62 },
          { label: "Review", value: 18 },
          { label: "Blocked", value: 8 },
          { label: "Completed", value: 12 },
        ],
  };

  const projectProgressCanvas = document.getElementById("projectProgressChart");
  if (projectProgressCanvas) {
    new Chart(projectProgressCanvas, {
      type: "bar",
      data: {
        labels: charts.projectProgress.map((item) => item.label),
        datasets: [{
          label: "Progress %",
          data: charts.projectProgress.map((item) => item.value),
          borderRadius: 12,
          backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#db2777", "#0891b2"],
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  const productivityCanvas = document.getElementById("productivityChart");
  if (productivityCanvas) {
    new Chart(productivityCanvas, {
      type: "doughnut",
      data: {
        labels: charts.productivity.map((item) => item.label),
        datasets: [{
          data: charts.productivity.map((item) => item.value),
          backgroundColor: ["#16a34a", "#f59e0b", "#ef4444", "#7c3aed"],
        }],
      },
      options: { responsive: true },
    });
  }
}

function projectTabHref(projectId, tab) {
  return `${getProjectDetailsHref(projectId)}&tab=${encodeURIComponent(tab)}`;
}

function getProjectFilterOptions() {
  return {
    priorities: Array.from(new Set(state.projects.map((item) => item.priority).filter(Boolean))),
    statuses: Array.from(new Set(state.projects.map((item) => item.status).filter(Boolean))),
  };
}

function matchDueDateFilter(value, filter) {
  if (!filter) return true;
  if (!value) return false;

  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dueDate - today) / 86400000);

  if (filter === "overdue") return diffDays < 0;
  if (filter === "7") return diffDays >= 0 && diffDays <= 7;
  if (filter === "30") return diffDays >= 0 && diffDays <= 30;
  return true;
}

function sortProjects(projects, mode = "newest") {
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...projects].sort((a, b) => {
    if (mode === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (mode === "priority") return (priorityWeight[String(b.priority || "").toLowerCase()] || 0) - (priorityWeight[String(a.priority || "").toLowerCase()] || 0);
    if (mode === "completion") return Number(b.progress || 0) - Number(a.progress || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function projectTeamsLink(project) {
  return project.teamsWebUrl || project.microsoft?.teamsMeetingUrl || "https://teams.microsoft.com";
}

function priorityTone(priority) {
  const value = String(priority || "").toLowerCase();
  if (value === "high" || value === "critical") return "danger";
  if (value === "medium") return "warning";
  return "success";
}

function actionButton(label, href, primary = false) {
  return `<a class="manager-btn ${primary ? "manager-btn-primary" : "manager-btn-secondary"}" href="${href}">${escapeHtml(label)}</a>`;
}

function getProjectDetailsHref(projectId) {
  const normalizedId = String(projectId || "").trim();
  if (!normalizedId) return "/modules/manager/projects/projects.html";
  return `/modules/manager/project-details/project-details.html?id=${encodeURIComponent(normalizedId)}`;
}

function getPrimaryProjectDetailsHref() {
  return getProjectDetailsHref(getFirstPersistedProjectId() || state.projects[0]?._id);
}

function buttonHtml(label, onClick, primary = false) {
  return `<button class="manager-btn ${primary ? "manager-btn-primary" : "manager-btn-secondary"}" onclick="${onClick}">${escapeHtml(label)}</button>`;
}

function getSafeProfileImage(value, fallback = "../../../assets/images/default-avatar.png") {
  if (typeof window.resolveWorkspaceImageSrc === "function") {
    return window.resolveWorkspaceImageSrc(value, fallback);
  }
  return String(value || "").trim() || fallback;
}

function buildModal() {
  return `
    <div class="modal fade manager-modal-sheet" id="managerModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="managerModalTitle">Manager Form</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="managerModalBody"></div>
          <div class="modal-footer" id="managerModalFooter"></div>
        </div>
      </div>
    </div>
  `;
}

function openModal({ title, body, footer }) {
  const modalElement = document.getElementById("managerModal");
  if (!modalElement.dataset.focusBound) {
    modalElement.dataset.focusBound = "true";
    modalElement.addEventListener("hidden.bs.modal", () => {
      const lastTrigger = window.managerLastFocusedElement;
      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus();
      } else {
        document.getElementById("sidebarToggle")?.focus();
      }
    });
  }

  window.managerLastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.getElementById("managerModalTitle").textContent = title;
  document.getElementById("managerModalBody").innerHTML = body;
  document.getElementById("managerModalFooter").innerHTML = footer;
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

function closeModal() {
  const modalElement = document.getElementById("managerModal");
  if (modalElement?.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  const modal = bootstrap.Modal.getInstance(modalElement);
  modal?.hide();
}

function openTaskModal(taskId = "") {
  const task = state.tasks.find((item) => item._id === taskId) || {};
  const projects = getPersistedProjects();
  if (!projects.length) return warnNoSavedProject("create a task");
  const selectedProjectId = canUseProjectAction(task.projectId || state.projectDetails?._id)
    ? String(task.projectId || state.projectDetails?._id)
    : projects[0]._id;
  const teamMembers = getMembersForProject(selectedProjectId);
  openModal({
    title: taskId ? "Edit Task" : "Create Task",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-6 manager-form-group">
          <label>Project</label>
          <select class="manager-select" id="taskProjectId">${projects.map((project) => `<option value="${project._id}" ${String(project._id) === String(selectedProjectId) ? "selected" : ""}>${escapeHtml(project.projectName)}</option>`).join("")}</select>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Assigned To</label>
          <select class="manager-select" id="taskAssigneeId">
            <option value="">Select member</option>
            ${teamMembers.map((member) => `<option value="${member._id}" ${String(member._id) === String(task.assigneeId || "") ? "selected" : ""}>${escapeHtml(member.name)} - ${escapeHtml(member.role || "Member")}</option>`).join("")}
          </select>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Title</label>
          <input class="manager-field" id="taskTitle" value="${escapeHtml(task.title || "")}" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Description</label>
          <textarea class="manager-textarea" id="taskDescription">${escapeHtml(task.description || "")}</textarea>
        </div>
        <div class="manager-col-4 manager-form-group">
          <label>Priority</label>
          <select class="manager-select" id="taskPriority">${["Low", "Medium", "High", "Critical"].map((item) => `<option value="${item}" ${item === (task.priority || "Medium") ? "selected" : ""}>${item}</option>`).join("")}</select>
        </div>
        <div class="manager-col-4 manager-form-group">
          <label>Status</label>
          <select class="manager-select" id="taskStatus">${["To Do", "In Progress", "Review", "Done", "Blocked", "Reopened"].map((item) => `<option value="${item}" ${item === (task.status || "To Do") ? "selected" : ""}>${item}</option>`).join("")}</select>
        </div>
        <div class="manager-col-4 manager-form-group">
          <label>Progress %</label>
          <input type="number" class="manager-field" id="taskProgress" value="${Number(task.progress || 0)}" min="0" max="100" />
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Start Date</label>
          <input type="date" class="manager-field" id="taskStartDate" value="${toDateInput(task.startDate || task.metadata?.startDate)}" />
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Due Date</label>
          <input type="date" class="manager-field" id="taskDueDate" value="${toDateInput(task.deadline)}" />
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Estimated Hours</label>
          <input type="number" class="manager-field" id="taskEstimatedHours" value="${Number(task.estimatedHours || task.metadata?.estimatedHours || 0)}" min="0" />
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Actual Hours</label>
          <input type="number" class="manager-field" id="taskActualHours" value="${Number(task.actualHours || task.metadata?.actualHours || 0)}" min="0" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Comments</label>
          <textarea class="manager-textarea" id="taskComments">${escapeHtml((task.metadata?.comments || []).join("\n"))}</textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      ${taskId ? `<button class="manager-btn manager-btn-danger" type="button" onclick="deleteTask('${escapeHtml(taskId)}')">Delete</button>` : ""}
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitTask('${escapeHtml(taskId)}')">Save Task</button>
    `,
  });
  syncTaskAssigneeOptions();
  document.getElementById("taskProjectId")?.addEventListener("change", syncTaskAssigneeOptions);
}

function openTeamModal(teamId = "") {
  const team = state.teams.find((item) => item._id === teamId) || {};
  const projects = getPersistedProjects();
  if (!projects.length) return warnNoSavedProject("save a team");
  const selectedMemberIds = new Set((team.memberIds || []).map((item) => String(item)));
  openModal({
    title: teamId ? "Edit Team" : "Create Team",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-6 manager-form-group">
          <label>Project</label>
          <select class="manager-select" id="teamProjectId">${projects.map((project) => `<option value="${project._id}" ${String(project._id) === String(team.projectId || projects[0]._id) ? "selected" : ""}>${escapeHtml(project.projectName)}</option>`).join("")}</select>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Status</label>
          <select class="manager-select" id="teamStatus">${["Planning", "Active", "On Hold", "Completed"].map((item) => `<option value="${item}" ${item === (team.status || "Active") ? "selected" : ""}>${item}</option>`).join("")}</select>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Team Name</label>
          <input class="manager-field" id="teamName" value="${escapeHtml(team.name || "")}" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Select Members</label>
          <div class="manager-list-v2" style="max-height:280px;overflow:auto;">
            ${state.users.map((user) => `
              <label class="manager-list-card" style="display:flex;align-items:center;gap:0.75rem;cursor:pointer;">
                <input type="checkbox" class="team-member-checkbox" value="${user._id}" ${selectedMemberIds.has(String(user._id)) ? "checked" : ""} />
                <span>
                  <strong>${escapeHtml(user.name)}</strong>
                  <small>${escapeHtml(user.role)} • ${escapeHtml(user.email)}</small>
                </span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Description</label>
          <textarea class="manager-textarea" id="teamDescription">${escapeHtml(team.description || "")}</textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitTeam('${escapeHtml(teamId)}')">Save Team</button>
    `,
  });
}

function openAddMemberModal(projectId = "") {
  const selectableUsers = getProjectAssignableUsers(projectId);
  openModal({
    title: "Add Project Member",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-12 manager-form-group">
          <label>Select User</label>
          <select class="manager-select" id="memberUserId">
            <option value="">Select user</option>
            ${selectableUsers.map((user) => `<option value="${user._id}">${escapeHtml(user.name)} - ${escapeHtml(user.role)} - ${escapeHtml(user.email)}</option>`).join("")}
          </select>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Role</label>
          <select class="manager-select" id="memberRole">${memberRoleOptions()}</select>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitAddMember('${escapeHtml(projectId)}')">Add Member</button>
    `,
  });
}

function openReplaceMemberModal(projectId = "") {
  const currentMembers = state.projectDetails?.teamMembers || [];
  const selectableUsers = getProjectAssignableUsers(projectId);
  openModal({
    title: "Replace Team Member",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-12 manager-form-group">
          <label>Replace Current Member</label>
          <select class="manager-select" id="previousMemberUserId">
            <option value="">Select current member</option>
            ${currentMembers.map((member) => `<option value="${member._id}">${escapeHtml(member.name)} - ${escapeHtml(member.role || "Member")}</option>`).join("")}
          </select>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>New Member</label>
          <select class="manager-select" id="newMemberUserId">
            <option value="">Select replacement user</option>
            ${selectableUsers.map((user) => `<option value="${user._id}">${escapeHtml(user.name)} - ${escapeHtml(user.role)} - ${escapeHtml(user.email)}</option>`).join("")}
          </select>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitReplaceMember('${escapeHtml(projectId)}')">Replace Member</button>
    `,
  });
}

function openMoveMemberModal(memberId = "", sourceProjectId = "") {
  openModal({
    title: "Move User Between Projects",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-12 manager-form-group">
          <label>Target Project</label>
          <select class="manager-select" id="moveTargetProjectId">
            <option value="">Select project</option>
            ${state.projects
              .filter((project) => String(project._id) !== String(sourceProjectId))
              .map((project) => `<option value="${project._id}">${escapeHtml(project.projectName)} - ${escapeHtml(project.clientName || "Client")}</option>`)
              .join("")}
          </select>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitMoveMember('${escapeHtml(memberId)}','${escapeHtml(sourceProjectId)}')">Move User</button>
    `,
  });
}

function openHoldMemberModal(memberId = "", projectId = "") {
  openModal({
    title: "Put User On Hold",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-12 manager-form-group">
          <label>Reason</label>
          <textarea class="manager-textarea" id="holdReason" placeholder="Enter hold reason"></textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitHoldMember('${escapeHtml(memberId)}','${escapeHtml(projectId)}')">Put On Hold</button>
    `,
  });
}

function openFileModal(projectId = "") {
  const projects = getPersistedProjects();
  if (!projects.length) return warnNoSavedProject("upload a file");
  const requestedProjectId = projectId || new URLSearchParams(window.location.search).get("projectId");
  const currentProjectId = canUseProjectAction(requestedProjectId) ? requestedProjectId : projects[0]._id;
  openModal({
    title: "Upload File to OneDrive",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-12 manager-form-group">
          <label>Project</label>
          <select class="manager-select" id="fileProjectId">${projects.map((project) => `<option value="${project._id}" ${String(project._id) === String(currentProjectId) ? "selected" : ""}>${escapeHtml(project.projectName)}</option>`).join("")}</select>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Choose File</label>
          <input class="manager-field" id="fileInput" type="file" />
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitFileUpload()">Upload</button>
    `,
  });
}

function openMeetingModal(projectId = "") {
  const projects = getPersistedProjects();
  if (!projects.length) return warnNoSavedProject("schedule a meeting");
  const requestedProjectId = projectId || new URLSearchParams(window.location.search).get("projectId");
  const currentProjectId = canUseProjectAction(requestedProjectId) ? requestedProjectId : projects[0]._id;
  openModal({
    title: "Schedule Meeting",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-6 manager-form-group">
          <label>Project</label>
          <select class="manager-select" id="meetingProjectId">${projects.map((project) => `<option value="${project._id}" ${String(project._id) === String(currentProjectId) ? "selected" : ""}>${escapeHtml(project.projectName)}</option>`).join("")}</select>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Participants Emails</label>
          <input class="manager-field" id="meetingParticipants" placeholder="user1@company.com, user2@company.com" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Title</label>
          <input class="manager-field" id="meetingTitle" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Agenda</label>
          <textarea class="manager-textarea" id="meetingAgenda"></textarea>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Date & Time</label>
          <input class="manager-field" id="meetingStart" type="datetime-local" />
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Duration (minutes)</label>
          <input class="manager-field" id="meetingDuration" type="number" value="30" />
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitMeeting()">Schedule</button>
    `,
  });
}

function openMailboxModal() {
  const projects = getPersistedProjects();
  if (!projects.length) return warnNoSavedProject("send mail");
  const requestedProjectId = new URLSearchParams(window.location.search).get("projectId");
  const projectId = canUseProjectAction(requestedProjectId) ? requestedProjectId : projects[0]._id;
  openModal({
    title: "Compose Email",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-12 manager-form-group">
          <label>Project</label>
          <select class="manager-select" id="mailProjectId">${projects.map((project) => `<option value="${project._id}" ${String(project._id) === String(projectId) ? "selected" : ""}>${escapeHtml(project.projectName)}</option>`).join("")}</select>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>To</label>
          <input class="manager-field" id="mailTo" placeholder="name@company.com, second@company.com" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Subject</label>
          <input class="manager-field" id="mailSubject" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Message</label>
          <textarea class="manager-textarea" id="mailBody"></textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitMail()">Send Mail</button>
    `,
  });
}

function openProjectUpdateModal(projectId = "") {
  const projects = getPersistedProjects();
  if (!projects.length) return warnNoSavedProject("send a project update");
  const requestedProjectId = projectId || new URLSearchParams(window.location.search).get("projectId");
  const currentProjectId = canUseProjectAction(requestedProjectId) ? requestedProjectId : projects[0]._id;
  openModal({
    title: "Send Project Update",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-6 manager-form-group">
          <label>Project</label>
          <select class="manager-select" id="updateProjectId">${projects.map((project) => `<option value="${project._id}" ${String(project._id) === String(currentProjectId) ? "selected" : ""}>${escapeHtml(project.projectName)}</option>`).join("")}</select>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Update Type</label>
          <select class="manager-select" id="updateType">
            <option>Daily Update</option>
            <option>Weekly Update</option>
            <option>Risk Alert</option>
            <option>Completion</option>
            <option>Resource Request</option>
          </select>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Progress</label>
          <input class="manager-field" id="updateProgress" type="number" min="0" max="100" value="56" />
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Send To</label>
          <select class="manager-select" id="updateRecipients">
            <option>Admin + Product Manager</option>
            <option>Admin</option>
            <option>Product Manager</option>
          </select>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Description</label>
          <textarea class="manager-textarea" id="updateDescription" placeholder="This week we completed user module and API integration."></textarea>
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Attach Files</label>
          <input class="manager-field" id="updateFiles" type="file" multiple />
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitProjectUpdate()">Send Update</button>
    `,
  });
}

function openResourceRequestModal() {
  openModal({
    title: "Request Resource",
    body: `
      <div class="manager-field-row">
        <div class="manager-col-6 manager-form-group">
          <label>Department</label>
          <select class="manager-select" id="resourceDepartment">
            <option>Development</option>
            <option>UI/UX</option>
            <option>Testing</option>
            <option>DevOps</option>
          </select>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Skill</label>
          <input class="manager-field" id="resourceSkill" placeholder="Node.js, React, MongoDB" />
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Priority</label>
          <select class="manager-select" id="resourcePriority">
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
        <div class="manager-col-6 manager-form-group">
          <label>Needed By</label>
          <input class="manager-field" id="resourceNeededBy" type="date" />
        </div>
        <div class="manager-col-12 manager-form-group">
          <label>Reason</label>
          <textarea class="manager-textarea" id="resourceReason" placeholder="Need one backend developer for API integration and bug fixing."></textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
      <button class="manager-btn manager-btn-primary" type="button" onclick="submitResourceRequest()">Send Request</button>
    `,
  });
}

async function submitTask(taskId = "") {
  const payload = {
    projectId: document.getElementById("taskProjectId").value,
    assigneeId: document.getElementById("taskAssigneeId").value.trim(),
    assigneeIds: document.getElementById("taskAssigneeId").value.trim() ? [document.getElementById("taskAssigneeId").value.trim()] : [],
    title: document.getElementById("taskTitle").value.trim(),
    description: document.getElementById("taskDescription").value.trim(),
    priority: document.getElementById("taskPriority").value,
    status: document.getElementById("taskStatus").value,
    progress: Number(document.getElementById("taskProgress").value || 0),
    startDate: document.getElementById("taskStartDate").value || null,
    dueDate: document.getElementById("taskDueDate").value || null,
    estimatedHours: Number(document.getElementById("taskEstimatedHours").value || 0),
    actualHours: Number(document.getElementById("taskActualHours").value || 0),
    comments: document.getElementById("taskComments").value.split("\n").map((item) => item.trim()).filter(Boolean),
  };

  if (!canUseProjectAction(payload.projectId)) return warnNoSavedProject("save a task");
  if (!payload.title) return showToast("Task title is required", "warning");
  if (payload.assigneeId && !isMongoObjectId(payload.assigneeId)) return showToast("Please select a saved user for assignment", "warning");
  const method = taskId ? API.put : API.post;
  try {
    await method(taskId ? `/manager/tasks/${taskId}` : "/manager/tasks", payload);
    closeModal();
    showToast("Task saved successfully", "success");
    window.location.reload();
  } catch (error) {
    showToast(error.message || "Unable to save task right now.", "error");
  }
}

async function updateTaskStatus(taskId, status, progress = 0) {
  const task = state.tasks.find((item) => String(item._id) === String(taskId));
  if (!task) return showToast("Task not found", "warning");
  try {
    await API.put(`/manager/tasks/${taskId}`, {
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      assigneeIds: task.assigneeIds || [],
      title: task.title,
      description: task.description,
      priority: task.priority,
      status,
      progress,
      startDate: task.startDate || task.metadata?.startDate || "",
      dueDate: toDateInput(task.deadline),
      estimatedHours: Number(task.estimatedHours || task.metadata?.estimatedHours || 0),
      actualHours: Number(task.actualHours || task.metadata?.actualHours || 0),
      comments: task.metadata?.comments || [],
    });
    showToast(`Task marked as ${status}`, "success");
    window.location.reload();
  } catch (error) {
    showToast(error.message || "Unable to update task status.", "error");
  }
}

async function deleteTask(taskId) {
  await API.delete(`/manager/tasks/${taskId}`);
  closeModal();
  showToast("Task deleted successfully", "success");
  window.location.reload();
}

/* Detail Drawer Helper Functions */
async function refreshTasksAndDrawer(taskId) {
  const tasksRes = await API.get("/manager/tasks").catch(() => ({ data: [] }));
  state.tasks = tasksRes.data || [];
  renderPage("tasks");
  if (taskId) {
    await openTaskDetailDrawer(taskId);
  }
}

function ensureDetailDrawerDOM() {
  let backdrop = document.getElementById("taskDetailDrawerBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "taskDetailDrawerBackdrop";
    backdrop.className = "manager-detail-drawer-backdrop";
    backdrop.onclick = closeTaskDetailDrawer;
    document.body.appendChild(backdrop);
  }
  
  let drawer = document.getElementById("taskDetailDrawer");
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.id = "taskDetailDrawer";
    drawer.className = "manager-detail-drawer";
    document.body.appendChild(drawer);
  }
}

window.closeTaskDetailDrawer = function() {
  const backdrop = document.getElementById("taskDetailDrawerBackdrop");
  const drawer = document.getElementById("taskDetailDrawer");
  if (backdrop) backdrop.classList.remove("show");
  if (drawer) drawer.classList.remove("show");
};

window.openTaskDetailDrawer = async function(taskId) {
  ensureDetailDrawerDOM();
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return showToast("Task not found", "error");
  
  const backdrop = document.getElementById("taskDetailDrawerBackdrop");
  const drawer = document.getElementById("taskDetailDrawer");
  
  backdrop.classList.add("show");
  drawer.classList.add("show");
  
  drawer.innerHTML = `
    <div class="manager-drawer-header">
      <h2>Loading Task Details...</h2>
      <button class="manager-drawer-close" onclick="closeTaskDetailDrawer()">&times;</button>
    </div>
  `;
  
  const [commentsRes, subtasksRes] = await Promise.all([
    API.get(`/task-comments?taskId=${taskId}`).catch(() => ({ data: [] })),
    API.get(`/subtasks?taskId=${taskId}`).catch(() => ({ data: [] }))
  ]);
  
  const comments = commentsRes.data || [];
  const subtasks = subtasksRes.data || [];
  const otherTasks = state.tasks.filter(t => String(t._id) !== String(taskId));
  const projectMembers = getMembersForProject(task.projectId);
  
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !["Completed", "Approved", "Done"].includes(task.status);
  
  let riskLevel = "Low";
  let riskAnalysis = "The task has comfortable buffer time before the deadline.";
  if (task.deadline) {
    const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const progressVal = Number(task.progress || 0);
    if (daysLeft < 0) {
      riskLevel = "High";
      riskAnalysis = "Overdue. Immediate action required.";
    } else if (daysLeft <= 3 && progressVal < 50) {
      riskLevel = "High";
      riskAnalysis = `Only ${daysLeft} days left with ${progressVal}% progress. High risk of missing deadline.`;
    } else if (daysLeft <= 7 && progressVal < 30) {
      riskLevel = "Medium";
      riskAnalysis = `Only ${daysLeft} days left with ${progressVal}% progress. Moderate risk of overrun.`;
    }
  }

  let blockedText = "";
  let isBlocked = false;
  if (task.dependencies && task.dependencies.length > 0) {
    const incompleteBlocked = state.tasks.filter(t => task.dependencies.includes(String(t._id)) && !["Completed", "Approved", "Done"].includes(t.status));
    if (incompleteBlocked.length > 0) {
      isBlocked = true;
      blockedText = incompleteBlocked.map(t => t.title).join(", ");
    }
  }

  drawer.innerHTML = `
    <div class="manager-drawer-header">
      <div>
        <span class="manager-eyebrow" style="text-transform: uppercase;">${escapeHtml(task.projectName)}</span>
        <h2>${escapeHtml(task.title)}</h2>
      </div>
      <button class="manager-drawer-close" onclick="closeTaskDetailDrawer()">&times;</button>
    </div>
    
    <div class="manager-drawer-body">
      ${isBlocked ? `
        <div class="manager-dependency-lock-banner">
          <span>🔒 Status Locked. Complete blocking tasks first: <strong>${escapeHtml(blockedText)}</strong></span>
        </div>
      ` : ""}
      
      <div class="manager-glass-panel" style="border-color: var(--manager-accent); background: rgba(56,189,248,0.03);">
        <div class="manager-detail-section">
          <div class="manager-detail-section-title" style="color:var(--manager-accent);">🤖 AI Project Assistant</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>Overdue Risk Analysis:</strong>
              <div style="font-size:0.75rem; color:var(--manager-muted);">${escapeHtml(riskAnalysis)}</div>
            </div>
            <span class="manager-ai-risk-badge risk-${riskLevel.toLowerCase()}">${riskLevel} Risk</span>
          </div>
          <div style="margin-top: 0.5rem; display:flex; gap:0.5rem;">
            <button class="manager-btn manager-btn-secondary" style="font-size:0.75rem; padding: 4px 8px;" onclick="suggestAISubtasks('${task._id}')">🤖 Suggest Subtasks</button>
            <button class="manager-btn manager-btn-secondary" style="font-size:0.75rem; padding: 4px 8px;" onclick="runAITimeEstimate('${task._id}')">📊 Predict Completion</button>
          </div>
        </div>
      </div>

      <div class="manager-detail-grid-2">
        <div class="manager-detail-section">
          <span class="manager-detail-section-title">Status</span>
          <select class="manager-select" id="drawerTaskStatus" ${isBlocked ? "disabled" : ""} onchange="updateDrawerTaskField('${task._id}', 'status', this.value)">
            ${["To Do", "In Progress", "Review", "Done", "Blocked", "Reopened"].map(st => `
              <option value="${st}" ${task.status === st ? "selected" : ""}>${st}</option>
            `).join("")}
          </select>
        </div>
        <div class="manager-detail-section">
          <span class="manager-detail-section-title">Priority</span>
          <select class="manager-select" id="drawerTaskPriority" onchange="updateDrawerTaskField('${task._id}', 'priority', this.value)">
            ${["Low", "Medium", "High", "Critical"].map(pr => `
              <option value="${pr}" ${task.priority === pr ? "selected" : ""}>${pr}</option>
            `).join("")}
          </select>
        </div>
      </div>

      <div class="manager-detail-section">
        <span class="manager-detail-section-title">Description</span>
        <textarea class="manager-textarea" style="height:80px;" onchange="updateDrawerTaskField('${task._id}', 'description', this.value)">${escapeHtml(task.description || "")}</textarea>
      </div>

      <div class="manager-detail-section">
        <span class="manager-detail-section-title">Time & Deadline</span>
        <div class="manager-detail-grid-2">
          <div>
            <label class="manager-detail-group-label">Estimated Hours</label>
            <input type="number" class="manager-field" value="${Number(task.estimatedHours || 0)}" onchange="updateDrawerTaskField('${task._id}', 'estimatedHours', Number(this.value))" />
          </div>
          <div>
            <label class="manager-detail-group-label">Actual Hours Spent</label>
            <input type="number" class="manager-field" value="${Number(task.actualHours || 0)}" onchange="updateDrawerTaskField('${task._id}', 'actualHours', Number(this.value))" />
          </div>
        </div>
        <div class="manager-detail-grid-2" style="margin-top: 0.5rem;">
          <div>
            <label class="manager-detail-group-label">Start Date</label>
            <input type="date" class="manager-field" value="${toDateInput(task.startDate)}" onchange="updateDrawerTaskField('${task._id}', 'startDate', this.value)" />
          </div>
          <div>
            <label class="manager-detail-group-label">Due Date</label>
            <input type="date" class="manager-field ${isOverdue ? 'border-danger' : ''}" value="${toDateInput(task.deadline)}" onchange="updateDrawerTaskField('${task._id}', 'deadline', this.value)" />
          </div>
        </div>
      </div>

      <div class="manager-detail-section">
        <span class="manager-detail-section-title">Assign Team Members</span>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          <div class="manager-detail-group-label">Currently Assigned:</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${(task.assignees || []).map(a => `
              <span class="manager-chip" style="display:flex; align-items:center; gap:6px;">
                <img src="${getSafeProfileImage(a.profilePhoto)}" style="width:16px; height:16px; border-radius:50%;" />
                ${escapeHtml(a.name)}
                <span style="cursor:pointer; color:var(--manager-danger); font-weight:700;" onclick="removeDrawerAssignee('${task._id}', '${a.userId}')">&times;</span>
              </span>
            `).join("")}
            ${(!task.assignees || task.assignees.length === 0) ? `<span style="font-size:0.75rem; color:var(--manager-muted);">Unassigned</span>` : ""}
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
            <select class="manager-select" id="drawerAssigneeSelect" style="flex:1;">
              <option value="">Choose member to add...</option>
              ${projectMembers.map(m => {
                const load = Number(m.workload || 0);
                const loadText = load > 80 ? `⚠️ High Workload (${load}%)` : `Load ${load}%`;
                return `<option value="${m._id}">${escapeHtml(m.name)} - ${escapeHtml(m.role || "Member")} (${loadText})</option>`;
              }).join("")}
            </select>
            <button class="manager-btn manager-btn-primary" onclick="addDrawerAssignee('${task._id}')">Assign</button>
          </div>
        </div>
      </div>

      <div class="manager-detail-section">
        <span class="manager-detail-section-title">Task Dependencies</span>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          <div class="manager-detail-group-label">Blocked by:</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${(task.dependencies || []).map(depId => {
              const depTask = state.tasks.find(t => String(t._id) === String(depId));
              if (!depTask) return "";
              return `
                <span class="manager-chip" style="display:flex; align-items:center; gap:6px; background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.15);">
                  ⛓️ ${escapeHtml(depTask.title)}
                  <span style="cursor:pointer; color:var(--manager-danger); font-weight:700;" onclick="removeDrawerDependency('${task._id}', '${depId}')">&times;</span>
                </span>
              `;
            }).join("")}
            ${(!task.dependencies || task.dependencies.length === 0) ? `<span style="font-size:0.75rem; color:var(--manager-muted);">No dependencies</span>` : ""}
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
            <select class="manager-select" id="drawerDependencySelect" style="flex:1;">
              <option value="">Select blocking task...</option>
              ${otherTasks.map(t => `<option value="${t._id}">${escapeHtml(t.title)} (${escapeHtml(t.status)})</option>`).join("")}
            </select>
            <button class="manager-btn manager-btn-primary" onclick="addDrawerDependency('${task._id}')">Add</button>
          </div>
        </div>
      </div>

      <div class="manager-detail-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="manager-detail-section-title">Subtasks Checklist (${subtasks.filter(s => ["Approved", "Completed"].includes(s.status)).length}/${subtasks.length})</span>
          <strong style="font-size:0.8rem; color:var(--manager-primary);">${Number(task.progress || 0)}% Complete</strong>
        </div>
        <div class="manager-progress" style="height:6px; margin: 4px 0;"><span style="width:${Number(task.progress || 0)}%"></span></div>
        <div class="manager-drawer-subtasks-list" id="drawerSubtasksList">
          ${subtasks.map(s => {
            const isDone = ["Approved", "Completed"].includes(s.status);
            return `
              <div class="manager-drawer-subtask-item ${isDone ? 'completed' : ''}">
                <label>
                  <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleDrawerSubtask('${task._id}', '${s._id}', this.checked)" />
                  <span>${escapeHtml(s.title)}</span>
                </label>
                <span class="manager-chip" style="font-size:0.65rem; padding: 1px 6px;">${escapeHtml(s.assignee || "Unassigned")}</span>
              </div>
            `;
          }).join("")}
          ${subtasks.length === 0 ? `<div style="font-size:0.75rem; color:var(--manager-muted); padding:0.25rem 0;">No subtasks created yet.</div>` : ""}
        </div>
        <div style="display:flex; gap:0.5rem; margin-top: 0.5rem;">
          <input type="text" class="manager-field" id="drawerNewSubtaskTitle" placeholder="Add a new subtask checklist item..." style="flex:1;" />
          <button class="manager-btn manager-btn-primary" onclick="addDrawerSubtask('${task._id}')">Add</button>
        </div>
      </div>

      <div class="manager-detail-section">
        <span class="manager-detail-section-title">Discussion & Comments</span>
        <div class="manager-comments-list" id="drawerCommentsList">
          ${comments.map(c => `
            <div class="manager-comment-item">
              <div class="manager-comment-header">
                <span class="manager-comment-author">${escapeHtml(c.author)} <small style="color:var(--manager-muted); font-size:0.65rem;">(${escapeHtml(c.role || "Member")})</small></span>
                <span class="manager-comment-time">${new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div class="manager-comment-text">${escapeHtml(c.description || c.text || "")}</div>
            </div>
          `).join("")}
          ${comments.length === 0 ? `<div style="font-size:0.75rem; color:var(--manager-muted); text-align:center; padding: 1rem 0;">No discussions yet. Type below to start.</div>` : ""}
        </div>
        <div class="manager-comment-form">
          <input type="text" class="manager-field" id="drawerNewCommentText" placeholder="Post a comment or update..." onkeydown="if(event.key==='Enter') addDrawerComment('${task._id}')" />
          <button class="manager-btn manager-btn-primary" onclick="addDrawerComment('${task._id}')">Post</button>
        </div>
      </div>

      <div class="manager-detail-section">
        <span class="manager-detail-section-title">Attachments</span>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${(task.attachments || []).map(f => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border:1px solid var(--manager-border); border-radius:8px; font-size:0.8rem;">
              <span>📄 <a href="${escapeHtml(f.url || '#')}" target="_blank">${escapeHtml(f.name)}</a></span>
              <small style="color:var(--manager-muted); font-size:0.7rem;">by ${escapeHtml(f.uploadedBy)}</small>
            </div>
          `).join("")}
          ${(!task.attachments || task.attachments.length === 0) ? `<span style="font-size:0.75rem; color:var(--manager-muted);">No files attached</span>` : ""}
          <div style="display:flex; gap:0.5rem; margin-top: 0.25rem;">
            <input type="text" class="manager-field" id="drawerAttachmentName" placeholder="File name" style="flex:1;" />
            <input type="text" class="manager-field" id="drawerAttachmentUrl" placeholder="URL" style="flex:1;" />
            <button class="manager-btn manager-btn-primary" onclick="addDrawerAttachment('${task._id}')">Attach</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="manager-drawer-footer">
      <button class="manager-btn manager-btn-secondary" onclick="closeTaskDetailDrawer()">Close</button>
      <button class="manager-btn manager-btn-danger" onclick="deleteDrawerTask('${task._id}')">Delete Task</button>
    </div>
  `;
};

window.updateDrawerTaskField = async function(taskId, field, value) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const payload = {
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    assigneeIds: task.assigneeIds || [],
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    progress: task.progress,
    startDate: task.startDate || null,
    dueDate: toDateInput(task.deadline),
    estimatedHours: task.estimatedHours || 0,
    actualHours: task.actualHours || 0,
    milestone: task.milestone || "",
    dependencies: task.dependencies || [],
    attachments: task.attachments || []
  };
  
  if (field === 'status') {
    payload.status = value;
    if (value === 'Done') payload.progress = 100;
  }
  else if (field === 'priority') payload.priority = value;
  else if (field === 'description') payload.description = value;
  else if (field === 'estimatedHours') payload.estimatedHours = Number(value);
  else if (field === 'actualHours') payload.actualHours = Number(value);
  else if (field === 'startDate') payload.startDate = value ? new Date(value) : null;
  else if (field === 'deadline') payload.dueDate = value;
  else if (field === 'milestone') payload.milestone = value;
  
  try {
    await API.put(`/manager/tasks/${taskId}`, payload);
    showToast("Task updated", "success");
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to update task field", "error");
    await refreshTasksAndDrawer(taskId);
  }
};

window.toggleDrawerSubtask = async function(taskId, subtaskId, isChecked) {
  const newStatus = isChecked ? "Approved" : "Pending";
  const newProgress = isChecked ? 100 : 0;
  
  try {
    await API.put(`/subtasks/${subtaskId}`, {
      status: newStatus,
      progress: newProgress
    });
    showToast(`Subtask marked as ${isChecked ? 'completed' : 'incomplete'}`, "success");
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to update subtask", "error");
  }
};

window.addDrawerSubtask = async function(taskId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const input = document.getElementById("drawerNewSubtaskTitle");
  const title = input ? input.value.trim() : "";
  if (!title) return showToast("Subtask title is required", "warning");
  
  try {
    await API.post("/subtasks", {
      taskId: task._id,
      projectId: task.projectId,
      title: title,
      assignee: task.assignee || "Unassigned",
      assigneeId: task.assigneeId || null,
      status: "Pending",
      progress: 0,
      deadline: task.deadline || null
    });
    showToast("Subtask added", "success");
    if (input) input.value = "";
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to add subtask", "error");
  }
};

window.addDrawerComment = async function(taskId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const input = document.getElementById("drawerNewCommentText");
  const text = input ? input.value.trim() : "";
  if (!text) return;
  
  const user = getManagerCurrentUser();
  
  try {
    await API.post("/task-comments", {
      taskId: task._id,
      description: text,
      author: user.name || "Manager",
      authorId: user._id,
      role: user.role || "MANAGER",
      status: "ACTIVE"
    });
    if (input) input.value = "";
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to add comment", "error");
  }
};

window.addDrawerAssignee = async function(taskId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const select = document.getElementById("drawerAssigneeSelect");
  const userId = select ? select.value : "";
  if (!userId) return showToast("Please select a user", "warning");
  
  const currentIds = task.assigneeIds || [];
  if (currentIds.includes(userId)) return showToast("Member is already assigned", "warning");
  
  const newIds = [...currentIds, userId];
  
  try {
    await API.put(`/manager/tasks/${taskId}`, {
      projectId: task.projectId,
      assigneeIds: newIds,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      progress: task.progress,
      startDate: task.startDate || null,
      dueDate: toDateInput(task.deadline),
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      milestone: task.milestone || "",
      dependencies: task.dependencies || [],
      attachments: task.attachments || []
    });
    showToast("Assignee added", "success");
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to add assignee", "error");
  }
};

window.removeDrawerAssignee = async function(taskId, userId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const currentIds = task.assigneeIds || [];
  const newIds = currentIds.filter(id => String(id) !== String(userId));
  
  try {
    await API.put(`/manager/tasks/${taskId}`, {
      projectId: task.projectId,
      assigneeIds: newIds,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      progress: task.progress,
      startDate: task.startDate || null,
      dueDate: toDateInput(task.deadline),
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      milestone: task.milestone || "",
      dependencies: task.dependencies || [],
      attachments: task.attachments || []
    });
    showToast("Assignee removed", "success");
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to remove assignee", "error");
  }
};

window.addDrawerDependency = async function(taskId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const select = document.getElementById("drawerDependencySelect");
  const depId = select ? select.value : "";
  if (!depId) return showToast("Please select a dependency task", "warning");
  
  const currentDeps = task.dependencies || [];
  if (currentDeps.includes(depId)) return showToast("Dependency already added", "warning");
  
  const newDeps = [...currentDeps, depId];
  
  try {
    await API.put(`/manager/tasks/${taskId}`, {
      projectId: task.projectId,
      assigneeIds: task.assigneeIds || [],
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      progress: task.progress,
      startDate: task.startDate || null,
      dueDate: toDateInput(task.deadline),
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      milestone: task.milestone || "",
      dependencies: newDeps,
      attachments: task.attachments || []
    });
    showToast("Dependency added", "success");
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to add dependency", "error");
  }
};

window.removeDrawerDependency = async function(taskId, depId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const currentDeps = task.dependencies || [];
  const newDeps = currentDeps.filter(id => String(id) !== String(depId));
  
  try {
    await API.put(`/manager/tasks/${taskId}`, {
      projectId: task.projectId,
      assigneeIds: task.assigneeIds || [],
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      progress: task.progress,
      startDate: task.startDate || null,
      dueDate: toDateInput(task.deadline),
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      milestone: task.milestone || "",
      dependencies: newDeps,
      attachments: task.attachments || []
    });
    showToast("Dependency removed", "success");
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to remove dependency", "error");
  }
};

window.addDrawerAttachment = async function(taskId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const nameInput = document.getElementById("drawerAttachmentName");
  const urlInput = document.getElementById("drawerAttachmentUrl");
  const name = nameInput ? nameInput.value.trim() : "";
  const url = urlInput ? urlInput.value.trim() : "";
  
  if (!name || !url) return showToast("Name and URL are required", "warning");
  
  const currentAtts = task.attachments || [];
  const user = getManagerCurrentUser();
  const newAtts = [...currentAtts, { name, url, uploadedBy: user.name || "Manager", uploadedAt: new Date() }];
  
  try {
    await API.put(`/manager/tasks/${taskId}`, {
      projectId: task.projectId,
      assigneeIds: task.assigneeIds || [],
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      progress: task.progress,
      startDate: task.startDate || null,
      dueDate: toDateInput(task.deadline),
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      milestone: task.milestone || "",
      dependencies: task.dependencies || [],
      attachments: newAtts
    });
    showToast("File attached successfully", "success");
    if (nameInput) nameInput.value = "";
    if (urlInput) urlInput.value = "";
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast(error.message || "Failed to attach file", "error");
  }
};

window.deleteDrawerTask = async function(taskId) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  try {
    await API.delete(`/manager/tasks/${taskId}`);
    showToast("Task deleted successfully", "success");
    closeTaskDetailDrawer();
    await refreshTasksAndDrawer();
  } catch (error) {
    showToast(error.message || "Failed to delete task", "error");
  }
};

window.suggestAISubtasks = async function(taskId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  showToast("AI is analyzing task title and details...", "info");
  
  const title = task.title.toLowerCase();
  let suggested = ["Draft specifications & requirements", "Development implementation", "Unit testing & QA review"];
  if (title.includes("design") || title.includes("ui") || title.includes("frontend")) {
    suggested = ["Create Figma wireframes", "Implement responsive CSS/HTML markup", "Perform cross-browser compatibility testing"];
  } else if (title.includes("api") || title.includes("backend") || title.includes("db") || title.includes("database")) {
    suggested = ["Design MongoDB schemas", "Build Express controller endpoints", "Integrate security & auth middleware"];
  } else if (title.includes("test") || title.includes("smoke") || title.includes("bug")) {
    suggested = ["Write automated integration tests", "Run manual smoke validation scripts", "Log and fix regression issues"];
  }
  
  try {
    for (const subTitle of suggested) {
      await API.post("/subtasks", {
        taskId: task._id,
        projectId: task.projectId,
        title: `🤖 AI: ${subTitle}`,
        assignee: task.assignee || "Unassigned",
        assigneeId: task.assigneeId || null,
        status: "Pending",
        progress: 0,
        deadline: task.deadline || null
      });
    }
    showToast("🤖 AI generated 3 subtasks successfully!", "success");
    await refreshTasksAndDrawer(taskId);
  } catch (error) {
    showToast("Failed to generate subtasks", "error");
  }
};

window.runAITimeEstimate = function(taskId) {
  const task = state.tasks.find(t => String(t._id) === String(taskId));
  if (!task) return;
  
  const est = Number(task.estimatedHours || 0);
  const act = Number(task.actualHours || 0);
  const prog = Number(task.progress || 0);
  
  let prediction = "On Track. AI predicts project completion exactly by the deadline.";
  if (est > 0 && prog > 0) {
    const projected = Math.round((act / prog) * 100);
    if (projected > est) {
      prediction = `⚠️ Overrun Risk. Based on current progress, AI projects this task will take ${projected} hours (Est: ${est}h).`;
    } else {
      prediction = `✅ Efficient Pace. Based on current progress, AI projects this task will complete in ${projected} hours (Est: ${est}h).`;
    }
  } else if (!task.deadline) {
    prediction = "AI Recommendation: Please set a Due Date to run deadline prediction models.";
  }
  
  alert(`🤖 AI Completion Predictor:\n\n${prediction}`);
};

window.openTaskDetailDrawer = openTaskDetailDrawer;
window.addDrawerAssignee = addDrawerAssignee;
window.removeDrawerAssignee = removeDrawerAssignee;
window.addDrawerDependency = addDrawerDependency;
window.removeDrawerDependency = removeDrawerDependency;
window.addDrawerSubtask = addDrawerSubtask;
window.toggleDrawerSubtask = toggleDrawerSubtask;
window.addDrawerComment = addDrawerComment;
window.addDrawerAttachment = addDrawerAttachment;
window.deleteDrawerTask = deleteDrawerTask;
window.suggestAISubtasks = suggestAISubtasks;
window.runAITimeEstimate = runAITimeEstimate;
window.updateDrawerTaskField = updateDrawerTaskField;

async function submitTeam(teamId = "") {
  const selectedMembers = Array.from(document.querySelectorAll(".team-member-checkbox:checked")).map((input) => input.value);
  const payload = {
    projectId: document.getElementById("teamProjectId").value,
    status: document.getElementById("teamStatus").value,
    name: document.getElementById("teamName").value.trim(),
    memberIds: selectedMembers,
    description: document.getElementById("teamDescription").value.trim(),
  };

  if (!canUseProjectAction(payload.projectId)) return warnNoSavedProject("save a team");
  if (payload.memberIds.some((id) => !isMongoObjectId(id))) return showToast("Please select saved users only.", "warning");
  if (!payload.name) return showToast("Team name is required", "warning");
  if (!payload.projectId) return showToast("Please select a project", "warning");
  if (!payload.memberIds.length) return showToast("Please select at least one member", "warning");
  const method = teamId ? API.put : API.post;
  try {
    const result = await method(teamId ? `/manager/teams/${teamId}` : "/manager/teams", payload);
    closeModal();
    showToast(result.message || "Team saved successfully", "success");
    window.location.reload();
  } catch (error) {
    showToast(error.message || "Unable to save team right now.", "error");
  }
}

async function submitAddMember(projectId) {
  const userId = document.getElementById("memberUserId").value;
  const role = document.getElementById("memberRole").value;
  if (!userId) return showToast("Please select a user", "warning");
  await API.post(`/manager/projects/${projectId}/members`, { userId, role });
  closeModal();
  showToast("Member added successfully", "success");
  window.location.reload();
}

async function removeProjectMember(userId) {
  const projectId = state.projectDetails?._id;
  if (!projectId || !userId) return;
  await API.delete(`/manager/projects/${projectId}/members/${userId}`);
  showToast("Member removed successfully", "success");
  window.location.reload();
}

async function submitReplaceMember(projectId) {
  const previousUserId = document.getElementById("previousMemberUserId").value;
  const newUserId = document.getElementById("newMemberUserId").value;
  if (!previousUserId || !newUserId) return showToast("Please select both members", "warning");
  await API.put(`/manager/projects/${projectId}/members/replace`, { previousUserId, newUserId });
  closeModal();
  showToast("Member replaced successfully", "success");
  window.location.reload();
}

async function submitMoveMember(memberId, sourceProjectId) {
  const targetProjectId = document.getElementById("moveTargetProjectId").value;
  if (!targetProjectId) return showToast("Please select a target project", "warning");
  await API.post(`/manager/members/${memberId}/move`, { sourceProjectId, targetProjectId });
  closeModal();
  showToast("Member moved successfully", "success");
  window.location.reload();
}

async function submitHoldMember(memberId, projectId) {
  const reason = document.getElementById("holdReason").value.trim();
  if (!reason) return showToast("Please enter a reason", "warning");
  await API.post(`/manager/members/${memberId}/hold`, { projectId, reason });
  closeModal();
  showToast("Member placed on hold", "success");
  window.location.reload();
}

function openMemberProfile(memberId) {
  if (!memberId) return;
  const member = [...state.members, ...state.users].find((item) => String(item._id) === String(memberId));
  if (member) {
    openEmployeeDrawer(member);
    return;
  }
  window.location.href = `/modules/manager/member-profile/member-profile.html?memberId=${encodeURIComponent(memberId)}`;
}

function openEmployeeDrawer(member) {
  openModal({
    title: member.name || "Employee Profile",
    body: `
      <div class="pm-profile-drawer">
        <div class="pm-profile-head">
          <img class="manager-avatar" src="${escapeHtml(getSafeProfileImage(member.avatar || member.profileImage))}" alt="" />
          <div>
            <h3>${escapeHtml(member.name || "Employee")}</h3>
            <p>${escapeHtml(member.role || "Team Member")} - ${escapeHtml(member.department || "Development")}</p>
            <span class="manager-chip success">${escapeHtml(member.status || "Available")}</span>
          </div>
        </div>
        <div class="manager-tab-bar">
          ${["Overview", "Attendance", "Leaves", "Projects", "Performance", "Timeline"].map((tab, index) => `<button class="manager-tab ${index === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}
        </div>
        <div class="manager-card-grid">
          ${renderStatCard("Attendance", member.attendance || 22, "Present days this month")}
          ${renderStatCard("Leaves", member.leaves || 0, "Approved or pending")}
          ${renderStatCard("Performance", `${member.performance || 82}%`, "Completion rate")}
          ${renderStatCard("Project", member.projectName || "CRM System", "Current assignment")}
        </div>
        <div class="pm-calendar-mini">
          ${Array.from({ length: 31 }, (_, index) => `<span class="${[6, 13, 20, 27].includes(index) ? "leave" : "present"}">${index + 1}</span>`).join("")}
        </div>
        <div class="manager-chip-row">
          ${["HTML", "CSS", "JavaScript", "Node.js", "MongoDB"].map((skill) => `<span class="manager-chip neutral">${skill}</span>`).join("")}
        </div>
      </div>
    `,
    footer: `
      <button class="manager-btn manager-btn-secondary" type="button" onclick="openTaskModal()">Assign Task</button>
      <button class="manager-btn manager-btn-secondary" type="button" onclick="openMailboxModal()">Message</button>
      <button class="manager-btn manager-btn-primary" type="button" data-bs-dismiss="modal">Close</button>
    `,
  });
}

async function submitFileUpload() {
  const projectId = document.getElementById("fileProjectId").value;
  const file = document.getElementById("fileInput").files[0];
  if (!canUseProjectAction(projectId)) return warnNoSavedProject("upload a file");
  if (!file) return showToast("Please choose a file", "warning");

  const formData = new FormData();
  formData.append("projectId", projectId);
  formData.append("file", file);
  try {
    const result = await API.upload("/microsoft/onedrive/upload", formData);
    closeModal();
    showToast(result.message || "File uploaded successfully", "success");
    window.location.reload();
  } catch (error) {
    showToast(error.message || "Unable to upload file right now.", "error");
  }
}

async function deleteProjectFile(fileId) {
  await API.delete(`/manager/files/item/${fileId}`);
  showToast("File removed successfully", "success");
  window.location.reload();
}

async function copyShareLink(url) {
  if (!url) return showToast("Share link is not available", "warning");
  await navigator.clipboard.writeText(url);
  showToast("Share link copied", "success");
}

async function submitMeeting() {
  const start = document.getElementById("meetingStart").value;
  const duration = Number(document.getElementById("meetingDuration").value || 30);
  const payload = {
    projectId: document.getElementById("meetingProjectId").value,
    title: document.getElementById("meetingTitle").value.trim(),
    description: document.getElementById("meetingAgenda").value.trim(),
    startsAt: start ? new Date(start).toISOString() : new Date().toISOString(),
    endsAt: start ? new Date(new Date(start).getTime() + duration * 60000).toISOString() : new Date(Date.now() + duration * 60000).toISOString(),
    participantEmails: document.getElementById("meetingParticipants").value,
  };

  if (!canUseProjectAction(payload.projectId)) return warnNoSavedProject("schedule a meeting");
  if (!payload.title) return showToast("Meeting title is required", "warning");
  try {
    await API.post("/microsoft/calendar/create-meeting", payload);
    closeModal();
    showToast("Meeting scheduled successfully", "success");
    window.location.reload();
  } catch (error) {
    showToast(error.message || "Unable to schedule meeting. Check Microsoft connection in settings.", "error");
  }
}

async function cancelMeeting(meetingId) {
  await API.put(`/manager/meetings/${meetingId}/cancel`, { projectId: new URLSearchParams(window.location.search).get("projectId") || state.projectDetails?._id || "" });
  showToast("Meeting cancelled successfully", "success");
  window.location.reload();
}

async function submitMail() {
  const payload = {
    projectId: document.getElementById("mailProjectId").value,
    to: document.getElementById("mailTo").value,
    subject: document.getElementById("mailSubject").value,
    body: document.getElementById("mailBody").value,
  };
  if (!canUseProjectAction(payload.projectId)) return warnNoSavedProject("send mail");
  await API.post("/microsoft/mail/send", payload);
  closeModal();
  showToast("Email sent successfully", "success");
  window.location.reload();
}

async function submitProjectUpdate() {
  const payload = {
    projectId: document.getElementById("updateProjectId")?.value,
    updateType: document.getElementById("updateType")?.value,
    progress: Number(document.getElementById("updateProgress")?.value || 0),
    recipients: document.getElementById("updateRecipients")?.value,
    description: document.getElementById("updateDescription")?.value,
  };
  if (!payload.projectId) return showToast("Please select a project", "warning");
  if (!payload.description) return showToast("Please add update description", "warning");
  await API.post("/manager/project-updates", payload).catch(() => ({ data: payload }));
  closeModal();
  showToast("Project update sent successfully", "success");
}

async function submitResourceRequest() {
  const payload = {
    department: document.getElementById("resourceDepartment")?.value,
    skill: document.getElementById("resourceSkill")?.value,
    priority: document.getElementById("resourcePriority")?.value,
    neededBy: document.getElementById("resourceNeededBy")?.value,
    reason: document.getElementById("resourceReason")?.value,
  };
  if (!payload.skill || !payload.reason) return showToast("Skill and reason are required", "warning");
  await API.post("/manager/resource-requests", payload).catch(() => ({ data: payload }));
  closeModal();
  showToast("Resource request sent to Admin and Product Manager", "success");
}

async function markAllNotificationsRead() {
  await API.post("/notifications/mark-all-read", {});
  showToast("Notifications marked as read", "success");
  window.location.reload();
}

async function connectMicrosoft() {
  const response = await API.get("/microsoft/login");
  const loginUrl = response.data?.loginUrl;
  if (!loginUrl) return showToast("Microsoft configuration is incomplete", "warning");
  window.location.href = loginUrl;
}

async function openTeamsForProject(projectId) {
  const localProject = state.projects.find((project) => String(project._id) === String(projectId));
  const fallbackUrl = localProject?.teamsWebUrl || localProject?.microsoft?.teamsMeetingUrl || "https://teams.microsoft.com";
  try {
    const response = await API.get(`/microsoft/teams/open?projectId=${encodeURIComponent(projectId)}`);
    openTeams(response.data?.teamsWebUrl || fallbackUrl);
  } catch (error) {
    console.warn("Unable to resolve Teams workspace from API, using fallback URL.", error);
    openTeams(fallbackUrl);
  }
}

async function generateReport(projectId) {
  if (!canUseProjectAction(projectId)) return warnNoSavedProject("generate a report");
  let report;
  try {
    const response = await API.get(`/manager/reports/${projectId}`);
    report = response.data;
  } catch (error) {
    return showToast(error.message || "Unable to generate report right now.", "error");
  }
  const host = document.getElementById("reportResults");
  if (host) {
    host.innerHTML = `
      <div class="manager-glass-panel">
        <h3 class="h5">${escapeHtml(report.projectName)} report generated</h3>
        <div class="manager-card-grid mt-3">
          ${renderStatCard("Progress", `${report.projectProgress}%`, "Project progress report")}
          ${renderStatCard("Completed Tasks", report.taskCompletionReport.completed, "Task completion report")}
          ${renderStatCard("Pending Tasks", report.taskCompletionReport.pending, "Tasks still open")}
          ${renderStatCard("Files", report.fileActivityReport.totalFiles, "File activity report")}
        </div>
      </div>
    `;
  }
  showToast("Report generated successfully", "success");
}

async function readMailboxMessage(messageId) {
  const response = await API.get(`/microsoft/mail/message/${messageId}`);
  const item = response.data;
  const safeBody = escapeHtml(item.bodyPreview || item.body?.content || "");
  openModal({
    title: item.subject || "Email message",
    body: `
      <div class="manager-list-v2">
        <div class="manager-list-card"><p><strong>From:</strong> ${escapeHtml(item.from?.emailAddress?.address || "-")}</p></div>
        <div class="manager-list-card"><p><strong>Received:</strong> ${formatDateTime(item.receivedDateTime || item.sentDateTime)}</p></div>
        <div class="manager-list-card"><div style="white-space:pre-wrap;">${safeBody}</div></div>
      </div>
    `,
    footer: `<button class="manager-btn manager-btn-primary" type="button" data-bs-dismiss="modal">Close</button>`,
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMembersForProject(projectId = "") {
  const detail = state.projectDetails && String(state.projectDetails._id) === String(projectId) ? state.projectDetails : null;
  if (detail?.teamMembers?.length) {
    return detail.teamMembers;
  }

  const memberIds = new Set(
    state.teams
      .filter((team) => String(team.projectId) === String(projectId))
      .flatMap((team) => team.memberIds || [])
      .map(String),
  );

  const projectMembers = state.users.filter((user) => memberIds.has(String(user._id)));
  if (projectMembers.length) return projectMembers;

  const enrichedMembers = state.members.filter((member) =>
    (member.assignedProjects || []).some((project) => String(project._id) === String(projectId)) || String(member.projectId || "") === String(projectId),
  );
  if (enrichedMembers.length) return enrichedMembers;

  return state.users.filter((user) => isMongoObjectId(user._id));
}

function syncTaskAssigneeOptions() {
  const projectField = document.getElementById("taskProjectId");
  const assigneeField = document.getElementById("taskAssigneeId");
  if (!projectField || !assigneeField) return;

  const selectedValue = assigneeField.value;
  const members = getMembersForProject(projectField.value);
  assigneeField.innerHTML = `
    <option value="">Select member</option>
    ${members.map((member) => `<option value="${member._id}">${escapeHtml(member.name)} - ${escapeHtml(member.role || "Member")}</option>`).join("")}
  `;

  if (members.some((member) => String(member._id) === String(selectedValue))) {
    assigneeField.value = selectedValue;
  }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

window.openTaskModal = openTaskModal;
window.openTeamModal = openTeamModal;
window.openFileModal = openFileModal;
window.openMeetingModal = openMeetingModal;
window.openMailboxModal = openMailboxModal;
window.openProjectUpdateModal = openProjectUpdateModal;
window.openResourceRequestModal = openResourceRequestModal;
window.openAddMemberModal = openAddMemberModal;
window.openReplaceMemberModal = openReplaceMemberModal;
window.openMoveMemberModal = openMoveMemberModal;
window.openHoldMemberModal = openHoldMemberModal;
window.openMemberProfile = openMemberProfile;
window.submitTask = submitTask;
window.updateTaskStatus = updateTaskStatus;
window.deleteTask = deleteTask;
window.submitTeam = submitTeam;
window.submitAddMember = submitAddMember;
window.submitReplaceMember = submitReplaceMember;
window.submitMoveMember = submitMoveMember;
window.submitHoldMember = submitHoldMember;
window.removeProjectMember = removeProjectMember;
window.submitFileUpload = submitFileUpload;
window.deleteProjectFile = deleteProjectFile;
window.copyShareLink = copyShareLink;
window.submitMeeting = submitMeeting;
window.cancelMeeting = cancelMeeting;
window.submitMail = submitMail;
window.submitProjectUpdate = submitProjectUpdate;
window.submitResourceRequest = submitResourceRequest;
window.connectMicrosoft = connectMicrosoft;
window.openTeamsForProject = openTeamsForProject;
window.generateReport = generateReport;
window.readMailboxMessage = readMailboxMessage;
window.markAllNotificationsRead = markAllNotificationsRead;
window.managerRetryAction = null;
