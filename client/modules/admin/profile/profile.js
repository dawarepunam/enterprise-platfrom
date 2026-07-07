const PROFILE_STORAGE_KEY = "adminProfileState";

const defaultAdminState = {
  profile: {
    name: "Aarav Kulkarni",
    email: "admin@enterprise.local",
    phone: "+91 98765 43210",
    role: "ADMIN",
    title: "System Owner",
    department: "Executive Office",
    language: "English",
    timezone: "Asia/Kolkata",
    bio: "Oversees company-wide delivery, approvals, platform security and revenue governance.",
    lastLogin: "2026-05-11 09:20 AM",
    status: "Active Now",
    image: "https://via.placeholder.com/140x140.png?text=A",
  },
  overview: {
    departments: 8,
    managers: 14,
    approvals: 9,
    projects: 48,
    employees: 127,
    revenue: 2480000,
    productivity: 91,
    attendance: 96,
    conversion: 37,
    securityIncidents: 2,
    systemHealth: "Stable",
  },
  security: {
    twoFactorEnabled: true,
    loginAlerts: true,
    sessionTimeout: "30 Minutes",
    trustedDevices: 2,
    privacyMode: "High",
  },
  privacy: {
    showProfile: false,
    activityTracking: true,
    allowDataExport: true,
    allowDeletionRequest: false,
  },
  notifications: {
    email: true,
    sms: false,
    inApp: true,
    criticalOnly: false,
  },
  responsibilities: [
    "Create projects, departments and managers with clear ownership.",
    "Monitor delivery performance, delayed tasks and team productivity.",
    "Approve quotations, review revenue and audit high-risk actions.",
    "Configure enterprise settings such as SMTP, SMS, Cloudinary and backups.",
    "Govern security, access control, compliance visibility and data recovery.",
  ],
  modules: [
    { name: "Project Management", owner: "Admin + Manager", status: "Live", note: "Creation, budgeting and delivery oversight." },
    { name: "Task Management", owner: "Team Lead", status: "Active", note: "Assignment, proof review and recurring execution." },
    { name: "HR & Resource", owner: "Admin + HR", status: "Configured", note: "Roles, attendance, leaves and utilization." },
    { name: "CRM & Leads", owner: "Sales + Admin", status: "Scaling", note: "Lead journey, scoring and follow-up governance." },
    { name: "Marketing", owner: "Marketing Team", status: "Active", note: "Campaign execution, ROI and creative proofs." },
    { name: "Collaboration", owner: "All Roles", status: "Ready", note: "Chat, meetings, approvals and file context." },
  ],
  hierarchy: [
    { role: "ADMIN", detail: "System owner, revenue governance and enterprise controls." },
    { role: "PROJECT MANAGER", detail: "Resource planning, approvals and progress monitoring." },
    { role: "TEAM LEAD", detail: "Task breakdown, review queue and team execution quality." },
    { role: "TEAM MEMBER", detail: "Proof-based execution, timesheets and daily updates." },
  ],
  automations: [
    { title: "Project Assignment", detail: "Admin creates project, assigns manager and triggers automated onboarding email." },
    { title: "Task Lifecycle", detail: "Team lead assigns task, member updates progress, review loop closes with approval." },
    { title: "CRM Momentum", detail: "Lead reminders, quotation approval and deal conversion flow stay connected." },
    { title: "Compliance Watch", detail: "Audit logs, login alerts and backup jobs support enterprise resilience." },
  ],
  devices: [
    { id: "d1", name: "Windows Workstation", location: "Pune, IN", lastActive: "2 min ago", trusted: true },
    { id: "d2", name: "Android Phone", location: "Mumbai, IN", lastActive: "1 hour ago", trusted: true },
    { id: "d3", name: "MacBook Review Device", location: "Remote VPN", lastActive: "Yesterday", trusted: false },
  ],
  activityLog: [
    { title: "Approved quotation for PixelNest campaign", meta: "Revenue impact: INR 3.8L", time: "10 min ago" },
    { title: "Assigned project manager to Omkar Retail ERP", meta: "Department: Web Development", time: "42 min ago" },
    { title: "Updated SMTP configuration and delivery alerts", meta: "Security audit logged", time: "Today, 08:30 AM" },
    { title: "Reviewed delayed tasks across sales follow-up queue", meta: "4 tasks escalated to managers", time: "Today, 07:55 AM" },
  ],
};

document.addEventListener("DOMContentLoaded", async () => {
  requireAuth();
  enforceAdminRole();

  await loadComponent("navbar", "../../../components/navbar.html");
  await loadComponent("sidebar", "../../../components/sidebar.html");

  const state = getAdminState();
  renderProfileHub(state);
  bindProfileEvents(state);
});

