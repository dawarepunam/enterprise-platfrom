const ENTERPRISE_KEYS = {
  departments: "enterpriseDepartments",
  users: "enterpriseUsers",
  projects: "enterpriseProjects",
  tasks: "enterpriseTasks",
  subtasks: "enterpriseSubtasks",
  teams: "enterpriseTeams",
  taskUpdates: "enterpriseTaskUpdates",
  leads: "enterpriseLeads",
  campaigns: "enterpriseCampaigns",
  salesDeals: "enterpriseSalesDeals",
  quotations: "enterpriseQuotations",
  attendance: "enterpriseAttendance",
  leaveRequests: "enterpriseLeaveRequests",
  expenses: "enterpriseExpenses",
  timesheets: "enterpriseTimesheets",
  communications: "enterpriseCommunications",
  roles: "enterpriseRoles",
  designations: "enterpriseDesignations",
  branches: "enterpriseBranches",
  holidays: "enterpriseHolidays",
  templates: "enterpriseTemplates",
  archive: "enterpriseArchive",
  clones: "enterpriseClones",
  backups: "enterpriseBackups",
  importExports: "enterpriseImportExports",
  recycleBin: "enterpriseRecycleBin",
};

const ENTERPRISE_API_ENDPOINTS = {
  departments: "/departments",
  users: "/users",
  projects: "/projects",
  tasks: "/tasks",
  subtasks: "/subtasks",
  teams: "/teams",
  taskUpdates: "/task-updates",
  leads: "/leads",
  campaigns: "/campaigns",
  salesDeals: "/sales",
  quotations: "/quotations",
  attendance: "/attendance",
  leaveRequests: "/leave",
  expenses: "/expenses",
  timesheets: "/timesheets",
  notifications: "/notifications",
  communications: "/communication-logs",
};

const ENTERPRISE_ROLE_ACCESS = {
  departments: ["ADMIN", "MANAGER", "PRODUCT_MANAGER"],
  users: ["ADMIN", "MANAGER", "PRODUCT_MANAGER"],
  projects: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "CLIENT"],
  tasks: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"],
  subtasks: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"],
  teams: ["ADMIN", "MANAGER", "TEAM_LEAD"],
  taskUpdates: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "CLIENT"],
  leads: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "MARKETING", "SALES"],
  campaigns: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "MARKETING"],
  salesDeals: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "SALES"],
  quotations: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CLIENT"],
  attendance: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "HR"],
  leaveRequests: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "HR"],
  expenses: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "HR"],
  timesheets: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "HR"],
  notifications: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "SALES", "HR", "CLIENT"],
  communications: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "SALES", "HR", "CLIENT"],
  roles: ["ADMIN"],
  designations: ["ADMIN", "HR"],
  branches: ["ADMIN", "MANAGER", "HR"],
  holidays: ["ADMIN", "HR", "MANAGER"],
  templates: ["ADMIN", "MANAGER", "TEAM_LEAD"],
  archive: ["ADMIN", "MANAGER"],
  clones: ["ADMIN", "MANAGER"],
  backups: ["ADMIN"],
  importExports: ["ADMIN", "MANAGER"],
  recycleBin: ["ADMIN"],
};

