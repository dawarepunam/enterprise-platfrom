document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "settings",
    title: "Settings",
    description: "Profile and security preferences",
  });
  document.getElementById("saveHrSettingsBtn").addEventListener("click", saveSettings);
  loadSettings();
});

async function loadSettings() {
  try {
    const response = await API.get("/hr/settings");
    const data = response.data || {};
    document.getElementById("settingsName").value = data.profile?.name || "";
    document.getElementById("settingsEmail").value = data.profile?.email || "";
    document.getElementById("settingsPhone").value = data.profile?.phone || "";
    document.getElementById("settingsDepartment").value = data.profile?.department || "";
    document.getElementById("settingsDesignation").value = data.profile?.designation || "";
    document.getElementById("settingsDarkMode").checked = Boolean(data.preferences?.darkMode);
    document.getElementById("settingsNotifications").checked = data.preferences?.notificationsEnabled !== false;
    document.getElementById("settingsPrivacy").checked = Boolean(data.preferences?.privacyMode);
    document.getElementById("settingsTwoFactor").checked = Boolean(data.preferences?.twoFactorEnabled);
    document.getElementById("settingsIntegrationList").innerHTML = [
      ["Teams", data.integrations?.teamsReady, "Open Teams workspace and meetings"],
      ["Outlook", data.integrations?.outlookReady, data.integrations?.outlookEmail || "Outlook mailbox not linked"],
      ["Calendar", data.integrations?.calendarReady, "Schedule meetings and reminders"],
      ["OneDrive", data.integrations?.oneDriveReady, "Employee document upload and preview"],
    ].map(([label, ready, meta]) => `
      <div class="hr-list-item">
        <div>
          <strong>${label}</strong>
          <div class="hr-meta">${meta}</div>
        </div>
        <span class="hr-status ${ready ? "active" : "pending"}">${ready ? "Connected" : "Pending"}</span>
      </div>
    `).join("");
  } catch (error) {
    window.hrApp.toast(error.message, "error");
  }
}

async function saveSettings() {
  await apiRequest("/hr/settings", "PATCH", {
    name: document.getElementById("settingsName").value.trim(),
    phone: document.getElementById("settingsPhone").value.trim(),
    department: document.getElementById("settingsDepartment").value.trim(),
    designation: document.getElementById("settingsDesignation").value.trim(),
    password: document.getElementById("settingsPassword").value,
    darkMode: document.getElementById("settingsDarkMode").checked,
    notificationsEnabled: document.getElementById("settingsNotifications").checked,
    privacyMode: document.getElementById("settingsPrivacy").checked,
    twoFactorEnabled: document.getElementById("settingsTwoFactor").checked,
  });
  window.hrApp.toast("Settings saved");
}
