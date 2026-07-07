document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "TEAM_LEAD" });
  if (!ready) return;
  renderLeadNotifications();
});

function renderLeadNotifications() {
  const currentUser = getCurrentUser?.() || {};
  const subtasks = window.enterpriseStore?.getSubtasks?.() || [];
  const communications = window.enterpriseStore?.getCommunications?.() || [];
  const tasks = window.enterpriseStore?.getTasks?.() || [];

  const items = [
    ...subtasks
      .filter((item) => String(item.reviewer || currentUser.name || "") === String(currentUser.name || "") && ["In Review", "Pending"].includes(item.status))
      .map((item) => ({
        title: `Review pending: ${item.title}`,
        note: `${item.assignee || "Member"} is waiting for lead approval.`,
        tag: "Review Queue",
      })),
    ...communications.map((item) => ({
      title: `${item.type}: ${item.title}`,
      note: `${item.projectName} • ${item.time}`,
      tag: "Meeting / Call",
    })),
    ...tasks
      .filter((item) => String(item.lead || "") === String(currentUser.name || "") && new Date(item.deadline) < new Date() && item.status !== "Completed")
      .map((item) => ({
        title: `Risk: ${item.title}`,
        note: `Deadline slipped for ${item.projectName}. Reassign, guide or escalate.`,
        tag: "Deadline Risk",
      })),
  ];

  document.getElementById("leadNotifications").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="list-card">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="list-meta">${escapeHtml(item.tag)}</span>
              <span class="status-note">${escapeHtml(item.note)}</span>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No urgent lead notifications right now.</p>';
}