const ENTERPRISE_SEED = {
  departments: [],
  users: [
    { _id: "usr-1", name: "Aarav Kulkarni", email: "admin@enterprise.local", role: "ADMIN", department: "Executive", status: "ACTIVE", profilePhoto: "../../../assets/images/default-avatar.png" },
    { _id: "usr-2", name: "Neha Patil", email: "neha.manager@enterprise.local", role: "MANAGER", department: "Development", status: "ACTIVE", profilePhoto: "../../../assets/images/default-avatar.png" },
    { _id: "usr-pm-1", name: "Rahul Sharma", email: "product.manager@enterprise.local", role: "PRODUCT_MANAGER", department: "Product", status: "ACTIVE", profilePhoto: "../../../assets/images/default-avatar.png" },
    { _id: "usr-3", name: "Rohan Shinde", email: "rohan.lead@enterprise.local", role: "TEAM_LEAD", department: "Development", status: "ACTIVE", profilePhoto: "../../../assets/images/default-avatar.png" },
    { _id: "usr-4", name: "Priya Joshi", email: "priya.member@enterprise.local", role: "MEMBER", department: "Marketing", status: "ACTIVE", profilePhoto: "../../../assets/images/default-avatar.png" },
    { _id: "usr-5", name: "Meera Shah", email: "client@omniretail.com", role: "CLIENT", department: "Client Portal", status: "ACTIVE", profilePhoto: "../../../assets/images/default-avatar.png" },
    { _id: "usr-6", name: "Aditya Kale", email: "sales.rep@enterprise.local", role: "MEMBER", department: "Sales", status: "BLOCKED", profilePhoto: "../../../assets/images/default-avatar.png" },
    { _id: "usr-7", name: "Kavya Rao", email: "marketing@enterprise.local", role: "MARKETING", department: "Marketing", status: "ACTIVE", profilePhoto: "../../../assets/images/default-avatar.png" },
  ],
  projects: [
    {
      _id: "prj-1",
      projectName: "OmniRetail ERP Rollout",
      department: "Development",
      clientName: "OmniRetail",
      manager: "Neha Patil",
      budget: 1800000,
      priority: "High",
      status: "Active",
      progress: 72,
      startDate: "2026-04-05",
      deadline: "2026-06-15",
      description: "ERP, CRM and HRMS integration for multi-branch retail operations.",
    },
    {
      _id: "prj-2",
      projectName: "PixelNest Lead Engine",
      department: "Marketing",
      clientName: "PixelNest",
      manager: "Neha Patil",
      budget: 640000,
      priority: "Medium",
      status: "Planning",
      progress: 18,
      startDate: "2026-05-01",
      deadline: "2026-07-01",
      description: "Performance campaigns, landing pages and CRM automation setup.",
    },
    {
      _id: "prj-3",
      projectName: "FinCore Client Portal",
      department: "Support",
      clientName: "FinCore",
      manager: "Neha Patil",
      budget: 920000,
      priority: "Critical",
      status: "On Hold",
      progress: 43,
      startDate: "2026-03-11",
      deadline: "2026-05-30",
      description: "Secure approvals, reporting and live ticket collaboration experience.",
    },
    {
      _id: "prj-4",
      projectName: "SkyReach Sales CRM",
      department: "Sales",
      clientName: "SkyReach",
      manager: "Neha Patil",
      budget: 1250000,
      priority: "High",
      status: "Completed",
      progress: 100,
      startDate: "2026-02-01",
      deadline: "2026-04-29",
      description: "Lead tracking, call logs, quotation flow and conversion analytics.",
    },
  ],
  tasks: [
    { _id: "tsk-1", projectId: "prj-1", projectName: "OmniRetail ERP Rollout", title: "UI Design", department: "Development", manager: "Neha Patil", lead: "Rohan Shinde", assignee: "Priya Joshi", priority: "High", status: "In Review", deadline: "2026-05-19", progress: 84 },
    { _id: "tsk-2", projectId: "prj-1", projectName: "OmniRetail ERP Rollout", title: "Backend API", department: "Development", manager: "Neha Patil", lead: "Rohan Shinde", assignee: "Priya Joshi", priority: "Critical", status: "Active", deadline: "2026-05-22", progress: 61 },
    { _id: "tsk-3", projectId: "prj-1", projectName: "OmniRetail ERP Rollout", title: "Database", department: "Development", manager: "Neha Patil", lead: "Rohan Shinde", assignee: "Priya Joshi", priority: "High", status: "Planning", deadline: "2026-05-26", progress: 28 },
    { _id: "tsk-4", projectId: "prj-2", projectName: "PixelNest Lead Engine", title: "Landing Page Build", department: "Marketing", manager: "Neha Patil", lead: "Rohan Shinde", assignee: "Priya Joshi", priority: "Medium", status: "Active", deadline: "2026-05-25", progress: 44 },
    { _id: "tsk-5", projectId: "prj-3", projectName: "FinCore Client Portal", title: "Client Approval Workflow", department: "Support", manager: "Neha Patil", lead: "Rohan Shinde", assignee: "Priya Joshi", priority: "High", status: "Pending", deadline: "2026-05-16", progress: 53 },
    { _id: "tsk-6", projectId: "prj-4", projectName: "SkyReach Sales CRM", title: "UAT Signoff", department: "Sales", manager: "Neha Patil", lead: "Rohan Shinde", assignee: "Priya Joshi", priority: "Low", status: "Completed", deadline: "2026-04-28", progress: 100 },
  ],
  subtasks: [
    { _id: "sub-1", taskId: "tsk-1", title: "Navbar", assignee: "Priya Joshi", status: "Approved" },
    { _id: "sub-2", taskId: "tsk-1", title: "Sidebar", assignee: "Priya Joshi", status: "Approved" },
    { _id: "sub-3", taskId: "tsk-1", title: "Dashboard UI", assignee: "Priya Joshi", status: "In Review" },
    { _id: "sub-4", taskId: "tsk-2", title: "Auth Endpoint", assignee: "Priya Joshi", status: "Active" },
    { _id: "sub-5", taskId: "tsk-2", title: "Task Endpoint", assignee: "Priya Joshi", status: "Pending" },
  ],
  teams: [
    { _id: "team-1", name: "OmniRetail Delivery Squad", projectName: "OmniRetail ERP Rollout", manager: "Neha Patil", teamLead: "Rohan Shinde", department: "Development", status: "Active", members: ["Priya Joshi"], skills: ["Frontend", "Backend", "QA"] },
    { _id: "team-2", name: "PixelNest Growth Pod", projectName: "PixelNest Lead Engine", manager: "Neha Patil", teamLead: "Rohan Shinde", department: "Marketing", status: "Planning", members: ["Priya Joshi"], skills: ["Campaigns", "Landing Pages", "SEO"] },
  ],
  taskUpdates: [
    { _id: "upd-1", taskId: "tsk-1", author: "Priya Joshi", role: "MEMBER", updateType: "Submission", status: "Submitted", progress: 84, summary: "Responsive dashboard screens submitted for review.", feedback: "" },
    { _id: "upd-2", taskId: "tsk-1", author: "Rohan Shinde", role: "TEAM_LEAD", updateType: "Review", status: "Reviewed", progress: 84, summary: "Review completed with minor alignment notes.", feedback: "Refine mobile spacing and label balance." },
  ],
  leads: [
    { _id: "lead-1", source: "Meta Ads", company: "Bharat Textiles", contact: "Amit Shah", owner: "Sales Desk", status: "New", value: 180000 },
    { _id: "lead-2", source: "SEO", company: "Nova Retail", contact: "Ritu Jain", owner: "Sales Desk", status: "Contacted", value: 320000 },
    { _id: "lead-3", source: "LinkedIn", company: "PixelNest", contact: "Rahul Gupta", owner: "Sales Desk", status: "Interested", value: 540000 },
    { _id: "lead-4", source: "Referral", company: "FinCore", contact: "Sonal Verma", owner: "Sales Desk", status: "Negotiation", value: 820000 },
    { _id: "lead-5", source: "Google Ads", company: "SkyReach", contact: "Nina Bose", owner: "Sales Desk", status: "Converted", value: 1250000 },
  ],
  campaigns: [
    { _id: "cmp-1", name: "Meta Lead Sprint", channel: "Meta Ads", owner: "Kavya Rao", status: "Active", spend: 120000, roi: 4.2, generatedLeads: 42 },
    { _id: "cmp-2", name: "Search Growth Loop", channel: "Google Ads", owner: "Kavya Rao", status: "Planning", spend: 95000, roi: 3.6, generatedLeads: 18 },
    { _id: "cmp-3", name: "SEO Authority Push", channel: "SEO", owner: "Kavya Rao", status: "Active", spend: 45000, roi: 5.1, generatedLeads: 26 },
  ],
  salesDeals: [
    { _id: "sale-1", company: "Bharat Textiles", contact: "Amit Shah", owner: "Sales Desk", stage: "Negotiation", expectedValue: 180000, closedValue: 0, quotationStatus: "Pending" },
    { _id: "sale-2", company: "SkyReach", contact: "Nina Bose", owner: "Sales Desk", stage: "Converted", expectedValue: 1250000, closedValue: 1250000, quotationStatus: "Approved" },
    { _id: "sale-3", company: "Nova Retail", contact: "Ritu Jain", owner: "Sales Desk", stage: "Interested", expectedValue: 320000, closedValue: 0, quotationStatus: "Pending" },
  ],
  quotations: [
    { _id: "qt-1", projectId: "prj-1", client: "OmniRetail", title: "ERP Phase 2 Quotation", amount: 380000, status: "Pending", owner: "Neha Patil", dueDate: "2026-05-18" },
    { _id: "qt-2", projectId: "prj-3", client: "FinCore", title: "Client Portal Revision", amount: 240000, status: "Approved", owner: "Neha Patil", dueDate: "2026-05-14" },
    { _id: "qt-3", projectId: "prj-2", client: "PixelNest", title: "Campaign Expansion Proposal", amount: 125000, status: "Rejected", owner: "Neha Patil", dueDate: "2026-05-12" },
  ],
  attendance: [
    { _id: "att-1", userName: "Priya Joshi", role: "MEMBER", projectName: "OmniRetail ERP Rollout", date: "2026-05-13", status: "Present", hours: 8.5 },
    { _id: "att-2", userName: "Rohan Shinde", role: "TEAM_LEAD", projectName: "OmniRetail ERP Rollout", date: "2026-05-13", status: "Present", hours: 9 },
    { _id: "att-3", userName: "Kavya Rao", role: "MEMBER", projectName: "PixelNest Lead Engine", date: "2026-05-13", status: "Present", hours: 7.5 },
  ],
  leaveRequests: [
    { _id: "lv-1", employee: "Priya Joshi", role: "MEMBER", projectName: "OmniRetail ERP Rollout", fromDate: "2026-05-18", toDate: "2026-05-19", reason: "Personal work", status: "Pending" },
    { _id: "lv-2", employee: "Kavya Rao", role: "MEMBER", projectName: "PixelNest Lead Engine", fromDate: "2026-05-20", toDate: "2026-05-20", reason: "Medical appointment", status: "Pending" },
  ],
  expenses: [
    { _id: "exp-1", employee: "Priya Joshi", projectName: "OmniRetail ERP Rollout", amount: 3200, category: "Travel", receipt: "Uploaded", purpose: "Client visit", status: "Pending" },
    { _id: "exp-2", employee: "Rohan Shinde", projectName: "OmniRetail ERP Rollout", amount: 1800, category: "Tools", receipt: "Uploaded", purpose: "UI testing subscription", status: "Approved" },
  ],
  timesheets: [
    { _id: "time-1", employee: "Priya Joshi", projectName: "OmniRetail ERP Rollout", taskTitle: "UI Design", hours: 8, productivity: "High", status: "Pending" },
    { _id: "time-2", employee: "Rohan Shinde", projectName: "OmniRetail ERP Rollout", taskTitle: "Review Loop", hours: 6.5, productivity: "Good", status: "Approved" },
    { _id: "time-3", employee: "Kavya Rao", projectName: "PixelNest Lead Engine", taskTitle: "Campaign Setup", hours: 7, productivity: "Good", status: "Pending" },
  ],
  communications: [
    { _id: "com-1", type: "Meeting", title: "OmniRetail Daily Standup", projectName: "OmniRetail ERP Rollout", owner: "Neha Patil", status: "Completed", time: "2026-05-13 10:00 AM", note: "API blockers discussed and reassignment done." },
    { _id: "com-2", type: "Call", title: "Client Alignment Call", projectName: "PixelNest Lead Engine", owner: "Neha Patil", status: "Scheduled", time: "2026-05-13 04:30 PM", note: "Review campaign landing page and lead quality." },
  ],
  roles: [
    { _id: "role-1", name: "Admin", code: "ADMIN", scope: "Global", members: 1, status: "Active", permissions: ["users.manage", "projects.manage", "settings.manage", "analytics.view"] },
    { _id: "role-2", name: "Manager", code: "MANAGER", scope: "Delivery", members: 1, status: "Active", permissions: ["projects.manage", "tasks.assign", "reports.view", "approvals.review"] },
    { _id: "role-pm-1", name: "Product Manager", code: "PRODUCT_MANAGER", scope: "Discovery", members: 1, status: "Active", permissions: ["requirements.manage", "estimations.manage", "approvals.review", "reports.view"] },
    { _id: "role-3", name: "Team Lead", code: "TEAM_LEAD", scope: "Execution", members: 1, status: "Active", permissions: ["subtasks.manage", "updates.review", "timesheets.review"] },
  ],
  designations: [
    { _id: "des-1", title: "Delivery Manager", level: "L4", department: "Development", reportingTo: "Admin", openings: 1, status: "Active" },
    { _id: "des-2", title: "Senior UI Engineer", level: "L2", department: "Development", reportingTo: "Delivery Manager", openings: 2, status: "Active" },
    { _id: "des-3", title: "Growth Executive", level: "L1", department: "Marketing", reportingTo: "Delivery Manager", openings: 1, status: "Hiring" },
  ],
  branches: [
    { _id: "br-1", name: "Pune HQ", code: "PNQ-HQ", city: "Pune", timezone: "IST", manager: "Aarav Kulkarni", departments: 5, status: "Operational" },
    { _id: "br-2", name: "Mumbai Client Studio", code: "BOM-CS", city: "Mumbai", timezone: "IST", manager: "Neha Patil", departments: 3, status: "Scaling" },
  ],
  holidays: [
    { _id: "hol-1", title: "Maharashtra Day", date: "2026-05-01", branch: "All Branches", type: "Public Holiday", impact: "Medium", status: "Published" },
    { _id: "hol-2", title: "Quarterly Recharge Friday", date: "2026-06-12", branch: "Pune HQ", type: "Internal Holiday", impact: "Low", status: "Draft" },
  ],
  templates: [
    { _id: "tpl-1", name: "ERP Rollout Blueprint", category: "Delivery", basedOn: "OmniRetail ERP Rollout", owner: "Neha Patil", usageCount: 4, status: "Ready" },
    { _id: "tpl-2", name: "Lead Engine Sprint", category: "Marketing", basedOn: "PixelNest Lead Engine", owner: "Kavya Rao", usageCount: 2, status: "Ready" },
  ],
  archive: [
    { _id: "arc-1", name: "SkyReach Sales CRM", category: "Project", archivedOn: "2026-04-30", owner: "Neha Patil", reason: "Completed rollout", status: "Archived" },
  ],
  clones: [
    { _id: "cln-1", name: "OmniRetail ERP Rollout v2", source: "ERP Rollout Blueprint", owner: "Neha Patil", targetDepartment: "Development", status: "Prepared" },
  ],
  backups: [
    { _id: "bkp-1", name: "Nightly Snapshot", frequency: "Daily", lastRun: "2026-05-13T23:45:00.000Z", retention: "30 days", status: "Healthy" },
    { _id: "bkp-2", name: "Weekly Offsite Backup", frequency: "Weekly", lastRun: "2026-05-11T03:15:00.000Z", retention: "180 days", status: "Queued" },
  ],
  importExports: [
    { _id: "imx-1", name: "Client Master Import", type: "Import", format: "CSV", owner: "Aarav Kulkarni", lastRun: "2026-05-12T10:30:00.000Z", status: "Completed" },
    { _id: "imx-2", name: "Revenue Pack Export", type: "Export", format: "XLSX", owner: "Neha Patil", lastRun: "2026-05-13T18:10:00.000Z", status: "Completed" },
  ],
  recycleBin: [
    { _id: "bin-1", name: "Legacy Support Template", category: "Template", deletedOn: "2026-05-10T12:30:00.000Z", deletedBy: "Aarav Kulkarni", recoverableUntil: "2026-05-25", status: "Recoverable" },
  ],
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function getCurrentEnterpriseRole() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return String(user?.role || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
  } catch (error) {
    return "";
  }
}

