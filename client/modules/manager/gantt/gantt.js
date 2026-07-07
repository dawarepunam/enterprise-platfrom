document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  renderGantt();
});

function renderGantt() {
  const items = window.managerHub?.getGantt?.() || [];
  document.getElementById("ganttMetrics").innerHTML = [
    ["Projects", items.length, "PJ"],
    ["Milestones", items.reduce((sum, item) => sum + (item.milestones || []).length, 0), "CP"],
    ["Delayed", items.filter((item) => new Date(item.endDate || 0) < new Date() && Number(item.progress || 0) < 100).length, "ER"],
    ["Avg Progress", `${items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.progress || 0), 0) / items.length) : 0}%`, "AN"],
  ].map(([label, value, icon]) => `
    <article class="manager-kpi">
      <span class="kpi-icon">${getNavIconSvg(icon)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");

  document.getElementById("ganttList").innerHTML = items.map((item) => `
    <article class="manager-list-item">
      <div class="manager-row-between">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="manager-badge">${Number(item.progress || 0)}% progress</span>
      </div>
      <p>${formatShortDate(item.startDate)} to ${formatShortDate(item.endDate)}</p>
      <div class="manager-progress"><span style="width:${Number(item.progress || 0)}%"></span></div>
      <div class="manager-inline-metrics">
        ${(item.milestones || []).map((milestone) => `<span class="manager-badge">${escapeHtml(milestone.title)} • ${formatShortDate(milestone.date)}</span>`).join("")}
      </div>
      <div class="manager-member-actions">
        <button class="btn ghost-btn" type="button" onclick="shiftGanttDate('${item.projectId}','start')">Move Start +1d</button>
        <button class="btn ghost-btn" type="button" onclick="shiftGanttDate('${item.projectId}','end')">Move End +1d</button>
      </div>
    </article>
  `).join("");
}

function shiftGanttDate(projectId, type) {
  const item = (window.managerHub?.getGantt?.() || []).find((row) => row.projectId === projectId);
  if (!item) return;
  const nextDate = new Date(type === "start" ? item.startDate : item.endDate);
  nextDate.setDate(nextDate.getDate() + 1);
  window.managerHub?.updateGanttProject?.(projectId, type === "start" ? { startDate: nextDate.toISOString().slice(0, 10) } : { endDate: nextDate.toISOString().slice(0, 10) });
  renderGantt();
}

window.shiftGanttDate = shiftGanttDate;
