document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  await renderMemberNotifications();
});

async function renderMemberNotifications() {
  const data = await window.memberWorkflow.loadMemberData();
  document.getElementById("memberNotificationCards").innerHTML = (data.notifications || []).length
    ? data.notifications.map((item) => `<article class="list-card"><strong>${escapeHtml(item.title || "Notification")}</strong><span class="list-meta">${window.memberWorkflow.formatDateTime(item.createdAt)} • ${escapeHtml(item.priority || item.type || "info")}</span><span class="status-note">${escapeHtml(item.message || "")}</span></article>`).join("")
    : '<p class="empty-state">No notifications available right now.</p>';
}