function ensureSeed(key) {
  migrateLegacyDepartmentSeed();
  // Seed local demo data so the enterprise flow remains usable without a live backend.
  if (!getStorageItem(ENTERPRISE_KEYS[key])) {
    localStorage.setItem(ENTERPRISE_KEYS[key], JSON.stringify(ENTERPRISE_SEED[key]));
  }
}

function migrateLegacyDepartmentSeed() {
  const storageKey = ENTERPRISE_KEYS.departments;
  const raw = getStorageItem(storageKey);
  if (!raw) return;

  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length !== 5) return;

    const legacyIds = ["dep-1", "dep-2", "dep-3", "dep-4", "dep-5"];
    const isLegacySeed = legacyIds.every((id, index) => items[index]?._id === id);

    if (isLegacySeed) {
      localStorage.setItem(storageKey, JSON.stringify([]));
    }
  } catch (error) {
    // Ignore malformed legacy data and keep current storage intact.
  }
}

function getCollection(key) {
  ensureSeed(key);

  try {
    return JSON.parse(localStorage.getItem(ENTERPRISE_KEYS[key]) || "[]");
  } catch (error) {
    return cloneData(ENTERPRISE_SEED[key]);
  }
}

function saveCollection(key, items) {
  const previous = getCollection(key);
  localStorage.setItem(ENTERPRISE_KEYS[key], JSON.stringify(items));
  syncCollectionToBackend(key, items, previous);
  return items;
}

