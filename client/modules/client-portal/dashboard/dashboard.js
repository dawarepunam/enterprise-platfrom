document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "CLIENT",
  });
  if (!ready) return;
  renderClientDashboard();
});

function renderClientDashboard() {
  const snapshot = window.enterpriseStore?.getClientSnapshot?.();
  if (!snapshot) return;

  setText("clientProjects", snapshot.projects.length);
  setText("clientApprovals", snapshot.approvalsNeeded);
  setText("clientApproved", snapshot.approvedCount);

  document.getElementById("clientProjectTable").innerHTML = snapshot.projects
    .map((project) => `
      <tr>
        <td>${escapeHtml(project.projectName)}</td>
        <td><span class="status-pill ${statusClass(project.status)}">${escapeHtml(project.status)}</span></td>
        <td><span class="priority-pill ${priorityClass(project.priority)}">${escapeHtml(project.priority)}</span></td>
        <td>${formatShortDate(project.deadline)}</td>
      </tr>
    `)
    .join("");
}
