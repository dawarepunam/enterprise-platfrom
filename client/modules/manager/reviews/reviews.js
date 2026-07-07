document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  document.getElementById("reviewForm")?.addEventListener("submit", saveReview);
  renderReviews();
});

function saveReview(event) {
  event.preventDefault();
  window.managerHub?.addReview?.({
    memberName: document.getElementById("reviewMember").value,
    topic: document.getElementById("reviewTopic").value.trim(),
    goals: document.getElementById("reviewGoals").value.split("\n").map((item) => item.trim()).filter(Boolean),
    concerns: document.getElementById("reviewConcerns").value.split("\n").map((item) => item.trim()).filter(Boolean),
    promotionDiscussion: document.getElementById("reviewPromotion").value.trim(),
  });
  renderReviews();
}

function renderReviews() {
  const members = window.managerHub?.getManagerMembers?.() || [];
  const reviews = window.managerHub?.getReviews?.() || [];
  document.getElementById("reviewMember").innerHTML = members.map((member) => `<option>${escapeHtml(member.name)}</option>`).join("");
  document.getElementById("reviewMetrics").innerHTML = [
    ["Reviews", reviews.length, "PR"],
    ["Members", new Set(reviews.map((item) => item.memberName)).size, "TM"],
    ["Promotion Notes", reviews.filter((item) => item.promotionDiscussion).length, "KP"],
    ["Goals Logged", reviews.reduce((sum, item) => sum + (item.goals || []).length, 0), "AN"],
  ].map(([label, value, icon]) => `
    <article class="manager-kpi">
      <span class="kpi-icon">${getNavIconSvg(icon)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");

  document.getElementById("reviewList").innerHTML = reviews.slice().reverse().map((review) => `
    <article class="manager-list-item">
      <strong>${escapeHtml(review.memberName)} • ${escapeHtml(review.topic)}</strong>
      <p>Goals: ${(review.goals || []).map(escapeHtml).join(", ") || "None"}</p>
      <span class="muted-line">Concerns: ${(review.concerns || []).map(escapeHtml).join(", ") || "None"}</span>
      <span class="muted-line">${escapeHtml(review.promotionDiscussion || "")}</span>
    </article>
  `).join("");
}