function getAdminState() {
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const baseState = JSON.parse(JSON.stringify(defaultAdminState));

  let merged = baseState;
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      merged = {
        ...baseState,
        ...parsed,
        profile: { ...baseState.profile, ...(parsed.profile || {}) },
        overview: { ...baseState.overview, ...(parsed.overview || {}) },
        security: { ...baseState.security, ...(parsed.security || {}) },
        privacy: { ...baseState.privacy, ...(parsed.privacy || {}) },
        notifications: { ...baseState.notifications, ...(parsed.notifications || {}) },
      };
    } catch (error) {
      merged = baseState;
    }
  }

  if (currentUser) {
    merged.profile.name = currentUser.name || merged.profile.name;
    merged.profile.email = currentUser.email || merged.profile.email;
    merged.profile.role = currentUser.role || merged.profile.role;
    merged.profile.image = currentUser.profilePhoto || merged.profile.image;
  }

  return merged;
}

function saveAdminState(state) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state));

  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (currentUser) {
    currentUser.name = state.profile.name;
    currentUser.email = state.profile.email;
    currentUser.profilePhoto = state.profile.image;
    localStorage.setItem("user", JSON.stringify(currentUser));
  }
}

function renderProfileHub(state) {
  const { profile, overview, responsibilities, activityLog, modules, hierarchy, automations, security, privacy, notifications, devices } = state;

  setText("heroName", profile.name);
  setText("heroTitle", `${profile.title} - ${profile.department}`);
  setText("heroMeta", `Last login: ${profile.lastLogin}`);
  setText("activityStatus", profile.status);
  setText("systemHealth", `System Health: ${overview.systemHealth}`);
  setText("departmentCount", overview.departments);
  setText("managerCount", overview.managers);
  setText("approvalCount", overview.approvals);
  setText("securityCount", overview.securityIncidents);
  setText("projectsStat", overview.projects);
  setText("employeesStat", overview.employees);
  setText("revenueStat", formatCurrency(overview.revenue));
  setText("productivityStat", `${overview.productivity}%`);
  setText("attendanceStat", `${overview.attendance}%`);
  setText("conversionStat", `${overview.conversion}%`);

  const profileImg = document.getElementById("profileImg");
  if (profileImg) {
    profileImg.src = profile.image;
  }

  renderList(
    "responsibilityList",
    responsibilities.map((item) => `<li>${item}</li>`),
  );

  renderList(
    "recentActivity",
    activityLog.slice(0, 4).map(
      (item) => `
        <article class="timeline-item">
          <strong>${item.title}</strong>
          <span>${item.meta}</span>
          <span>${item.time}</span>
        </article>
      `,
    ),
  );

  renderList(
    "moduleMatrix",
    modules.map(
      (module) => `
        <article class="module-card">
          <div class="module-topline">
            <strong>${module.name}</strong>
            <span class="module-status">${module.status}</span>
          </div>
          <span class="module-owner">${module.owner}</span>
          <p>${module.note}</p>
        </article>
      `,
    ),
  );

  renderList(
    "hierarchyFlow",
    hierarchy.map(
      (item, index) => `
        <article class="hierarchy-card">
          <span class="hierarchy-index">0${index + 1}</span>
          <strong>${item.role}</strong>
          <p>${item.detail}</p>
        </article>
      `,
    ),
  );

  renderList(
    "automationFlow",
    automations.map(
      (item) => `
        <article class="automation-card">
          <strong>${item.title}</strong>
          <span>${item.detail}</span>
        </article>
      `,
    ),
  );

  renderList(
    "securitySummary",
    [
      createSecurityCard("2FA Status", security.twoFactorEnabled ? "Enabled" : "Disabled", "Identity protection for admin access."),
      createSecurityCard("Login Alerts", security.loginAlerts ? "Enabled" : "Disabled", "Receive security alerts on sensitive login events."),
      createSecurityCard("Trusted Devices", `${security.trustedDevices}/${devices.length}`, "Track device trust and revoke unknown sessions."),
      createSecurityCard("Privacy Mode", security.privacyMode, "Balance visibility, compliance and data control policies."),
      createSecurityCard("Activity Tracking", privacy.activityTracking ? "On" : "Off", "Audit trail and sensitive action observability."),
      createSecurityCard("Notification Channel", notifications.criticalOnly ? "Critical Only" : "All Priority Alerts", "Enterprise escalation delivery policy."),
    ],
  );
}

function bindProfileEvents(state) {
  const fileInput = document.getElementById("uploadImg");
  if (!fileInput) return;

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      state.profile.image = reader.result;
      saveAdminState(state);
      renderProfileHub(state);
    };
    reader.readAsDataURL(file);
  });
}

function createSecurityCard(title, value, note) {
  return `
    <article class="security-card">
      <span>${title}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `;
}

function renderList(id, items) {
  const element = document.getElementById(id);
  if (element) {
    element.innerHTML = items.join("");
  }
}

async function loadComponent(elementId, filePath) {
  const response = await fetch(filePath);
  const html = await response.text();
  document.getElementById(elementId).innerHTML = html;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function enforceAdminRole() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || typeof normalizeRole !== "function" || normalizeRole(user.role) !== "ADMIN") {
    window.location.href = "/pages/unauthorized.html";
  }
}
