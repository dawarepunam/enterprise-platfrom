function getManagerPageMap() {
  return {
    dashboard: "/modules/manager/dashboard/dashboard.html",
    projects: "/modules/manager/projects/projects.html",
    team: "/modules/manager/team/team.html",
    tasks: "/modules/manager/tasks/tasks.html",
    files: "/modules/manager/files/files.html",
    meetings: "/modules/manager/meetings/meetings.html",
    teams: "/modules/manager/teams/teams.html",
    mailbox: "/modules/manager/mailbox/mailbox.html",
    calendar: "/modules/manager/calendar/calendar.html",
    reports: "/modules/manager/reports/reports.html",
    profile: "/modules/manager/profile/profile.html",
    settings: "/modules/manager/settings/settings.html",
  };
}

function navigateTo(page) {
  const resolved = getManagerPageMap()[page] || page;
  if (!resolved) return;
  window.location.href = resolved;
}

function openProjectDetails(projectId, options = {}) {
  const normalizedId = String(projectId || "").trim();
  if (!normalizedId) {
    if (typeof showToast === "function") {
      showToast("Project details are not available for this card yet.", "warning");
    }
    return navigateTo("projects");
  }

  const url = new URL("/modules/manager/project-details/project-details.html", window.location.origin);
  url.searchParams.set("id", normalizedId);
  if (options.tab) {
    url.searchParams.set("tab", options.tab);
  }
  window.location.href = `${url.pathname}${url.search}`;
}

function openTeams(url) {
  window.open(url || "https://teams.microsoft.com", "_blank", "noopener");
}

function openFiles(projectId) {
  const normalizedId = String(projectId || "").trim();
  window.location.href = normalizedId
    ? `/modules/manager/files/files.html?projectId=${encodeURIComponent(normalizedId)}`
    : getManagerPageMap().files;
}

function openMeetings(projectId) {
  const normalizedId = String(projectId || "").trim();
  window.location.href = normalizedId
    ? `/modules/manager/meetings/meetings.html?projectId=${encodeURIComponent(normalizedId)}`
    : getManagerPageMap().meetings;
}

function openMailbox(projectId) {
  const normalizedId = String(projectId || "").trim();
  window.location.href = normalizedId
    ? `/modules/manager/mailbox/mailbox.html?projectId=${encodeURIComponent(normalizedId)}`
    : getManagerPageMap().mailbox;
}

function setActiveSidebar() {
  const links = document.querySelectorAll("#sidebar a[href]");
  links.forEach((link) => {
    const linkUrl = new URL(link.getAttribute("href"), window.location.origin);
    link.classList.toggle("active", linkUrl.pathname === window.location.pathname);
  });
}

window.navigateTo = navigateTo;
window.openProjectDetails = openProjectDetails;
window.openTeams = openTeams;
window.openFiles = openFiles;
window.openMeetings = openMeetings;
window.openMailbox = openMailbox;
window.setActiveSidebar = setActiveSidebar;
