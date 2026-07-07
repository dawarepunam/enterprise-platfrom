document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  document.getElementById("timeForm")?.addEventListener("submit", saveTimeEntry);
  renderTimeTracking();
});

function saveTimeEntry(event) {
  event.preventDefault();
  const tasks = window.managerHub?.getManagerTasks?.() || [];
  const members = window.managerHub?.getManagerMembers?.() || [];
  const task = tasks.find((item) => item._id === document.getElementById("timeTask").value);
  const member = members.find((item) => item._id === document.getElementById("timeMember").value);
  if (!task || !member) return;
  const startedAt = new Date(document.getElementById("timeStart").value);
  const endedAt = new Date(document.getElementById("timeEnd").value);
  const durationMinutes = Math.max(0, Math.round((endedAt - startedAt) / 60000));
  window.managerHub?.addTimeEntry?.({
    memberName: member.name,
    memberId: member._id,
    projectId: task.projectId,
    taskId: task._id,
    taskTitle: task.title,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes,
    comment: document.getElementById("timeComment").value.trim(),
  });
  renderTimeTracking();
}

function renderTimeTracking() {
  const members = window.managerHub?.getManagerMembers?.() || [];
  const tasks = window.managerHub?.getManagerTasks?.() || [];
  const snapshot = window.managerHub?.getTimeTrackingSnapshot?.() || { timeEntries: [], worklogs: [], totals: {} };
  document.getElementById("timeMember").innerHTML = members.map((member) => `<option value="${member._id}">${escapeHtml(member.name)}</option>`).join("");
  document.getElementById("timeTask").innerHTML = tasks.map((task) => `<option value="${task._id}">${escapeHtml(task.title)} • ${escapeHtml(task.projectName)}</option>`).join("");

  const ratio = snapshot.totals.estimatedHours ? Math.round((Number(snapshot.totals.actualHours || 0) / Number(snapshot.totals.estimatedHours || 1)) * 100) : 0;
  document.getElementById("timeMetrics").innerHTML = [
    ["Estimated Hours", snapshot.totals.estimatedHours || 0, "TS"],
    ["Actual Hours", snapshot.totals.actualHours || 0, "DU"],
    ["Worklogs", snapshot.worklogs.length, "RP"],
    ["Productivity Ratio", `${ratio}%`, "AN"],
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

  document.getElementById("timeVariance").innerHTML = tasks.slice(0, 5).map((task) => {
    const actualHours = snapshot.worklogs
      .filter((log) => log.taskTitle === task.title)
      .reduce((sum, log) => sum + Number(log.hoursSpent || 0), 0);
    const variance = Math.round((actualHours - Number(task.estimatedHours || 0)) * 100) / 100;
    return `
      <article class="manager-list-item">
        <strong>${escapeHtml(task.title)}</strong>
        <p>Estimated ${task.estimatedHours || 0}h • Actual ${actualHours}h</p>
        <span class="muted-line">${variance > 0 ? `Over by ${variance}h` : `Under by ${Math.abs(variance)}h`}</span>
      </article>
    `;
  }).join("");

  document.getElementById("timeEntryList").innerHTML = snapshot.timeEntries
    .slice()
    .reverse()
    .map((entry) => `
      <article class="manager-list-item">
        <strong>${escapeHtml(entry.memberName)} • ${escapeHtml(entry.taskTitle)}</strong>
        <p>${formatShortDate(entry.startedAt)} to ${formatShortDate(entry.endedAt)}</p>
        <span class="muted-line">${Math.round((Number(entry.durationMinutes || 0) / 60) * 100) / 100} hours</span>
      </article>
    `).join("");

  document.getElementById("worklogList").innerHTML = snapshot.worklogs
    .slice()
    .reverse()
    .map((log) => `
      <article class="manager-list-item">
        <strong>${escapeHtml(log.memberName)} • ${escapeHtml(log.taskTitle)}</strong>
        <p>${escapeHtml(log.projectName)} • ${log.hoursSpent}h</p>
        <span class="muted-line">${escapeHtml(log.comments || "")}</span>
      </article>
    `).join("");
}
