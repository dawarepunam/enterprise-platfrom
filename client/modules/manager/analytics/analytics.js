document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  await window.managerHub?.ensureManagerMigration?.();
  renderAnalytics();
});

function renderAnalytics() {
  const rows = window.managerHub?.getAnalyticsSnapshot?.() || [];
  const metrics = document.getElementById("analyticsMetrics");
  if (metrics) {
    const avgProductivity = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.productivityScore, 0) / rows.length) : 0;
    metrics.innerHTML = [
      ["Members", rows.length, "TM"],
      ["Top Performers", rows.filter((row) => row.productivityScore >= 90).length, "AN"],
      ["High Workload", rows.filter((row) => row.currentWorkload >= 80).length, "ER"],
      ["Avg Productivity", `${avgProductivity}%`, "DL"],
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
  }

  document.getElementById("analyticsTable").innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>
            <strong>${escapeHtml(row.memberName)}</strong>
            <div class="muted-line">${escapeHtml(row.department)} • ${escapeHtml(row.availability)}</div>
          </td>
          <td>${row.taskCompletionRate}%</td>
          <td>${row.onTimeDelivery}%</td>
          <td>${row.qualityScore}</td>
          <td>${row.attendanceRate}%</td>
          <td>${row.chatActivity}</td>
          <td>${row.meetingAttendance}%</td>
          <td>${row.currentWorkload}%</td>
          <td>
            <div class="manager-member-actions">
              <button class="btn ghost-btn" type="button" onclick="analyticsAction('Top Performer','${escapeJs(row.memberName)}')">Top</button>
              <button class="btn ghost-btn" type="button" onclick="analyticsAction('Warning','${escapeJs(row.memberName)}')">Warn</button>
              <button class="btn ghost-btn" type="button" onclick="analyticsAction('Promotion Recommendation','${escapeJs(row.memberName)}')">Promote</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function analyticsAction(action, memberName) {
  window.managerHub?.addAuditLog?.(action, memberName, "Performance", `${action} issued from analytics board.`);
  window.managerHub?.addNotification?.(action, `${action} updated for ${memberName}.`, "success");
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.analyticsAction = analyticsAction;
