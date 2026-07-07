const KANBAN_COLUMNS = ["To Do", "In Progress", "Review", "Completed"];

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  renderKanban();
});

function renderKanban() {
  const items = window.managerHub?.getKanban?.() || [];
  document.getElementById("kanbanMetrics").innerHTML = KANBAN_COLUMNS.map((column) => `
    <article class="manager-kpi">
      <span class="kpi-icon">${getNavIconSvg("TK")}</span>
      <strong>${items.filter((item) => item.column === column).length}</strong>
      <span>${escapeHtml(column)}</span>
    </article>
  `).join("");

  document.getElementById("kanbanBoard").innerHTML = KANBAN_COLUMNS.map((column) => `
    <section class="manager-panel">
      <header><div><p class="eyebrow-line">${escapeHtml(column)}</p><h2>${items.filter((item) => item.column === column).length} tasks</h2></div></header>
      <div class="manager-list">
        ${items.filter((item) => item.column === column).map((item) => `
          <article class="manager-list-item">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.assignee || "Unassigned")}</p>
            <span class="muted-line">${formatShortDate(item.deadline)}</span>
            <div class="manager-member-actions">
              ${KANBAN_COLUMNS.filter((next) => next !== column).map((next) => `<button type="button" class="btn ghost-btn" onclick="moveKanbanTask('${item.taskId}','${escapeJs(next)}')">${escapeHtml(next)}</button>`).join("")}
            </div>
          </article>
        `).join("") || '<div class="manager-empty">No tasks</div>'}
      </div>
    </section>
  `).join("");
}

function moveKanbanTask(taskId, nextColumn) {
  window.managerHub?.updateKanbanTask?.(taskId, nextColumn);
  renderKanban();
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.moveKanbanTask = moveKanbanTask;
