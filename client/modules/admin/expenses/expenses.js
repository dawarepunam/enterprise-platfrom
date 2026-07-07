const API_URL = "http://localhost:5000/api/expenses";

let expenses = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchExpenses();

  document
    .getElementById("searchInput")
    .addEventListener("input", renderExpenses);
  document
    .getElementById("statusFilter")
    .addEventListener("change", renderExpenses);
  document
    .getElementById("categoryFilter")
    .addEventListener("change", renderExpenses);

  document.getElementById("exportBtn").addEventListener("click", () => {
    alert("Expense report export started.");
  });
});

async function fetchExpenses() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to fetch expenses");

    expenses = await response.json();
    renderExpenses();
    updateStats();
  } catch (error) {
    console.error("Error fetching expenses:", error);

    // Demo Data if backend not connected
    expenses = [
      {
        _id: "1",
        employee: "Amit Patil",
        category: "Travel",
        amount: 2500,
        date: "2026-05-10",
        receiptUrl: "#",
        status: "Pending",
      },
      {
        _id: "2",
        employee: "Sneha Deshmukh",
        category: "Food",
        amount: 850,
        date: "2026-05-09",
        receiptUrl: "#",
        status: "Approved",
      },
      {
        _id: "3",
        employee: "Rahul Shinde",
        category: "Marketing",
        amount: 5000,
        date: "2026-05-08",
        receiptUrl: "#",
        status: "Rejected",
      },
    ];

    renderExpenses();
    updateStats();
  }
}

function renderExpenses() {
  const tbody = document.getElementById("expensesTableBody");
  const search = document.getElementById("searchInput").value.toLowerCase();
  const statusFilter = document.getElementById("statusFilter").value;
  const categoryFilter = document.getElementById("categoryFilter").value;

  const filtered = expenses.filter((exp) => {
    const matchesSearch =
      exp.employee.toLowerCase().includes(search) ||
      exp.category.toLowerCase().includes(search);

    const matchesStatus = !statusFilter || exp.status === statusFilter;

    const matchesCategory = !categoryFilter || exp.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#6b7280;">
          No expense claims found.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((exp) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${exp.employee}</td>
      <td>${exp.category}</td>
      <td>₹${Number(exp.amount).toLocaleString("en-IN")}</td>
      <td>${formatDate(exp.date)}</td>
      <td>
        <a href="${exp.receiptUrl}" target="_blank" class="receipt-link">
          View Receipt
        </a>
      </td>
      <td>
        <span class="status ${exp.status.toLowerCase()}">
          ${exp.status}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewExpense('${exp._id}')">
            View
          </button>
          <button class="btn-action btn-approve" onclick="updateStatus('${exp._id}', 'Approved')">
            Approve
          </button>
          <button class="btn-action btn-reject" onclick="updateStatus('${exp._id}', 'Rejected')">
            Reject
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function updateStats() {
  document.getElementById("totalClaims").textContent = expenses.length;

  const pending = expenses.filter((e) => e.status === "Pending").length;
  const rejected = expenses.filter((e) => e.status === "Rejected").length;

  const approvedAmount = expenses
    .filter((e) => e.status === "Approved")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  document.getElementById("pendingClaims").textContent = pending;
  document.getElementById("rejectedClaims").textContent = rejected;
  document.getElementById("approvedAmount").textContent =
    `₹${approvedAmount.toLocaleString("en-IN")}`;
}

function viewExpense(id) {
  const expense = expenses.find((e) => e._id === id);
  if (!expense) return;

  alert(
    `Employee: ${expense.employee}
Category: ${expense.category}
Amount: ₹${expense.amount}
Status: ${expense.status}`,
  );
}

async function updateStatus(id, newStatus) {
  try {
    const response = await fetch(`${API_URL}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) throw new Error("Failed to update status");
  } catch (error) {
    console.warn("Backend not available. Updating locally.");
  }

  const expense = expenses.find((e) => e._id === id);
  if (expense) {
    expense.status = newStatus;
  }

  renderExpenses();
  updateStats();
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
