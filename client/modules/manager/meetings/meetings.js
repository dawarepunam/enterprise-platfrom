document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  window.managerHub?.ensureManagerMigration?.();
  document.getElementById("meetingForm")?.addEventListener("submit", saveMeeting);
  renderMeetings();
});

function saveMeeting(event) {
  event.preventDefault();
  const team = (window.managerHub?.getManagerTeams?.() || []).find((item) => item._id === document.getElementById("meetingTeamId").value);
  if (!team) return;

  window.managerHub?.addMeeting?.({
    teamId: team._id,
    projectId: team.projectId || "",
    topic: document.getElementById("meetingTopic").value.trim(),
    agenda: document.getElementById("meetingAgenda").value.trim(),
    dateTime: document.getElementById("meetingTime").value,
    participants: team.members || [],
    joinLink: `https://meet.enterprise.local/${team._id}-${Date.now()}`,
  });
  renderMeetings();
}

function renderMeetings() {
  const teams = window.managerHub?.getManagerTeams?.() || [];
  const meetings = window.managerHub?.getMeetings?.() || [];
  document.getElementById("meetingTeamId").innerHTML = teams.map((team) => `<option value="${team._id}">${escapeHtml(team.name)} • ${escapeHtml(team.projectName)}</option>`).join("");
  document.getElementById("meetingMetrics").innerHTML = [
    ["Meetings", meetings.length, "MT"],
    ["Scheduled", meetings.filter((item) => item.status === "Scheduled").length, "CP"],
    ["Live Rooms", meetings.filter((item) => item.status === "Live").length, "KP"],
    ["Teams", teams.length, "TM"],
  ]
    .map(
      ([label, value, icon]) => `
        <article class="manager-kpi">
          <span class="kpi-icon">${getNavIconSvg(icon)}</span>
          <strong>${escapeHtml(String(value))}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `,
    )
    .join("");

  document.getElementById("meetingList").innerHTML = meetings
    .sort((a, b) => new Date(b.dateTime || b.createdAt || 0) - new Date(a.dateTime || a.createdAt || 0))
    .map(
      (meeting) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(meeting.topic)}</strong>
            <span class="status-pill ${statusClass(meeting.status)}">${escapeHtml(meeting.status)}</span>
          </div>
          <p>${escapeHtml(meeting.agenda || "No agenda")} </p>
          <span class="muted-line">${formatShortDate(meeting.dateTime)} • ${escapeHtml((meeting.participants || []).join(", "))}</span>
          <span class="muted-line">${escapeHtml(meeting.joinLink || "")}</span>
        </article>
      `,
    )
    .join("");
}
