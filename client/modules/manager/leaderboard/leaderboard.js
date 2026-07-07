document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  renderLeaderboard();
});

function renderLeaderboard() {
  const rows = window.managerHub?.getLeaderboard?.() || [];
  document.getElementById("leaderboardMetrics").innerHTML = [
    ["Members", rows.length, "TM"],
    ["Top 90+", rows.filter((row) => row.productivityScore >= 90).length, "KP"],
    ["Rewards", rows.reduce((sum, row) => sum + (row.rewards || []).length, 0), "AL"],
    ["Team Avg", `${rows.length ? Math.round(rows.reduce((sum, row) => sum + row.productivityScore, 0) / rows.length) : 0}%`, "AN"],
  ].map(([label, value, icon]) => `
    <article class="manager-kpi">
      <span class="kpi-icon">${getNavIconSvg(icon)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");

  document.getElementById("leaderboardList").innerHTML = rows.map((row, index) => `
    <article class="manager-member-card">
      <div class="manager-row-between">
        <strong>#${index + 1} ${escapeHtml(row.memberName)}</strong>
        <span class="manager-badge">${row.productivityScore}%</span>
      </div>
      <p>${escapeHtml(row.department)} • Completion ${row.taskCompletionRate}% • Attendance ${row.attendanceRate}%</p>
      <div class="manager-inline-metrics">
        ${(row.rewards || []).map((reward) => `<span class="manager-badge">${escapeHtml(reward.badge)}</span>`).join("") || '<span class="muted-line">No badges yet</span>'}
      </div>
      <div class="manager-member-actions">
        <button class="btn ghost-btn" type="button" onclick="awardTopPerformer('${escapeJs(row.memberName)}')">Mark Top Performer</button>
      </div>
    </article>
  `).join("");
}

function awardTopPerformer(memberName) {
  window.managerHub?.addReward?.({
    memberName,
    badge: "Top Performer",
    reason: "Leaderboard performance action by manager.",
  });
  renderLeaderboard();
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.awardTopPerformer = awardTopPerformer;
