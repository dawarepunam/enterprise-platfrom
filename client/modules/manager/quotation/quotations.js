document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  renderQuotationReview();
});

function renderQuotationReview() {
  const quotations = window.enterpriseStore?.getQuotations?.() || [];
  setText("pendingQuoteCount", quotations.filter((item) => item.status === "Pending").length);
  setText("quoteValue", formatCurrency(quotations.reduce((sum, item) => sum + Number(item.amount || 0), 0)));

  document.getElementById("quotationTable").innerHTML = quotations
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.client)}</td>
          <td>${formatCurrency(item.amount)}</td>
          <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td>${formatShortDate(item.dueDate)}</td>
          <td>
            ${
              item.status === "Pending"
                ? `<button class="btn btn-primary" onclick="forwardQuotation('${item._id}')">Forward To Admin</button>`
                : '<span class="status-note">Already processed</span>'
            }
          </td>
        </tr>
      `,
    )
    .join("");
}

function forwardQuotation(id) {
  const quotations = window.enterpriseStore?.getQuotations?.() || [];
  const current = quotations.find((item) => item._id === id);
  if (!current) return;
  window.enterpriseStore?.upsertQuotation?.({ ...current, status: "Approved" });
  showToast?.("Quotation forwarded to admin approval", "success");
  renderQuotationReview();
}
