document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  const experience = await window.memberWorkflow.loadMemberExperience();
  const items = []
    .concat((experience.dailyUpdates || []).map((item) => ({ title: item.summary || "Daily update", meta: window.memberWorkflow.formatDateTime(item.createdAt), body: item.blockers || "No blockers reported", createdAt: item.createdAt })))
    .concat((experience.notifications || []).map((item) => ({ title: item.title || "Notification", meta: window.memberWorkflow.formatDateTime(item.createdAt), body: item.message || item.details || "Workspace alert", createdAt: item.createdAt })))
    .concat((experience.timerHistory || []).map((item) => ({ title: item.taskTitle || "Tracked work", meta: `${window.memberWorkflow.formatDateTime(item.endedAt)} | ${item.hours} hours`, body: item.note || item.projectName || "Tracked from workspace timer", createdAt: item.endedAt })))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  document.getElementById("historyList").innerHTML = items.length
    ? items.map((item) => `<article class="message-bubble"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.meta)}</p><p>${escapeHtml(item.body)}</p></article>`).join("")
    : '<div class="empty-inline">No work history available yet.</div>';
});
