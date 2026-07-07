document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  document.getElementById("timesheetForm")?.addEventListener("submit", submitTimesheet);
  await loadTimesheets();
});

async function loadTimesheets() {
  const data = await window.memberWorkflow.loadMemberData();
  document.getElementById("timesheetCards").innerHTML = (data.timesheets || []).length
    ? data.timesheets.map((item) => `<article class="list-card"><strong>${escapeHtml(item.taskTitle || "Work log")}</strong><span class="list-meta">${escapeHtml(item.date || "-")} • ${Number(item.hours || 0)} hours</span><span class="status-pill ${statusClass(item.status || "Pending")}">${escapeHtml(item.status || "Pending")}</span></article>`).join("")
    : '<p class="empty-state">No timesheet records yet.</p>';
}

async function submitTimesheet(event) {
  event.preventDefault();
  try {
    await apiRequest("/timesheets", { method: "POST", body: { taskTitle: document.getElementById("timesheetTask").value.trim(), date: document.getElementById("timesheetDate").value, hours: Number(document.getElementById("timesheetHours").value || 0), description: document.getElementById("timesheetDescription").value.trim() } });
    showToast?.("Timesheet submitted successfully.", "success", { title: "Timesheet Saved" });
    document.getElementById("timesheetForm").reset();
    await loadTimesheets();
  } catch (error) {
    showToast?.(error.message || "Unable to submit timesheet.", "error", { title: "Timesheet Failed" });
  }
}
