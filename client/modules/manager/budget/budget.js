document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  renderBudget();
});

function renderBudget() {
  const items = window.managerHub?.getBudgets?.() || [];
  const totalAllocated = items.reduce((sum, item) => sum + Number(item.allocatedBudget || 0), 0);
  const totalUsed = items.reduce((sum, item) => sum + Number(item.usedBudget || 0), 0);
  document.getElementById("budgetMetrics").innerHTML = [
    ["Allocated", formatCurrency(totalAllocated), "EX"],
    ["Used", formatCurrency(totalUsed), "TS"],
    ["Remaining", formatCurrency(totalAllocated - totalUsed), "DL"],
    ["At Risk", items.filter((item) => item.usedBudget > item.allocatedBudget * 0.85).length, "ER"],
  ].map(([label, value, icon]) => `
    <article class="manager-kpi">
      <span class="kpi-icon">${getNavIconSvg(icon)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");

  document.getElementById("budgetTable").innerHTML = items.map((item) => {
    const atRisk = item.usedBudget > item.allocatedBudget * 0.85;
    return `
      <tr>
        <td>${escapeHtml(item.projectName)}</td>
        <td>${formatCurrency(item.allocatedBudget)}</td>
        <td>${formatCurrency(item.usedBudget)}</td>
        <td>${formatCurrency(item.remainingBudget)}</td>
        <td>${formatCurrency(item.costPerTask)}</td>
        <td><span class="status-pill ${atRisk ? "status-on-hold" : "status-active"}">${atRisk ? "Warning" : "Healthy"}</span></td>
      </tr>
    `;
  }).join("");
}
