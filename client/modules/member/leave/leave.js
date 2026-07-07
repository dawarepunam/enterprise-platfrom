document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  document.getElementById("leaveForm")?.addEventListener("submit", submitLeave);
  await loadLeaves();
});

async function loadLeaves() {
  const data = await window.memberWorkflow.loadMemberData();
  document.getElementById("leaveCards").innerHTML = (data.leave || []).length
    ? data.leave.map((item) => `<article class="list-card"><strong>${escapeHtml(item.leaveType || item.category || "Leave")}</strong><span class="list-meta">${escapeHtml(item.fromDate)} to ${escapeHtml(item.toDate)}</span><span class="status-pill ${statusClass(item.status || "Pending")}">${escapeHtml(item.status || "Pending")}</span></article>`).join("")
    : '<p class="empty-state">No leave applications found.</p>';
}

async function submitLeave(event) {
  event.preventDefault();
  try {
    await apiRequest("/leave", { method: "POST", body: { leaveType: document.getElementById("leaveType").value, fromDate: document.getElementById("leaveFromDate").value, toDate: document.getElementById("leaveToDate").value, reason: document.getElementById("leaveReason").value.trim() } });
    showToast?.("Leave application submitted successfully.", "success", { title: "Leave Applied" });
    document.getElementById("leaveForm").reset();
    await loadLeaves();
  } catch (error) {
    showToast?.(error.message || "Unable to apply leave.", "error", { title: "Leave Failed" });
  }
}
