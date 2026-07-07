document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  const experience = await window.memberWorkflow.loadMemberExperience();
  const messages = (experience.notifications || []).sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  document.getElementById("mailList").innerHTML = messages.length
    ? messages.map((item) => `<article class="message-bubble"><strong>${escapeHtml(item.title || "Project notification")}</strong><p>${window.memberWorkflow.formatDateTime(item.createdAt)}</p><p>${escapeHtml(item.message || item.details || "Message available in your workspace.")}</p></article>`).join("")
    : '<div class="empty-inline">No synced mail-style notifications yet.</div>';
});