function upsertRecord(key, record) {
  const items = getCollection(key);
  const nextRecord = {
    ...record,
    _id: record._id || `${key}-${Date.now()}`,
  };
  const index = items.findIndex((item) => item._id === nextRecord._id);

  if (index >= 0) {
    items[index] = nextRecord;
  } else {
    items.unshift(nextRecord);
  }

  saveCollection(key, items);
  syncRecordToBackend(key, nextRecord);
  return nextRecord;
}

function deleteRecord(key, id) {
  const currentItems = getCollection(key);
  const removed = currentItems.find((item) => item._id === id);
  const items = currentItems.filter((item) => item._id !== id);
  saveCollection(key, items);
  syncDeleteToBackend(key, removed || { _id: id });
  return items;
}

function getRoleUsers(role) {
  const users = getCollection("users");
  return users.filter((user) => String(user.role || "").toUpperCase() === role);
}

function getDashboardSnapshot() {
  // Build a lightweight executive summary from the same data used by admin modules.
  const users = getCollection("users");
  const projects = getCollection("projects");
  const departments = getCollection("departments");
  const tasks = getCollection("tasks");
  const leads = getCollection("leads");

  const totalRevenue = projects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
  const activeTasks = tasks.filter((task) => task.status === "Active").length;
  const delayedTasks = tasks.filter((task) => task.status === "Pending" || task.status === "On Hold").length;
  const pendingLeads = leads.filter((lead) => lead.status !== "Converted" && lead.status !== "Lost").length;

  return {
    totalUsers: users.length,
    totalDepartments: departments.length,
    totalProjects: projects.length,
    totalRevenue,
    activeTasks,
    delayedTasks,
    pendingLeads,
    conversionRate: 37,
    productivityScore: 91,
    recentUsers: users.slice(0, 5),
    recentProjects: projects.slice(0, 5),
    roleFlow: [
      "Admin creates departments, users and client-ready projects.",
      "Manager breaks project scope into tasks, timelines and teams.",
      "Team lead converts tasks into micro-deliverables and reviews output.",
      "Members execute work, upload proofs and update progress.",
      "Sales and marketing move leads through conversion and approvals.",
    ],
  };
}

