const ADMIN_MODULE_SECTIONS = [
  {
    label: "Core Flow",
    items: [
      { key: "dashboard", href: "/modules/admin/dashboard/dashboard.html", icon: "DB", title: "Dashboard", status: "ready", keywords: ["home", "kpi", "analytics"] },
      { key: "departments", href: "/modules/admin/departments/departments.html", icon: "DP", title: "Departments", status: "ready", keywords: ["business units", "teams"] },
      { key: "users", href: "/modules/admin/users/users.html", icon: "US", title: "Users", status: "ready", keywords: ["employees", "roles", "onboarding"] },
      { key: "project-managers", href: "/admin/project-managers", icon: "PM", title: "Project Managers", status: "ready", keywords: ["pm", "delivery managers", "workload", "performance"] },
      { key: "clients", href: "/clients", icon: "CL", title: "Clients", status: "ready", keywords: ["crm", "customers", "company"] },
      { key: "projects", href: "/modules/admin/projects/projects.html", icon: "PJ", title: "Projects", status: "ready", keywords: ["delivery", "budget"] },
      { key: "teams-collaboration", href: "/admin/teams.html", icon: "TM", title: "Teams", status: "ready", keywords: ["microsoft teams", "channels", "chat", "collaboration"] },
      { key: "assignments", href: "/modules/admin/tasks/tasks.html", icon: "AS", title: "Assignments", status: "ready", keywords: ["tasks", "allocation"] },
      { key: "communication", href: "/modules/admin/chat/chat.html", icon: "CM", title: "Communication", status: "partial", keywords: ["chat", "meetings", "calls"] },
      { key: "attendance", href: "/modules/admin/attendance/attendance.html", icon: "AT", title: "Attendance", status: "partial", keywords: ["checkin", "report"] },
      { key: "leave", href: "/modules/admin/leave/leave.html", icon: "LV", title: "Leave", status: "partial", keywords: ["approval", "requests"] },
      { key: "reports", href: "/modules/admin/reports/reports.html", icon: "RP", title: "Reports", status: "partial", keywords: ["exports", "performance"] },
    ],
  },
  {
    label: "Organization",
    items: [
      { key: "roles", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=roles", icon: "RL", title: "Roles & Permissions", status: "ready", keywords: ["security", "access"] },
      { key: "designations", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=designations", icon: "DG", title: "Designations", status: "ready", keywords: ["titles", "levels"] },
      { key: "branches", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=branches", icon: "BR", title: "Branches", status: "ready", keywords: ["locations", "offices"] },
      { key: "shifts", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=shifts", icon: "SH", title: "Shifts", status: "partial", keywords: ["timing", "work hours"] },
      { key: "holidays", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=holidays", icon: "HD", title: "Holidays", status: "ready", keywords: ["calendar"] },
    ],
  },
  {
    label: "Control Tower",
    items: [
      { key: "audit", href: "/modules/admin/audit-logs/audit-logs.html", icon: "AL", title: "Audit Logs", status: "ready", keywords: ["history", "tracking"] },
      { key: "login-history", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=login-history", icon: "LH", title: "Login History", status: "partial", keywords: ["device", "sessions"] },
      { key: "templates", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=project-templates", icon: "TP", title: "Project Templates", status: "ready", keywords: ["repeatable"] },
      { key: "archive", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=project-archive", icon: "AR", title: "Project Archive", status: "ready", keywords: ["closed", "past"] },
      { key: "clone", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=project-clone", icon: "PC", title: "Project Clone", status: "ready", keywords: ["duplicate"] },
      { key: "backup", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=backup-restore", icon: "BK", title: "Backup & Restore", status: "ready", keywords: ["recovery"] },
      { key: "import-export", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=import-export", icon: "IE", title: "Import / Export", status: "ready", keywords: ["excel", "csv"] },
      { key: "recycle-bin", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=recycle-bin", icon: "RB", title: "Recycle Bin", status: "ready", keywords: ["deleted"] },
      { key: "escalation", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=escalation-rules", icon: "ER", title: "Escalation Rules", status: "partial", keywords: ["sla", "alerts"] },
      { key: "branding", href: "/modules/admin/enterprise-flow/enterprise-flow.html?module=branding", icon: "BD", title: "Branding", status: "partial", keywords: ["logo", "theme", "email"] },
      { key: "settings", href: "/modules/admin/settings/settings.html", icon: "ST", title: "Settings", status: "partial", keywords: ["system", "preferences"] },
      { key: "analytics", href: "/modules/admin/analytics/analytics.html", icon: "AN", title: "Analytics", status: "partial", keywords: ["charts", "trends"] },
      { key: "notifications", href: "/modules/admin/notifications/notifications.html", icon: "NT", title: "Notifications", status: "partial", keywords: ["alerts", "bell"] },
    ],
  },
];

function getAdminModuleRegistry() {
  return ADMIN_MODULE_SECTIONS.flatMap((section) => section.items.map((item) => ({ ...item, section: section.label })));
}

function getAdminModuleByKey(key) {
  return getAdminModuleRegistry().find((item) => item.key === key) || null;
}

async function bootAdminPage({ moduleKey, pageTitle, pageDescription, allowDepartmentSetupPage = false } = {}) {
  requireAuth();
  localStorage.setItem("theme", "light");
  const gate = await ensureAdminDepartmentAccess({ allowDepartmentSetupPage });
  if (!gate?.allowed) return null;

  await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "ADMIN",
  });

  document.body.classList.add("admin-shell-ready");
  hydrateAdminNavbar({ moduleKey, pageTitle, pageDescription });
  bindAdminSearch();
  bindLanguageControl();
  bindNavbarActions();
  await window.enterpriseStore?.hydrateFromBackend?.([
    "departments",
    "users",
    "projects",
    "tasks",
    "teams",
    "leads",
    "attendance",
    "leaveRequests",
    "communications",
    "notifications",
  ]);
  await updateAdminNotificationCount();
  await initAdminRealtimeNotifications();
  return gate;
}

function hydrateAdminNavbar({ moduleKey, pageTitle, pageDescription } = {}) {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const moduleConfig = getAdminModuleByKey(moduleKey);

  const title = pageTitle || moduleConfig?.title || "Admin Workspace";
  const description = pageDescription || moduleConfig?.section || "Enterprise control";

  const titleElement = document.getElementById("navbarPageTitle");
  const descriptionElement = document.getElementById("navbarPageDescription");
  const avatar = document.getElementById("navbarAvatar");

  if (titleElement) titleElement.textContent = title;
  if (descriptionElement) descriptionElement.textContent = description;
  if (avatar && user?.profilePhoto) {
    avatar.src = user.profilePhoto;
  }
}

function bindAdminSearch() {
  const input = document.getElementById("globalSearchInput");
  if (!input || input.dataset.bound) return;

  input.dataset.bound = "true";
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    const keyword = String(input.value || "").trim().toLowerCase();
    if (!keyword) return;

    const match = getAdminModuleRegistry().find((item) => {
      const haystack = [item.title, item.section, ...(item.keywords || [])].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });

    if (match) {
      window.location.href = match.href;
      return;
    }

    if (typeof showToast === "function") {
      showToast("No matching admin module found for that search.", "warning", { title: "Global Search" });
    }
  });
}

function bindLanguageControl() {
  const select = document.getElementById("languageSwitch");
  if (!select || select.dataset.bound) return;

  select.dataset.bound = "true";
  select.addEventListener("change", () => {
    const label = select.options[select.selectedIndex]?.textContent || "Language updated";
    if (typeof showToast === "function") {
      showToast(`${label} selected for this workspace.`, "info", { title: "Language" });
    }
  });
}

async function updateAdminNotificationCount() {
  const countElement = document.getElementById("notificationCount");
  if (!countElement) return;

  try {
    const result = await API.get("/notifications");
    const items = Array.isArray(result.data) ? result.data : [];
    const unread = items.filter((item) => !item.read).length;
    countElement.textContent = String(unread);
  } catch (error) {
    countElement.textContent = "0";
  }
}

async function initAdminRealtimeNotifications() {
  if (window.__adminRealtimeNotificationsBound) return;
  window.__adminRealtimeNotificationsBound = true;

  await loadAdminScriptOnce("/socket.io/socket.io.js");
  await loadAdminScriptOnce("/assets/js/socket.js");

  if (typeof window.connectSocket === "function") {
    window.connectSocket();
  }
}

function loadAdminScriptOnce(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}

function bindNavbarActions() {
  const notificationBtn = document.getElementById("notificationBtn");
  if (notificationBtn && !notificationBtn.dataset.bound) {
    notificationBtn.dataset.bound = "true";
    notificationBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (typeof toggleNavbarPanel === "function") {
        toggleNavbarPanel("notificationBtn", "notificationPanel");
      }

      if (typeof bindNotificationDropdown === "function") {
        bindNotificationDropdown();
      }

      if (typeof fetchNotifications === "function") {
        await fetchNotifications();
      }
    });
  }

  const markAllBtn = document.getElementById("markAllNotificationsBtn");
  if (markAllBtn && !markAllBtn.dataset.bound) {
    markAllBtn.dataset.bound = "true";
    markAllBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof markAllNotificationsRead === "function") {
        await markAllNotificationsRead();
      }
      await updateAdminNotificationCount();
    });
  }
}

window.ADMIN_MODULE_SECTIONS = ADMIN_MODULE_SECTIONS;
window.getAdminModuleRegistry = getAdminModuleRegistry;
window.getAdminModuleByKey = getAdminModuleByKey;
window.bootAdminPage = bootAdminPage;
