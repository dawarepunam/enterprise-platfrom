const SETTINGS_PRESETS = {
  TEAM_LEAD: {
    roleLabel: "TEAM LEAD",
    summary: "Control review alerts, meeting preferences, language, and team visibility options.",
    links: [
      ["notification-settings.html", "Notifications", "Review queue, task updates and escalations."],
      ["meeting-settings.html", "Meetings", "Live sync defaults and room behavior."],
      ["calendar-settings.html", "Calendar", "Sprint reminders and deadline sync."],
      ["language-settings.html", "Language", "Locale and workspace language options."],
      ["theme-settings.html", "Theme", "Workspace look and readability controls."],
    ],
  },
  MEMBER: {
    roleLabel: "TEAM MEMBER",
    summary: "Manage daily reminders, upload defaults, theme, and notification preferences for execution work.",
    links: [
      ["notification-settings.html", "Notifications", "Task and review notifications."],
      ["meeting-settings.html", "Meetings", "Call and sync room defaults."],
      ["calendar-settings.html", "Calendar", "Deadline reminders and daily planning."],
      ["language-settings.html", "Language", "Preferred language and formatting."],
      ["theme-settings.html", "Theme", "Personal workspace look."],
      ["upload-settings.html", "Uploads", "File upload and attachment behavior."],
    ],
  },
  CLIENT: {
    roleLabel: "CLIENT",
    summary: "Set portal notifications, security behavior, language, and stakeholder view preferences.",
    links: [
      ["notification-settings.html", "Notifications", "Approval reminders and project updates."],
      ["security-settings.html", "Security", "Session safety and portal access rules."],
      ["calendar-settings.html", "Calendar", "Meeting and report reminders."],
      ["language-settings.html", "Language", "Portal language and date format."],
      ["theme-settings.html", "Theme", "Portal display preferences."],
      ["portal-settings.html", "Portal", "Visibility and stakeholder access options."],
    ],
  },
};

async function initSettingsHub({ role, navbarPath, sidebarPath, dashboardHref }) {
  const ready = await initWorkspace({ navbarPath, sidebarPath, requireRole: role });
  if (!ready) return false;

  const preset = SETTINGS_PRESETS[role] || SETTINGS_PRESETS.MEMBER;
  document.getElementById("roleLabel").textContent = preset.roleLabel;
  document.getElementById("summary").textContent = preset.summary;
  document.getElementById("dashboardLink").href = dashboardHref;

  document.getElementById("links").innerHTML = preset.links
    .map(([href, title, note]) => `<a class="link-card" href="${href}"><strong>${escapeSettings(title)}</strong><span>${escapeSettings(note)}</span></a>`)
    .join("");

  document.getElementById("toggles").innerHTML = [
    ["Realtime Alerts", "Enabled", "Stay updated on messages, task changes and approvals."],
    ["Role Visibility", "Managed", "Show only authorized team or client data."],
    ["Device Safety", "Protected", "Session awareness and access checks remain active."],
    ["Sync Health", "Connected", "Calendar, meetings and workspace preferences remain aligned."],
  ]
    .map(([title, value, note]) => `<article class="toggle-card"><strong>${escapeSettings(title)}</strong><span class="status-pill">${escapeSettings(value)}</span><span>${escapeSettings(note)}</span></article>`)
    .join("");

  return true;
}

function escapeSettings(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

window.initSettingsHub = initSettingsHub;
