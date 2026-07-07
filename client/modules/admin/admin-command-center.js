const ADMIN_CLIENTS_STORAGE_KEY = "enterpriseClients";

function getAdminDataset() {
  const store = window.enterpriseStore || {};
  return {
    departments: store.getDepartments?.() || [],
    users: store.getUsers?.() || [],
    projects: store.getProjects?.() || [],
    tasks: store.getTasks?.() || [],
    teams: store.getTeams?.() || [],
    communications: store.getCommunications?.() || [],
    attendance: store.getAttendance?.() || [],
    leaveRequests: store.getLeaveRequests?.() || [],
    timesheets: store.getTimesheets?.() || [],
    clients: getAdminClients(),
  };
}

const DEFAULT_INTEGRATION_STATUS = {
  microsoft: {
    tenantConfigured: false,
    clientConfigured: false,
    secretConfigured: false,
    redirectConfigured: false,
    oneDriveRootConfigured: false,
    graphReady: false,
    outlookReady: false,
    calendarReady: false,
    teamsReady: false,
    oneDriveReady: false,
  },
  smtp: {
    configured: false,
    fromEmail: "",
  },
};

function getAdminClients() {
  try {
    const raw = localStorage.getItem(ADMIN_CLIENTS_STORAGE_KEY);
    const items = JSON.parse(raw || "[]");
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
}

async function fetchAdminIntegrationStatus() {
  if (window.__adminIntegrationStatus) {
    return window.__adminIntegrationStatus;
  }

  try {
    const response = await apiRequest("/settings/integrations");
    const status = response?.data || response || DEFAULT_INTEGRATION_STATUS;
    window.__adminIntegrationStatus = {
      ...DEFAULT_INTEGRATION_STATUS,
      ...status,
      microsoft: {
        ...DEFAULT_INTEGRATION_STATUS.microsoft,
        ...(status.microsoft || {}),
      },
      smtp: {
        ...DEFAULT_INTEGRATION_STATUS.smtp,
        ...(status.smtp || {}),
      },
    };
    return window.__adminIntegrationStatus;
  } catch (error) {
    window.__adminIntegrationStatus = DEFAULT_INTEGRATION_STATUS;
    return window.__adminIntegrationStatus;
  }
}

function getAdminIntegrationStatus() {
  return window.__adminIntegrationStatus || DEFAULT_INTEGRATION_STATUS;
}

function normalizeAdminRole(role) {
  return String(role || "").trim().toUpperCase();
}

function escapeAdminHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function formatAdminCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatAdminDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAdminDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProjectStage(project = {}) {
  if (project.workflowStage) return String(project.workflowStage);
  const status = String(project.status || "").toLowerCase();
  if (status === "completed") return "Completed";
  if (status === "cancelled" || status === "archived") return "Archived";
  if (project.manager || project.managerId) return "Assigned";
  return "Draft";
}

function getProjectDocumentCount(project = {}) {
  if (Array.isArray(project.requirementDocs) && project.requirementDocs.length) {
    return project.requirementDocs.length;
  }

  return Number(project.documentsCount || 0);
}

function getProjectMicrosoftSummary(project = {}) {
  const microsoft = project.microsoft || {};
  const graphSyncStatus = microsoft.graphSyncStatus || "Pending";
  const documents = getProjectDocumentCount(project);
  return {
    folder: microsoft.oneDriveFolder || "Project workspace pending",
    shareUrl: microsoft.shareUrl || "",
    reviewMeetingType: microsoft.reviewMeetingType || "Weekly Review Meeting",
    teamsMeetingUrl: microsoft.teamsMeetingUrl || "",
    graphSyncStatus,
    documentState: documents > 0 ? `${documents} document${documents === 1 ? "" : "s"} linked` : "No documents linked",
    syncTone:
      String(graphSyncStatus).toLowerCase() === "synced"
        ? "positive"
        : String(graphSyncStatus).toLowerCase() === "warning"
          ? "warning"
          : "danger",
  };
}

function getUserMicrosoftSummary(user = {}) {
  const microsoft = user.microsoft || {};
  const email = microsoft.outlookEmail || user.email || "";
  return {
    outlookEmail: email,
    outlookReady: Boolean(microsoft.outlookReady || email),
    calendarReady: Boolean(microsoft.calendarReady),
    teamsReady: Boolean(microsoft.teamsReady),
    oneDriveReady: Boolean(microsoft.oneDriveReady),
    welcomeState: microsoft.lastWelcomeEmailAt ? `Welcome email sent on ${formatAdminDateTime(microsoft.lastWelcomeEmailAt)}` : "Welcome email queued after save",
  };
}

function getMicrosoftServiceReadiness(status = getAdminIntegrationStatus()) {
  const microsoft = status.microsoft || {};
  return [
    { key: "outlook", title: "Outlook Mail", ready: Boolean(microsoft.outlookReady), copy: "Welcome emails, assignment alerts and reminders." },
    { key: "calendar", title: "Outlook Calendar", ready: Boolean(microsoft.calendarReady), copy: "Review meetings, deadlines and follow-up invites." },
    { key: "teams", title: "Microsoft Teams", ready: Boolean(microsoft.teamsReady), copy: "One-to-one calls, review meetings and escalation rooms." },
    { key: "onedrive", title: "OneDrive", ready: Boolean(microsoft.oneDriveReady), copy: "Project folders, file sharing and document visibility." },
    { key: "graph", title: "Graph API", ready: Boolean(microsoft.graphReady), copy: "Unified automation layer for Microsoft 365 workflows." },
  ];
}

function countMicrosoftReadyUsers(users = []) {
  return users.filter((user) => {
    const microsoft = getUserMicrosoftSummary(user);
    return microsoft.outlookReady || microsoft.teamsReady || microsoft.calendarReady || microsoft.oneDriveReady;
  }).length;
}

function getProjectHealth(project = {}) {
  const progress = Number(project.progress || 0);
  const status = String(project.status || "").toLowerCase();
  if (status === "completed" || progress >= 100) return "Stable";
  if (status === "on hold" || status === "cancelled") return "Risk";
  if (progress >= 65) return "Healthy";
  if (progress >= 30) return "Watch";
  return "Risk";
}

function getManagerAnalytics(dataset = getAdminDataset()) {
  const managers = dataset.users.filter((user) => normalizeAdminRole(user.role) === "MANAGER");
  return managers.map((manager) => {
    const managerProjects = dataset.projects.filter((project) => String(project.managerId || project.manager || "") === String(manager._id || manager.name || ""));
    const namedProjects = dataset.projects.filter((project) => String(project.manager || "") === String(manager.name || ""));
    const projects = managerProjects.length ? managerProjects : namedProjects;
    const projectIds = new Set(projects.map((project) => String(project._id)));
    const projectNames = new Set(projects.map((project) => String(project.projectName || "")));
    const tasks = dataset.tasks.filter((task) => projectIds.has(String(task.projectId || "")) || projectNames.has(String(task.projectName || "")) || String(task.manager || "") === String(manager.name || ""));
    const teams = dataset.teams.filter((team) => projectIds.has(String(team.projectId || "")) || projectNames.has(String(team.projectName || "")) || String(team.manager || "") === String(manager.name || ""));
    const memberSet = new Set(teams.flatMap((team) => (Array.isArray(team.members) ? team.members : [])));
    const completedProjects = projects.filter((project) => getProjectStage(project) === "Completed").length;
    const activeProjects = projects.filter((project) => ["Assigned", "Draft"].includes(getProjectStage(project)) ? String(project.status || "").toLowerCase() !== "completed" : getProjectStage(project) === "Assigned").length;
    const openTasks = tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed").length;
    const progressScore = projects.length
      ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length)
      : 0;

    return {
      ...manager,
      projects,
      tasks,
      teams,
      assignedProjects: projects.length,
      activeProjects,
      completedProjects,
      openTasks,
      teamMembersCount: memberSet.size,
      productivityScore: Math.min(99, 58 + progressScore / 2 + completedProjects * 4),
      attendance: Math.min(99, 88 + memberSet.size),
      performanceRating: progressScore >= 80 ? "A+" : progressScore >= 60 ? "A" : progressScore >= 40 ? "B" : "C",
    };
  });
}