function getManagerSnapshot() {
  const projects = getCollection("projects");
  const tasks = getCollection("tasks");
  const quotations = getCollection("quotations");
  const leads = getCollection("leads");

  return {
    activeProjects: projects.filter((project) => project.status === "Active").length,
    planningProjects: projects.filter((project) => project.status === "Planning").length,
    reviewTasks: tasks.filter((task) => task.status === "In Review" || task.status === "Pending").length,
    approvals: quotations.filter((quotation) => quotation.status === "Pending").length,
    teamLeads: getRoleUsers("TEAM_LEAD").length,
    members: getRoleUsers("MEMBER").length,
    projects,
    tasks,
    quotations,
    leads,
    flow: [
      "Receive project from admin with budget, deadline and manager ownership.",
      "Break delivery into tasks and assign a responsible team lead.",
      "Track approval queue, blockers and delayed work.",
      "Keep clients and revenue decisions aligned with execution progress.",
    ],
  };
}

function getLeadSnapshot() {
  const leads = getCollection("leads");
  return {
    total: leads.length,
    newCount: leads.filter((lead) => lead.status === "New").length,
    activeCount: leads.filter((lead) => !["Converted", "Lost"].includes(lead.status)).length,
    convertedCount: leads.filter((lead) => lead.status === "Converted").length,
    pipelineValue: leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0),
    leads,
  };
}

function getTeamLeadSnapshot() {
  const tasks = getCollection("tasks");
  const subtasks = getCollection("subtasks");
  return {
    taskCount: tasks.length,
    activeReviews: tasks.filter((task) => task.status === "In Review").length,
    activeSubtasks: subtasks.filter((subtask) => subtask.status !== "Approved").length,
    approvedSubtasks: subtasks.filter((subtask) => subtask.status === "Approved").length,
    tasks,
    subtasks,
    flow: [
      "Receive macro tasks from the manager.",
      "Split each task into UI, backend, testing or proof-based subtasks.",
      "Assign members, review updates and return feedback when needed.",
    ],
  };
}

function getMemberSnapshot() {
  const tasks = getCollection("tasks");
  const myTasks = tasks.filter((task) => task.assignee === "Priya Joshi");
  return {
    myTasks,
    activeCount: myTasks.filter((task) => task.status === "Active").length,
    reviewCount: myTasks.filter((task) => task.status === "In Review").length,
    completedCount: myTasks.filter((task) => task.status === "Completed").length,
    dueSoon: myTasks.filter((task) => task.status !== "Completed").slice(0, 3),
  };
}

function getMarketingSnapshot() {
  const leads = getCollection("leads");
  const projects = getCollection("projects").filter((project) => project.department === "Marketing");
  return {
    campaigns: [
      { name: "Meta Lead Sprint", channel: "Meta Ads", spend: 120000, roi: 4.2, status: "Active" },
      { name: "Search Growth Loop", channel: "Google Ads", spend: 95000, roi: 3.6, status: "Planning" },
      { name: "SEO Authority Push", channel: "SEO", spend: 45000, roi: 5.1, status: "Active" },
    ],
    totalLeads: leads.length,
    qualifiedLeads: leads.filter((lead) => ["Interested", "Negotiation", "Converted"].includes(lead.status)).length,
    spend: 260000,
    roi: 4.3,
    linkedProjects: projects,
  };
}

function getSalesSnapshot() {
  const leads = getCollection("leads");
  const convertedRevenue = leads
    .filter((lead) => lead.status === "Converted")
    .reduce((sum, lead) => sum + Number(lead.value || 0), 0);

  return {
    openPipeline: leads.filter((lead) => !["Converted", "Lost"].includes(lead.status)).length,
    convertedDeals: leads.filter((lead) => lead.status === "Converted").length,
    followUps: leads.filter((lead) => ["Contacted", "Interested", "Negotiation"].includes(lead.status)).length,
    convertedRevenue,
    leads,
  };
}

function getClientSnapshot() {
  const projects = getCollection("projects").filter((project) => project.clientName === "OmniRetail" || project.clientName === "FinCore");
  const quotations = getCollection("quotations").filter((quotation) => ["OmniRetail", "FinCore"].includes(quotation.client));
  return {
    projects,
    quotations,
    approvalsNeeded: quotations.filter((quotation) => quotation.status === "Pending").length,
    approvedCount: quotations.filter((quotation) => quotation.status === "Approved").length,
  };
}

function getManagerApprovalSnapshot() {
  const leaveRequests = getCollection("leaveRequests");
  const expenses = getCollection("expenses");
  const timesheets = getCollection("timesheets");
  const quotations = getCollection("quotations");

  return {
    leaveRequests,
    expenses,
    timesheets,
    quotations,
    pendingLeave: leaveRequests.filter((item) => item.status === "Pending").length,
    pendingExpenses: expenses.filter((item) => item.status === "Pending").length,
    pendingTimesheets: timesheets.filter((item) => item.status === "Pending").length,
    pendingQuotations: quotations.filter((item) => item.status === "Pending").length,
  };
}

function getManagerOperationsSnapshot() {
  const attendance = getCollection("attendance");
  const communications = getCollection("communications");
  const approvals = getManagerApprovalSnapshot();

  return {
    attendance,
    communications,
    approvals,
    presentToday: attendance.filter((item) => item.status === "Present").length,
    avgHours:
      attendance.length > 0
        ? Math.round((attendance.reduce((sum, item) => sum + Number(item.hours || 0), 0) / attendance.length) * 10) / 10
        : 0,
    meetingsCount: communications.filter((item) => item.type === "Meeting").length,
    callsCount: communications.filter((item) => item.type === "Call").length,
  };
}

