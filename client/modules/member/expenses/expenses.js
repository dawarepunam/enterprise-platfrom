document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  document.getElementById("expenseForm")?.addEventListener("submit", submitExpense);
  await loadExpenses();
});

async function loadExpenses() {
  const data = await window.memberWorkflow.loadMemberData();
  document.getElementById("expenseCards").innerHTML = (data.expenses || []).length
    ? data.expenses.map((item) => `<article class="list-card"><strong>${escapeHtml(item.title || item.category || "Expense")}</strong><span class="list-meta">INR ${Number(item.amount || 0)} • ${escapeHtml(item.purpose || "")}</span><span class="status-pill ${statusClass(item.status || "Pending")}">${escapeHtml(item.status || "Pending")}</span></article>`).join("")
    : '<p class="empty-state">No expense claims yet.</p>';
}

async function submitExpense(event) {
  event.preventDefault();
  try {
    await apiRequest("/expenses", { method: "POST", body: { title: document.getElementById("expenseTitle").value.trim(), amount: Number(document.getElementById("expenseAmount").value || 0), receipt: document.getElementById("expenseReceipt").value.trim(), purpose: document.getElementById("expensePurpose").value.trim() } });
    showToast?.("Expense submitted successfully.", "success", { title: "Expense Saved" });
    document.getElementById("expenseForm").reset();
    await loadExpenses();
  } catch (error) {
    showToast?.(error.message || "Unable to submit expense.", "error", { title: "Expense Failed" });
  }
}