function getMemberAnalytics(dataset = getAdminDataset()) {
  const members = dataset.users.filter((user) =>
    ["ADMIN", "MEMBER", "TEAM_MEMBER", "TEAM_LEAD", "HR", "SALES", "MARKETING"].includes(normalizeAdminRole(user.role)),
  );
  return members.map((member) => {
    const tasks = dataset.tasks.filter((task) => String(task.assignee || "") === String(member.name || ""));
    const projectNames = new Set(tasks.map((task) => String(task.projectName || "")));
    const projects = dataset.projects.filter((project) => projectNames.has(String(project.projectName || "")));
    const attendanceRecords = dataset.attendance.filter((item) => String(item.userName || item.employee || "") === String(member.name || ""));
    const presentDays = attendanceRecords.filter((item) => String(item.status || "").toLowerCase() === "present").length;
    const completionRate = tasks.length ? Math.round((tasks.filter((task) => String(task.status || "").toLowerCase() === "completed").length / tasks.length) * 100) : 0;

    return {
      ...member,
      tasks,
      projects,
      assignedProjects: projects.length,
      currentTasks: tasks.filter((task) => String(task.status || "").toLowerCase() !== "completed").length,
      completedTasks: tasks.filter((task) => String(task.status || "").toLowerCase() === "completed").length,
      attendancePercentage: attendanceRecords.length ? Math.round((presentDays / attendanceRecords.length) * 100) : 94,
      productivityScore: Math.min(99, 52 + completionRate / 2 + projects.length * 4),
      dailyUpdatesCount: Math.max(tasks.length, 3),
      rewards: completionRate >= 80 ? "4 badges" : completionRate >= 50 ? "2 badges" : "1 badge",
      leaveBalance: `${Math.max(4, 12 - dataset.leaveRequests.filter((item) => String(item.employee || "") === String(member.name || "")).length)} days`,
      lastLocation: "Pune HQ, Maharashtra",
    };
  });
}

