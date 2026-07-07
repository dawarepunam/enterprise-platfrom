document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MEMBER",
  });
  if (!ready) return;
  await renderMemberRewards();
});

async function renderMemberRewards() {
  const experience = await window.memberWorkflow.loadMemberExperience();
  const stats = window.memberWorkflow.deriveMemberStats(experience, experience.projects);
  const rewards = experience.rewards || [];

  setText("memberRewardCount", rewards.length);
  setText("memberRewardProjects", experience.projects.length);
  setText("memberRewardCompleted", stats.completed);

  document.getElementById("memberRewardCards").innerHTML = rewards.length
    ? rewards
        .map(
          (reward) => `
            <article class="list-card">
              <div class="project-titlebar">
                <div class="project-copy">
                  <strong>${escapeHtml(reward.badge || "Recognition")}</strong>
                  <p>${escapeHtml(reward.reason || "Recognition added by your manager.")}</p>
                </div>
                <span class="status-pill status-completed">Earned</span>
              </div>
              <div class="chip-row">
                <span class="icon-chip">${window.memberWorkflow.formatDateTime(reward.createdAt)}</span>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No rewards have been assigned yet.</p>';

  document.getElementById("memberRewardInsights").innerHTML = [
    ["Completed Tasks", stats.completed, "Approved or completed items"],
    ["In Review", stats.review, "Waiting for lead approval"],
    ["Unread Notifications", stats.notificationCount, "Pending alerts"],
    ["Assigned Projects", experience.projects.length, "Current project load"],
  ]
    .map(
      ([label, value, text]) => `
        <article class="workspace-tile">
          <strong>${label}</strong>
          <span>${value}</span>
          <p>${text}</p>
        </article>
      `,
    )
    .join("");
}