function getEnterpriseOverview() {
  const users = getCollection("users");
  const departments = getCollection("departments");
  const projects = getCollection("projects");
  const tasks = getCollection("tasks");
  const subtasks = getCollection("subtasks");
  const teams = getCollection("teams");
  const taskUpdates = getCollection("taskUpdates");
  const leads = getCollection("leads");
  const campaigns = getCollection("campaigns");
  const salesDeals = getCollection("salesDeals");
  const quotations = getCollection("quotations");
  const roles = getCollection("roles");
  const designations = getCollection("designations");
  const branches = getCollection("branches");
  const holidays = getCollection("holidays");
  const templates = getCollection("templates");
  const archive = getCollection("archive");
  const clones = getCollection("clones");
  const backups = getCollection("backups");
  const importExports = getCollection("importExports");
  const recycleBin = getCollection("recycleBin");

  return {
    summary: {
      totalUsers: users.length,
      totalDepartments: departments.length,
      totalProjects: projects.length,
      activeProjects: projects.filter((item) => item.status === "Active").length,
      totalTasks: tasks.length,
      delayedTasks: tasks.filter((item) => ["Pending", "On Hold", "Rejected"].includes(item.status)).length,
      totalSubtasks: subtasks.length,
      totalTeams: teams.length,
      totalTaskUpdates: taskUpdates.length,
      totalLeads: leads.length,
      totalCampaigns: campaigns.length,
      totalSalesDeals: salesDeals.length,
      pendingQuotations: quotations.filter((item) => item.status === "Pending").length,
      totalRoles: roles.length,
      totalDesignations: designations.length,
      totalBranches: branches.length,
      totalHolidays: holidays.length,
      totalTemplates: templates.length,
      totalArchived: archive.length,
      totalClones: clones.length,
      totalBackups: backups.length,
      totalImports: importExports.length,
      recycleItems: recycleBin.length,
      revenue: salesDeals.reduce((sum, item) => sum + Number(item.closedValue || 0), 0),
      projectedPipeline: leads.reduce((sum, item) => sum + Number(item.value || 0), 0),
    },
    flow: [
      { role: "ADMIN", responsibility: "Creates departments, users, projects and governance settings.", handoff: "Project and ownership move to the manager." },
      { role: "MANAGER", responsibility: "Breaks projects into tasks, creates teams and distributes work.", handoff: "Execution planning moves to the team lead." },
      { role: "TEAM_LEAD", responsibility: "Converts tasks into subtasks, assigns members and reviews submissions.", handoff: "Implementation work moves to team members." },
      { role: "MEMBER", responsibility: "Executes tasks, uploads work, and submits progress updates.", handoff: "Work returns to the lead and manager for review." },
      { role: "MARKETING", responsibility: "Runs campaigns and generates qualified leads.", handoff: "Leads move to the sales pipeline." },
      { role: "SALES", responsibility: "Manages calling, negotiation, quotation and conversion.", handoff: "Converted work and approvals move to the client." },
      { role: "CLIENT", responsibility: "Tracks project progress and approves quotations or deliverables.", handoff: "Status returns to admin analytics and delivery reporting." },
    ],
    collections: {
      users,
      departments,
      projects,
      tasks,
      subtasks,
      teams,
      taskUpdates,
      leads,
      campaigns,
      salesDeals,
      quotations,
      roles,
      designations,
      branches,
      holidays,
      templates,
      archive,
      clones,
      backups,
      importExports,
      recycleBin,
    },
  };
}

function hasBackendSession() {
  return Boolean(getStorageItem("token")) && typeof apiRequest === "function";
}

function canSyncCollection(key) {
  const allowedRoles = ENTERPRISE_ROLE_ACCESS[key];
  if (!allowedRoles || !allowedRoles.length) return true;
  return allowedRoles.includes(getCurrentEnterpriseRole());
}

function isObjectIdLike(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function getBackendId(record) {
  return record?.metadata?.backendId || (isObjectIdLike(record?._id) ? record._id : "");
}

function normalizeRelationId(value) {
  return isObjectIdLike(value) ? value : undefined;
}

function normalizeStatus(value, fallback = "Pending") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  const canonical = {
    pending: "Pending",
    assigned: "Assigned",
    accepted: "Accepted",
    active: "In Progress",
    "in progress": "In Progress",
    paused: "Paused",
    "in review": "Submitted for Review",
    submitted: "Submitted",
    "submitted for review": "Submitted for Review",
    approved: "Approved",
    rejected: "Rejected",
    reviewed: "Reviewed",
    completed: "Completed",
    archived: "Archived",
    planning: "Planning",
    "on hold": "On Hold",
    present: "Present",
    absent: "Absent",
  };

  return canonical[raw.toLowerCase()] || raw;
}

function normalizeRecordForBackend(key, record) {
  const payload = cloneData(record || {});
  const clientId = String(payload._id || payload.clientId || "");

  delete payload._id;

  if (payload.metadata && payload.metadata.backendId) {
    delete payload.metadata.backendId;
  }

  payload.clientId = clientId;

  if ("projectId" in payload && !isObjectIdLike(payload.projectId)) {
    payload.clientProjectId = String(payload.projectId || "");
    delete payload.projectId;
  }

  if ("taskId" in payload && !isObjectIdLike(payload.taskId)) {
    payload.clientTaskId = String(payload.taskId || "");
    delete payload.taskId;
  }

  if ("subtaskId" in payload && !isObjectIdLike(payload.subtaskId)) {
    payload.clientSubtaskId = String(payload.subtaskId || "");
    delete payload.subtaskId;
  }

  if ("teamId" in payload && !isObjectIdLike(payload.teamId)) {
    payload.clientTeamId = String(payload.teamId || "");
    delete payload.teamId;
  }

  if (Array.isArray(payload.memberIds)) {
    payload.clientMemberIds = payload.memberIds.map((item) => String(item));
    payload.memberIds = payload.memberIds.map(normalizeRelationId).filter(Boolean);
  }

  if (Array.isArray(payload.attachments)) {
    payload.attachments = payload.attachments.filter(Boolean);
  }

  if (!payload.metadata || typeof payload.metadata !== "object") {
    payload.metadata = {};
  }

  payload.metadata.clientId = clientId;

  if (key === "tasks") {
    payload.title = payload.title || payload.taskTitle || "Untitled Task";
    payload.status = normalizeStatus(payload.status, "Assigned");
  }

  if (key === "subtasks") {
    payload.title = payload.title || "Untitled Subtask";
    payload.status = normalizeStatus(payload.status, "Assigned");
  }

  if (key === "taskUpdates") {
    payload.status = normalizeStatus(payload.status, "Reported");
  }

  if (key === "projects") {
    payload.status = payload.status || "Planning";
  }

  if (["attendance", "leaveRequests", "expenses", "timesheets", "quotations", "salesDeals", "communications"].includes(key)) {
    payload.status = normalizeStatus(payload.status, payload.status || "Pending");
  }

  if (key === "communications") {
    payload.type = payload.type || payload.communicationType || "Call";
    payload.communicationType = String(payload.type || "Call").toUpperCase() === "MEETING" || String(payload.type || "").toLowerCase() === "meeting"
      ? "MEETING"
      : "CALL";
  }

  return payload;
}

