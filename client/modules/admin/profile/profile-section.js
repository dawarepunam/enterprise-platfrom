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
  },
  security: {
    twoFactorEnabled: true,
    loginAlerts: true,
    sessionTimeout: "30 Minutes",
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

  await loadComponent("navbar", "../../../components/navbar.html");
  await loadComponent("sidebar", "../../../components/sidebar.html");

  const state = getAdminState();
  const page = document.body.dataset.page;

  bindGlobalEvents(state);
  renderPage(page, state);
});

function getAdminState() {
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const merged = stored
    ? { ...defaultAdminState, ...JSON.parse(stored) }
    : JSON.parse(JSON.stringify(defaultAdminState));

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

function bindGlobalEvents(state) {
  const saveButtons = document.querySelectorAll("[data-save]");
  saveButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const saveType = button.dataset.save;
      handleSave(saveType, state);
    });
  });
}

function renderPage(page, state) {
  switch (page) {
    case "overview":
      renderOverview(state);
      break;
    case "personal-info":
      renderPersonalInfo(state);
      break;
    case "security":
      renderSecurity(state);
      break;
    case "privacy":
      renderPrivacy(state);
      break;
    case "notifications":
      renderNotifications(state);
      break;
    case "devices":
      renderDevices(state);
      break;
    case "activity-log":
      renderActivityLog(state);
      break;
    default:
      break;
  }
}

function renderOverview(state) {
  const { profile, overview, security, notifications } = state;
  setText("overviewName", profile.name);
  setText("overviewTitle", `${profile.title} - ${profile.department}`);
  setText("overviewLastLogin", profile.lastLogin);
  setText("overviewProjects", overview.projects);
  setText("overviewEmployees", overview.employees);
  setText("overviewRevenue", formatCurrency(overview.revenue));
  setText("overviewProductivity", `${overview.productivity}%`);
  setText("overviewDepartments", overview.departments);
  setText("overviewManagers", overview.managers);
  setText("overviewApprovals", overview.approvals);
  setText("overview2FA", security.twoFactorEnabled ? "Enabled" : "Disabled");
  setText("overviewAlerts", notifications.email ? "Email alerts active" : "Email alerts paused");
}

function renderPersonalInfo(state) {
  const { profile } = state;
  setValue("name", profile.name);
  setValue("email", profile.email);
  setValue("phone", profile.phone);
  setValue("title", profile.title);
  setValue("department", profile.department);
  setValue("language", profile.language);
  setValue("timezone", profile.timezone);
  setValue("bio", profile.bio);
}

function renderSecurity(state) {
  const { security } = state;
  setChecked("twoFactorEnabled", security.twoFactorEnabled);
  setChecked("loginAlerts", security.loginAlerts);
  setValue("sessionTimeout", security.sessionTimeout);
}

function renderPrivacy(state) {
  const { privacy } = state;
  setChecked("showProfile", privacy.showProfile);
  setChecked("activityTracking", privacy.activityTracking);
  setChecked("allowDataExport", privacy.allowDataExport);
  setChecked("allowDeletionRequest", privacy.allowDeletionRequest);
}

function renderNotifications(state) {
  const { notifications } = state;
  setChecked("emailNotif", notifications.email);
  setChecked("smsNotif", notifications.sms);
  setChecked("inAppNotif", notifications.inApp);
  setChecked("criticalOnly", notifications.criticalOnly);
}

function renderDevices(state) {
  const deviceGrid = document.getElementById("deviceGrid");
  if (!deviceGrid) return;

  deviceGrid.innerHTML = state.devices
    .map(
      (device) => `
        <article class="device-card">
          <span class="status-pill ${device.trusted ? "" : "warn"}">${device.trusted ? "Trusted" : "Review Needed"}</span>
          <strong>${device.name}</strong>
          <span class="device-meta">${device.location}</span>
          <span class="device-meta">Last active: ${device.lastActive}</span>
          <button class="btn ghost-btn" onclick="revokeDevice('${device.id}')">Revoke Access</button>
        </article>
      `,
    )
    .join("");
}

function renderActivityLog(state) {
  const activityList = document.getElementById("activityList");
  if (!activityList) return;

  activityList.innerHTML = state.activityLog
    .map(
      (item) => `
        <article class="activity-card">
          <strong>${item.title}</strong>
          <span class="activity-meta">${item.meta}</span>
          <span class="activity-meta">${item.time}</span>
        </article>
      `,
    )
    .join("");
}

function handleSave(type, state) {
  if (type === "personal-info") {
    state.profile.name = getValue("name");
    state.profile.email = getValue("email");
    state.profile.phone = getValue("phone");
    state.profile.title = getValue("title");
    state.profile.department = getValue("department");
    state.profile.language = getValue("language");
    state.profile.timezone = getValue("timezone");
    state.profile.bio = getValue("bio");
  }

  if (type === "security") {
    const newPassword = getValue("newPassword");
    const confirmPassword = getValue("confirmPassword");

    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        alert("New password and confirm password do not match.");
        return;
      }
    }

    state.security.twoFactorEnabled = getChecked("twoFactorEnabled");
    state.security.loginAlerts = getChecked("loginAlerts");
    state.security.sessionTimeout = getValue("sessionTimeout");
  }

  if (type === "privacy") {
    state.privacy.showProfile = getChecked("showProfile");
    state.privacy.activityTracking = getChecked("activityTracking");
    state.privacy.allowDataExport = getChecked("allowDataExport");
    state.privacy.allowDeletionRequest = getChecked("allowDeletionRequest");
  }

  if (type === "notifications") {
    state.notifications.email = getChecked("emailNotif");
    state.notifications.sms = getChecked("smsNotif");
    state.notifications.inApp = getChecked("inAppNotif");
    state.notifications.criticalOnly = getChecked("criticalOnly");
  }

  saveAdminState(state);
  alert("Settings saved successfully.");
}

function revokeDevice(deviceId) {
  const state = getAdminState();
  state.devices = state.devices.filter((device) => device.id !== deviceId);
  saveAdminState(state);
  renderDevices(state);
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

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.value = value || "";
  }
}

function setChecked(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.checked = Boolean(value);
  }
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function getChecked(id) {
  return Boolean(document.getElementById(id)?.checked);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
