document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "leaves",
    title: "Leave Management",
    description: "Review and approve workforce leave",
    onRealtime: () => loadLeaves(),
  });
  loadLeaves();
});

async function loadLeaves() {
  window.hrApp.renderSkeletons("#leaveSummaryCards", 5);
  window.hrApp.renderSkeletons("#leaveTypeList", 4);
  window.hrApp.renderSkeletons("#leaveQueueList", 4);
  document.getElementById("leaveTableBody").innerHTML = `<tr><td colspan="7"><div class="hr-skeleton"></div></td></tr>`;

  try {
    const response = await API.get("/hr/leaves");
    renderLeaves(response.data || {});
  } catch (error) {
    window.hrApp.toast(error.message, "error");
  }
}

function renderLeaves(data) {
  const cards = data.cards || {};
  document.getElementById("leaveSummaryCards").innerHTML = [
    ["Total Requests", cards.total],
    ["Pending", cards.pending],
    ["Approved", cards.approved],
    ["Rejected", cards.rejected],
    ["On Hold", cards.onHold],
  ].map(([label, value]) => `
    <article class="hr-metric-card">
      <p class="hr-meta">${label}</p>
      <strong>${window.hrApp.formatNumber(value || 0)}</strong>
    </article>
  `).join("");

  document.getElementById("leaveTypeList").innerHTML = (data.leaveTypes || []).length ? data.leaveTypes.map((item) => `
    <article class="hr-list-item">
      <div>
        <strong>${item.label}</strong>
        <div class="hr-meta">Leave category requests</div>
      </div>
      <span class="hr-pill">${window.hrApp.formatNumber(item.value)}</span>
    </article>
  `).join("") : `<div class="hr-empty">No leave requests yet.</div>`;

  const pendingItems = (data.items || []).filter((item) => /pending/i.test(String(item.status || ""))).slice(0, 5);
  document.getElementById("leaveQueueList").innerHTML = pendingItems.length ? pendingItems.map((item) => `
    <article class="hr-list-item">
      <div>
        <strong>${item.employee || "Employee"}</strong>
        <div class="hr-meta">${item.fromDate || "-"} to ${item.toDate || "-"} | ${item.leaveType || item.category || "General"}</div>
      </div>
      <div class="hr-button-row">
        <button class="hr-btn success" data-leave-action="approve" data-id="${item._id}">Approve</button>
        <button class="hr-btn danger" data-leave-action="reject" data-id="${item._id}">Reject</button>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No pending leave requests right now.</div>`;

  document.getElementById("leaveTableBody").innerHTML = (data.items || []).length ? data.items.map((item) => `
    <tr>
      <td>${item.employee || "-"}</td>
      <td>${item.leaveType || item.category || "-"}</td>
      <td>${item.fromDate || "-"}</td>
      <td>${item.toDate || "-"}</td>
      <td>${item.reason || "-"}</td>
      <td><span class="hr-status ${window.hrApp.statusClass(item.status)}">${item.status || "Pending"}</span></td>
      <td>
        <div class="hr-button-row">
          <button class="hr-btn success" data-leave-action="approve" data-id="${item._id}">Approve</button>
          <button class="hr-btn warning" data-leave-action="hold" data-id="${item._id}">Hold</button>
          <button class="hr-btn danger" data-leave-action="reject" data-id="${item._id}">Reject</button>
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="7">No leave requests found.</td></tr>`;

  document.querySelectorAll("[data-leave-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.leaveAction;
      const confirmed = await window.hrApp.confirmDialog({
        title: `${action[0].toUpperCase()}${action.slice(1)} leave request?`,
        text: "This will update the leave status immediately.",
        confirmButtonText: action[0].toUpperCase() + action.slice(1),
      });
      if (!confirmed) return;
      await apiRequest(`/leaves/${action}/${button.dataset.id}`, "PATCH", {});
      window.hrApp.toast(`Leave ${action}d successfully`);
      loadLeaves();
    });
  });
}
