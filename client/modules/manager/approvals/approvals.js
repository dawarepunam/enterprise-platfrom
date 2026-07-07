document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  renderApprovals();
});

function renderApprovals() {
  const quotations = window.enterpriseStore?.getQuotations?.() || [];
  const approvedValue = quotations
    .filter((item) => item.status === "Approved")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  setText("approvalCount", quotations.filter((item) => item.status === "Pending").length);
  setText("approvedValue", formatCurrency(approvedValue));

  document.getElementById("approvalTable").innerHTML = quotations
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.client)}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
        <td>${formatShortDate(item.dueDate)}</td>
        <td>
          <button class="btn btn-primary" onclick="updateQuotationStatus('${item._id}', 'Approved')">Approve</button>
          <button class="btn btn-secondary" onclick="updateQuotationStatus('${item._id}', 'Rejected')">Reject</button>
        </td>
      </tr>
    `)
    .join("");
}

function updateQuotationStatus(id, status) {
  const quotations = window.enterpriseStore?.getQuotations?.() || [];
  const current = quotations.find((item) => item._id === id);
  if (!current) return;

  window.enterpriseStore?.upsertQuotation?.({ ...current, status });
  renderApprovals();
}
