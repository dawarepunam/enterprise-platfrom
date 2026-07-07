document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  document.getElementById("rewardForm")?.addEventListener("submit", saveReward);
  renderRewards();
});

function saveReward(event) {
  event.preventDefault();
  window.managerHub?.addReward?.({
    memberName: document.getElementById("rewardMember").value,
    badge: document.getElementById("rewardBadge").value,
    reason: document.getElementById("rewardReason").value.trim() || "Manager recognition",
  });
  renderRewards();
}

function renderRewards() {
  const members = window.managerHub?.getManagerMembers?.() || [];
  const rewards = window.managerHub?.getRewards?.() || [];
  document.getElementById("rewardMember").innerHTML = members.map((member) => `<option>${escapeHtml(member.name)}</option>`).join("");
  document.getElementById("rewardMetrics").innerHTML = [
    ["Rewards", rewards.length, "AL"],
    ["Top Performer", rewards.filter((item) => item.badge === "Top Performer").length, "KP"],
    ["Attendance", rewards.filter((item) => item.badge === "Perfect Attendance").length, "AT"],
    ["Collaboration", rewards.filter((item) => item.badge === "Best Collaborator").length, "CH"],
  ].map(([label, value, icon]) => `
    <article class="manager-kpi">
      <span class="kpi-icon">${getNavIconSvg(icon)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");

  document.getElementById("rewardList").innerHTML = rewards.slice().reverse().map((reward) => `
    <article class="manager-list-item">
      <strong>${escapeHtml(reward.memberName)} • ${escapeHtml(reward.badge)}</strong>
      <p>${escapeHtml(reward.reason || "")}</p>
      <span class="muted-line">${formatShortDate(reward.createdAt)}</span>
    </article>
  `).join("");
}
