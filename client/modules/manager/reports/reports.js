document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  window.managerHub?.ensureManagerMigration?.();
  document.getElementById("reportForm")?.addEventListener("submit", generateReport);
  renderReports();
});

function generateReport(event) {
  event.preventDefault();
  const title = document.getElementById("reportType").value;
  const format = document.getElementById("reportFormat").value;
  const summary = document.getElementById("reportSummary").value.trim() || "Generated from manager operations dashboard.";
  window.managerHub?.addReport?.({
    title,
    format,
    summary,
  });
  window.managerHub?.addAuditLog?.("Report Generated", title, "Report", `${format} export prepared by manager.`);
  renderReports();
}

function renderReports() {
  const reports = window.managerHub?.getReports?.() || [];
  const stats = window.managerHub?.getDashboardStats?.() || {};
  document.getElementById("reportMetrics").innerHTML = [
    ["Reports", reports.length, "RP"],
    ["Projects", stats.assignedProjects || 0, "PJ"],
    ["Open Tasks", stats.openTasks || 0, "TK"],
    ["Meetings", stats.upcomingMeetings || 0, "MT"],
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

  document.getElementById("reportHistory").innerHTML = reports
    .map(
      (report) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(report.title)}</strong>
            <span class="manager-badge">${escapeHtml(report.format)}</span>
          </div>
          <p>${escapeHtml(report.summary)}</p>
          <span class="muted-line">Generated ${formatShortDate(report.generatedAt)}</span>
        </article>
      `,
    )
    .join("");

  document.getElementById("reportAudit").innerHTML = (window.managerHub?.getAuditLogs?.() || [])
    .filter((item) => item.entityType === "Report" || item.action.includes("Report"))
    .slice(0, 6)
    .map(
      (item) => `
        <article class="manager-list-item">
          <strong>${escapeHtml(item.action)}</strong>
          <p>${escapeHtml(item.entityName || "")}</p>
          <span class="muted-line">${escapeHtml(item.note || "")}</span>
        </article>
      `,
    )
    .join("");
}
