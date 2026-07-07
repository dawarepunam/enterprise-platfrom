const PROFILE_PRESETS = {
  TEAM_LEAD: {
    role: "TEAM LEAD",
    status: "Review Loop Active",
    title: "Execution Quality Owner",
    bio: "Owns task breakdown, member reviews, delivery quality, and realtime team communication.",
    stats: [
      { label: "Open Tasks", value: () => window.enterpriseStore?.getTeamLeadSnapshot?.().taskCount || 0 },
      { label: "Subtasks In Review", value: () => window.enterpriseStore?.getTeamLeadSnapshot?.().activeSubtasks || 0 },
      { label: "Approved Work", value: () => window.enterpriseStore?.getTeamLeadSnapshot?.().approvedSubtasks || 0 },
      { label: "Daily Check-ins", value: () => 5 },
    ],
    nav: [
      ["overview.html", "Overview", "Lead KPI view, role health and review status."],
      ["personal-info.html", "Personal Info", "Contact details, team assignment and designation."],
      ["skills.html", "Skills", "Core capabilities and delivery ownership areas."],
      ["performance.html", "Performance", "Review throughput, approvals and quality trend."],
      ["projects-history.html", "Projects", "Completed deliveries and ongoing squads."],
      ["notifications.html", "Notifications", "Message, review, call and meeting alerts."],
      ["security.html", "Security", "Session safety, password flow and access controls."],
      ["activity-log.html", "Activity Log", "Recent approvals, reviews and escalations."],
    ],
  },
  MEMBER: {
    role: "TEAM MEMBER",
    status: "Execution In Progress",
    title: "Task Owner",
    bio: "Executes assigned work, submits updates, shares files, and keeps the team room moving.",
    stats: [
      { label: "Active Tasks", value: () => window.enterpriseStore?.getMemberSnapshot?.().activeCount || 0 },
      { label: "In Review", value: () => window.enterpriseStore?.getMemberSnapshot?.().reviewCount || 0 },
      { label: "Completed", value: () => window.enterpriseStore?.getMemberSnapshot?.().completedCount || 0 },
      { label: "Due Soon", value: () => window.enterpriseStore?.getMemberSnapshot?.().dueSoon?.length || 0 },
    ],
    nav: [
      ["overview.html", "Overview", "Personal execution dashboard and delivery pulse."],
      ["personal-info.html", "Personal Info", "Profile, contact details and timezone."],
      ["skills.html", "Skills", "Execution strengths and assigned responsibilities."],
      ["performance.html", "Performance", "Task completion quality and cadence."],
      ["projects-history.html", "Projects", "Active and completed project history."],
      ["notifications.html", "Notifications", "Review alerts, task notices and reminders."],
      ["security.html", "Security", "Password, sessions and trusted device controls."],
      ["activity-log.html", "Activity Log", "Recent updates, uploads and attendance actions."],
    ],
  },
  CLIENT: {
    role: "CLIENT",
    status: "Portal Access Active",
    title: "Client Stakeholder",
    bio: "Tracks project progress, monitors quotations, approves requests, and stays aligned with delivery.",
    stats: [
      { label: "Visible Projects", value: () => window.enterpriseStore?.getClientSnapshot?.().projects?.length || 0 },
      { label: "Approvals Needed", value: () => window.enterpriseStore?.getClientSnapshot?.().approvalsNeeded || 0 },
      { label: "Approved Quotations", value: () => window.enterpriseStore?.getClientSnapshot?.().approvedCount || 0 },
      { label: "Portal Messages", value: () => 3 },
    ],
    nav: [
      ["overview.html", "Overview", "Commercial and delivery snapshot."],
      ["company-info.html", "Company Info", "Client organization and stakeholder details."],
      ["contact-details.html", "Contacts", "Primary, finance and delivery contacts."],
      ["documents.html", "Documents", "Quotations, reports and approvals archive."],
      ["notifications.html", "Notifications", "Portal messages, approval reminders and status changes."],
      ["security.html", "Security", "Portal protection and access sessions."],
      ["devices.html", "Devices", "Active sessions and trusted devices."],
      ["activity-log.html", "Activity Log", "Approval and portal interaction history."],
    ],
  },
};

async function initProfileHub({ role, navbarPath, sidebarPath, dashboardHref }) {
  const ready = await initWorkspace({ navbarPath, sidebarPath, requireRole: role });
  if (!ready) return false;

  const user = getCurrentUser?.() || {};
  const preset = PROFILE_PRESETS[role] || PROFILE_PRESETS.MEMBER;
  const stats = preset.stats.map((item) => ({ label: item.label, value: item.value() }));

  document.getElementById("heroName").textContent = user.name || preset.role;
  document.getElementById("heroRole").textContent = preset.role;
  document.getElementById("heroTitle").textContent = user.title || preset.title;
  document.getElementById("heroStatus").textContent = preset.status;
  document.getElementById("heroBio").textContent = preset.bio;
  document.getElementById("dashboardLink").href = dashboardHref;

  document.getElementById("stats").innerHTML = stats
    .map((item) => `<article class="stat-card"><span class="subtle">${escapeHub(item.label)}</span><strong>${escapeHub(String(item.value))}</strong></article>`)
    .join("");

  document.getElementById("navCards").innerHTML = preset.nav
    .map(([href, title, note]) => `<a class="nav-card" href="${href}"><strong>${escapeHub(title)}</strong><span>${escapeHub(note)}</span></a>`)
    .join("");

  const activity = buildProfileTimeline(role);
  document.getElementById("timeline").innerHTML = activity
    .map((item) => `<article class="timeline-item"><strong>${escapeHub(item.title)}</strong><span>${escapeHub(item.meta)}</span></article>`)
    .join("");

  return true;
}

function buildProfileTimeline(role) {
  if (role === "TEAM_LEAD") {
    return [
      { title: "Reviewed member submission", meta: "Returned UI feedback with deadline adjustment." },
      { title: "Approved subtask batch", meta: "Three micro tasks cleared for manager visibility." },
      { title: "Started team sync", meta: "Opened live meeting room for sprint closure." },
    ];
  }

  if (role === "CLIENT") {
    return [
      { title: "Viewed delivery progress", meta: "Project status accessed from client portal." },
      { title: "Reviewed quotation", meta: "Commercial revision opened for decision." },
      { title: "Downloaded report", meta: "Latest monthly summary exported." },
    ];
  }

  return [
    { title: "Submitted task update", meta: "Progress sent for lead review." },
    { title: "Shared execution file", meta: "Uploaded proof inside the team room." },
    { title: "Checked assignment queue", meta: "Reviewed upcoming due tasks." },
  ];
}

function escapeHub(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

window.initProfileHub = initProfileHub;
