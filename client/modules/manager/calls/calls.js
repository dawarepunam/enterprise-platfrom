document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  await window.managerHub?.ensureManagerMigration?.();
  document.getElementById("callForm")?.addEventListener("submit", saveCall);
  renderCalls();
});

function saveCall(event) {
  event.preventDefault();
  const team = (window.managerHub?.getManagerTeams?.() || []).find((item) => item._id === document.getElementById("callTeamId").value);
  if (!team) return;

  window.managerHub?.addCall?.({
    teamId: team._id,
    projectId: team.projectId || "",
    title: document.getElementById("callTitle").value.trim(),
    callerId: getCurrentUser?.()._id || "usr-2",
    callerName: getCurrentUser?.().name || "Manager",
    participantIds: team.memberIds || [],
    participantNames: team.members || [],
    callType: document.getElementById("callType").value,
    status: "Live",
    startTime: new Date().toISOString(),
    duration: 0,
    notes: document.getElementById("callNotes").value.trim(),
  });
  renderCalls();
}

function renderCalls() {
  const teams = window.managerHub?.getManagerTeams?.() || [];
  const calls = window.managerHub?.getCalls?.() || [];
  document.getElementById("callTeamId").innerHTML = teams.map((team) => `<option value="${team._id}">${escapeHtml(team.name)} • ${escapeHtml(team.projectName)}</option>`).join("");
  document.getElementById("callMetrics").innerHTML = [
    ["Total Calls", calls.length, "CQ"],
    ["Live Calls", calls.filter((call) => call.status === "Live").length, "KP"],
    ["Teams", teams.length, "TM"],
    ["Participants", new Set(calls.flatMap((call) => call.participantNames || [])).size, "US"],
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

  document.getElementById("callList").innerHTML = calls
    .sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0))
    .map(
      (call) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(call.title)}</strong>
            <span class="status-pill ${statusClass(call.status)}">${escapeHtml(call.status)}</span>
          </div>
          <p>${escapeHtml(call.callType)} • ${escapeHtml((call.participantNames || []).join(", ") || "No participants")}</p>
          <span class="muted-line">Started ${formatShortDate(call.startTime)} • Duration ${call.duration || 0} min</span>
          <span class="muted-line">${escapeHtml(call.notes || "")}</span>
        </article>
      `,
    )
    .join("");
}
