document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  const experience = await window.memberWorkflow.loadMemberExperience();
  const items = []
    .concat((experience.projects || []).filter((item) => item.deadline).map((item) => ({ title: `${item.projectName} deadline`, when: item.deadline, body: item.teamName || "Assigned Team" })))
    .concat((experience.subtasks || []).filter((item) => item.deadline).map((item) => ({ title: item.title, when: item.deadline, body: item.status || "Pending" })))
    .sort((left, right) => new Date(left.when || 0) - new Date(right.when || 0));

  document.getElementById("calendarList").innerHTML = items.length
    ? items.slice(0, 20).map((item) => `<article class="message-bubble"><strong>${escapeHtml(item.title)}</strong><p>${window.memberWorkflow.formatDateTime(item.when)}</p><p>${escapeHtml(item.body)}</p></article>`).join("")
    : '<div class="empty-inline">No meetings or deadlines are scheduled yet.</div>';
});