async function syncRecordToBackend(key, record) {
  if (!hasBackendSession() || !canSyncCollection(key)) return;

  const endpoint = ENTERPRISE_API_ENDPOINTS[key];
  if (!endpoint) return;

  const backendId = getBackendId(record);
  const payload = normalizeRecordForBackend(key, record);

  try {
    const response = backendId
      ? await apiRequest(`${endpoint}/${backendId}`, { method: "PUT", body: payload })
      : await apiRequest(endpoint, { method: "POST", body: payload });

    const saved = response?.data;
    if (!saved?._id) return;

    const items = getCollection(key);
    const index = items.findIndex((item) => item._id === record._id);
    if (index >= 0) {
      items[index] = {
        ...items[index],
        metadata: {
          ...(items[index].metadata || {}),
          backendId: saved._id,
          syncedAt: new Date().toISOString(),
        },
      };
      localStorage.setItem(ENTERPRISE_KEYS[key], JSON.stringify(items));
    }
  } catch (error) {
    // Keep local-first UX intact if backend sync is temporarily unavailable.
  }
}

async function syncDeleteToBackend(key, record) {
  if (!hasBackendSession() || !canSyncCollection(key)) return;

  const endpoint = ENTERPRISE_API_ENDPOINTS[key];
  const backendId = getBackendId(record);
  if (!endpoint || !backendId) return;

  try {
    await apiRequest(`${endpoint}/${backendId}`, { method: "DELETE" });
  } catch (error) {
    // Ignore sync delete failures to preserve local continuity.
  }
}

function syncCollectionToBackend(key, items, previousItems = []) {
  if (!hasBackendSession() || !canSyncCollection(key)) return;

  const previousIds = new Set(previousItems.map((item) => item._id));
  const nextIds = new Set(items.map((item) => item._id));

  items.forEach((item) => {
    syncRecordToBackend(key, item);
  });

  previousItems
    .filter((item) => !nextIds.has(item._id) && previousIds.has(item._id))
    .forEach((item) => {
      syncDeleteToBackend(key, item);
    });
}

async function bootstrapBackendMirror() {
  if (!hasBackendSession()) return;
  if (sessionStorage.getItem("enterpriseBackendBootstrap") === "done") return;

  sessionStorage.setItem("enterpriseBackendBootstrap", "done");

  for (const key of Object.keys(ENTERPRISE_API_ENDPOINTS)) {
    if (!canSyncCollection(key)) continue;
    const items = getCollection(key);
    items.forEach((item) => {
      syncRecordToBackend(key, item);
    });
  }
}

async function hydrateEnterpriseBackendCollections(keys = Object.keys(ENTERPRISE_API_ENDPOINTS)) {
  if (!hasBackendSession()) {
    return { hydrated: false, reason: "no-session" };
  }

  const requestedKeys = keys.filter((key) => ENTERPRISE_KEYS[key] && ENTERPRISE_API_ENDPOINTS[key] && canSyncCollection(key));
  const results = await Promise.allSettled(
    requestedKeys.map(async (key) => {
      const response = await apiRequest(ENTERPRISE_API_ENDPOINTS[key]);
      const items = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      localStorage.setItem(ENTERPRISE_KEYS[key], JSON.stringify(items));
      return { key, count: items.length };
    }),
  );

  return {
    hydrated: results.some((result) => result.status === "fulfilled"),
    results,
  };
}

