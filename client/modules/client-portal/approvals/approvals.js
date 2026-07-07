document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "CLIENT" });
  if (!ready) return;
  const approvals = (window.enterpriseStore?.getQuotations?.() || []).filter((item) => item.status === "Pending");
  document.getElementById("approvalCards").innerHTML = approvals.length
    ? approvals.map((item) => `<article class="list-card"><strong>${escapeClient(item.title)}</strong><span class="list-meta">${escapeClient(item.client)} • ${escapeClient(item.status)}</span></article>`).join("")
    : '<p class="empty-state">No pending approvals.</p>';
});

function escapeClient(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