function getUserProfileSnapshot(userId, dataset = getAdminDataset()) {
  const user = dataset.users.find((item) => String(item._id) === String(userId));
  if (!user) return null;

  const role = normalizeAdminRole(user.role);
  if (role === "MANAGER") {
    return {
      type: "manager",
      user,
      metrics: getManagerAnalytics(dataset).find((item) => String(item._id) === String(userId)) || null,
    };
  }

  return {
    type: "member",
    user,
    metrics: getMemberAnalytics(dataset).find((item) => String(item._id) === String(userId)) || null,
  };
}

function getUpcomingCommunicationItems(dataset = getAdminDataset()) {
  return [...dataset.communications]
    .sort((left, right) => new Date(left.time || left.createdAt || 0) - new Date(right.time || right.createdAt || 0))
    .slice(0, 5);
}

function getAdminDashboardMetrics(dataset = getAdminDataset()) {
  const projects = dataset.projects;
  const users = dataset.users;
  const tasks = dataset.tasks;
  const managers = getManagerAnalytics(dataset);
  const members = getMemberAnalytics(dataset);
  const today = new Date();
  const stages = projects.reduce(
    (accumulator, project) => {
      accumulator[getProjectStage(project)] += 1;
      return accumulator;
    },
    { Draft: 0, Assigned: 0, Completed: 0, Archived: 0 },
  );

  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => String(project.status || "").toLowerCase() === "active").length,
    totalUsers: users.length,
    totalManagers: users.filter((user) => normalizeAdminRole(user.role) === "MANAGER").length,
    totalTeamMembers: members.length,
    totalClients: Math.max(dataset.clients.length, users.filter((user) => normalizeAdminRole(user.role) === "CLIENT").length),
    draftProjects: stages.Draft,
    assignedProjects: stages.Assigned,
    completedProjects: stages.Completed,
    archivedProjects: stages.Archived,
    overdueProjects: projects.filter((project) => {
      const deadline = project.deadline ? new Date(project.deadline) : null;
      return deadline && !Number.isNaN(deadline.getTime()) && deadline < today && getProjectStage(project) !== "Completed";
    }).length,
    upcomingMeetings: dataset.communications.filter((item) => String(item.type || "").toLowerCase() === "meeting").length,
    productivity: tasks.length ? Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length) : 0,
    revenue: projects.reduce((sum, project) => sum + Number(project.budget || 0), 0),
    microsoftReadyUsers: countMicrosoftReadyUsers(users),
    linkedDocuments: projects.reduce((sum, project) => sum + getProjectDocumentCount(project), 0),
    managerLoad: managers,
    memberLoad: members,
  };
}

window.getAdminDataset = getAdminDataset;
window.fetchAdminIntegrationStatus = fetchAdminIntegrationStatus;
window.getAdminIntegrationStatus = getAdminIntegrationStatus;
window.getAdminClients = getAdminClients;
window.normalizeAdminRole = normalizeAdminRole;
window.escapeAdminHtml = escapeAdminHtml;
window.formatAdminCurrency = formatAdminCurrency;
window.formatAdminDate = formatAdminDate;
window.formatAdminDateTime = formatAdminDateTime;
window.getProjectStage = getProjectStage;
window.getProjectDocumentCount = getProjectDocumentCount;
window.getProjectMicrosoftSummary = getProjectMicrosoftSummary;
window.getProjectHealth = getProjectHealth;
window.getUserMicrosoftSummary = getUserMicrosoftSummary;
window.getMicrosoftServiceReadiness = getMicrosoftServiceReadiness;
window.getManagerAnalytics = getManagerAnalytics;
window.getMemberAnalytics = getMemberAnalytics;
window.getUserProfileSnapshot = getUserProfileSnapshot;
window.getUpcomingCommunicationItems = getUpcomingCommunicationItems;
window.getAdminDashboardMetrics = getAdminDashboardMetrics;