window.enterpriseStore = {
  getDepartments: () => cloneData(getCollection("departments")),
  saveDepartments: (items) => cloneData(saveCollection("departments", items)),
  upsertDepartment: (item) => cloneData(upsertRecord("departments", item)),
  deleteDepartment: (id) => cloneData(deleteRecord("departments", id)),
  getUsers: () => cloneData(getCollection("users")),
  saveUsers: (items) => cloneData(saveCollection("users", items)),
  upsertUser: (item) => cloneData(upsertRecord("users", item)),
  deleteUser: (id) => cloneData(deleteRecord("users", id)),
  getProjects: () => cloneData(getCollection("projects")),
  saveProjects: (items) => cloneData(saveCollection("projects", items)),
  upsertProject: (item) => cloneData(upsertRecord("projects", item)),
  deleteProject: (id) => cloneData(deleteRecord("projects", id)),
  getTasks: () => cloneData(getCollection("tasks")),
  saveTasks: (items) => cloneData(saveCollection("tasks", items)),
  upsertTask: (item) => cloneData(upsertRecord("tasks", item)),
  deleteTask: (id) => cloneData(deleteRecord("tasks", id)),
  getSubtasks: () => cloneData(getCollection("subtasks")),
  saveSubtasks: (items) => cloneData(saveCollection("subtasks", items)),
  upsertSubtask: (item) => cloneData(upsertRecord("subtasks", item)),
  deleteSubtask: (id) => cloneData(deleteRecord("subtasks", id)),
  getTeams: () => cloneData(getCollection("teams")),
  saveTeams: (items) => cloneData(saveCollection("teams", items)),
  upsertTeam: (item) => cloneData(upsertRecord("teams", item)),
  deleteTeam: (id) => cloneData(deleteRecord("teams", id)),
  getTaskUpdates: () => cloneData(getCollection("taskUpdates")),
  saveTaskUpdates: (items) => cloneData(saveCollection("taskUpdates", items)),
  upsertTaskUpdate: (item) => cloneData(upsertRecord("taskUpdates", item)),
  deleteTaskUpdate: (id) => cloneData(deleteRecord("taskUpdates", id)),
  getLeads: () => cloneData(getCollection("leads")),
  saveLeads: (items) => cloneData(saveCollection("leads", items)),
  upsertLead: (item) => cloneData(upsertRecord("leads", item)),
  deleteLead: (id) => cloneData(deleteRecord("leads", id)),
  getCampaigns: () => cloneData(getCollection("campaigns")),
  saveCampaigns: (items) => cloneData(saveCollection("campaigns", items)),
  upsertCampaign: (item) => cloneData(upsertRecord("campaigns", item)),
  deleteCampaign: (id) => cloneData(deleteRecord("campaigns", id)),
  getSalesDeals: () => cloneData(getCollection("salesDeals")),
  saveSalesDeals: (items) => cloneData(saveCollection("salesDeals", items)),
  upsertSalesDeal: (item) => cloneData(upsertRecord("salesDeals", item)),
  deleteSalesDeal: (id) => cloneData(deleteRecord("salesDeals", id)),
  getQuotations: () => cloneData(getCollection("quotations")),
  saveQuotations: (items) => cloneData(saveCollection("quotations", items)),
  upsertQuotation: (item) => cloneData(upsertRecord("quotations", item)),
  deleteQuotation: (id) => cloneData(deleteRecord("quotations", id)),
  getAttendance: () => cloneData(getCollection("attendance")),
  saveAttendance: (items) => cloneData(saveCollection("attendance", items)),
  upsertAttendance: (item) => cloneData(upsertRecord("attendance", item)),
  deleteAttendance: (id) => cloneData(deleteRecord("attendance", id)),
  getLeaveRequests: () => cloneData(getCollection("leaveRequests")),
  saveLeaveRequests: (items) => cloneData(saveCollection("leaveRequests", items)),
  upsertLeaveRequest: (item) => cloneData(upsertRecord("leaveRequests", item)),
  deleteLeaveRequest: (id) => cloneData(deleteRecord("leaveRequests", id)),
  getExpenses: () => cloneData(getCollection("expenses")),
  saveExpenses: (items) => cloneData(saveCollection("expenses", items)),
  upsertExpense: (item) => cloneData(upsertRecord("expenses", item)),
  deleteExpense: (id) => cloneData(deleteRecord("expenses", id)),
  getTimesheets: () => cloneData(getCollection("timesheets")),
  saveTimesheets: (items) => cloneData(saveCollection("timesheets", items)),
  upsertTimesheet: (item) => cloneData(upsertRecord("timesheets", item)),
  deleteTimesheet: (id) => cloneData(deleteRecord("timesheets", id)),
  getCommunications: () => cloneData(getCollection("communications")),
  saveCommunications: (items) => cloneData(saveCollection("communications", items)),
  upsertCommunication: (item) => cloneData(upsertRecord("communications", item)),
  deleteCommunication: (id) => cloneData(deleteRecord("communications", id)),
  getRoles: () => cloneData(getCollection("roles")),
  saveRoles: (items) => cloneData(saveCollection("roles", items)),
  upsertRole: (item) => cloneData(upsertRecord("roles", item)),
  deleteRole: (id) => cloneData(deleteRecord("roles", id)),
  getDesignations: () => cloneData(getCollection("designations")),
  saveDesignations: (items) => cloneData(saveCollection("designations", items)),
  upsertDesignation: (item) => cloneData(upsertRecord("designations", item)),
  deleteDesignation: (id) => cloneData(deleteRecord("designations", id)),
  getBranches: () => cloneData(getCollection("branches")),
  saveBranches: (items) => cloneData(saveCollection("branches", items)),
  upsertBranch: (item) => cloneData(upsertRecord("branches", item)),
  deleteBranch: (id) => cloneData(deleteRecord("branches", id)),
  getHolidays: () => cloneData(getCollection("holidays")),
  saveHolidays: (items) => cloneData(saveCollection("holidays", items)),
  upsertHoliday: (item) => cloneData(upsertRecord("holidays", item)),
  deleteHoliday: (id) => cloneData(deleteRecord("holidays", id)),
  getTemplates: () => cloneData(getCollection("templates")),
  saveTemplates: (items) => cloneData(saveCollection("templates", items)),
  upsertTemplate: (item) => cloneData(upsertRecord("templates", item)),
  deleteTemplate: (id) => cloneData(deleteRecord("templates", id)),
  getArchive: () => cloneData(getCollection("archive")),
  saveArchive: (items) => cloneData(saveCollection("archive", items)),
  upsertArchive: (item) => cloneData(upsertRecord("archive", item)),
  deleteArchive: (id) => cloneData(deleteRecord("archive", id)),
  getClones: () => cloneData(getCollection("clones")),
  saveClones: (items) => cloneData(saveCollection("clones", items)),
  upsertClone: (item) => cloneData(upsertRecord("clones", item)),
  deleteClone: (id) => cloneData(deleteRecord("clones", id)),
  getBackups: () => cloneData(getCollection("backups")),
  saveBackups: (items) => cloneData(saveCollection("backups", items)),
  upsertBackup: (item) => cloneData(upsertRecord("backups", item)),
  deleteBackup: (id) => cloneData(deleteRecord("backups", id)),
  getImportExports: () => cloneData(getCollection("importExports")),
  saveImportExports: (items) => cloneData(saveCollection("importExports", items)),
  upsertImportExport: (item) => cloneData(upsertRecord("importExports", item)),
  deleteImportExport: (id) => cloneData(deleteRecord("importExports", id)),
  getRecycleBin: () => cloneData(getCollection("recycleBin")),
  saveRecycleBin: (items) => cloneData(saveCollection("recycleBin", items)),
  upsertRecycleBinItem: (item) => cloneData(upsertRecord("recycleBin", item)),
  deleteRecycleBinItem: (id) => cloneData(deleteRecord("recycleBin", id)),
  getDashboardSnapshot,
  getManagerSnapshot,
  getManagerApprovalSnapshot,
  getManagerOperationsSnapshot,
  getLeadSnapshot,
  getTeamLeadSnapshot,
  getMemberSnapshot,
  getMarketingSnapshot,
  getSalesSnapshot,
  getClientSnapshot,
  getEnterpriseOverview,
  hydrateFromBackend: hydrateEnterpriseBackendCollections,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bootstrapBackendMirror();
  });
} else {
  bootstrapBackendMirror();
}
