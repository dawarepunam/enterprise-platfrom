let managerAttendanceRecords = [];

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await renderOperationsDesk();
});

async function renderOperationsDesk() {
  const snapshot = window.enterpriseStore?.getManagerOperationsSnapshot?.();
  if (!snapshot) return;

  try {
    const response = await API.get("/manager/attendance");
    managerAttendanceRecords = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    managerAttendanceRecords = snapshot.attendance || [];
  }

  hydrateAttendanceFilters(managerAttendanceRecords);
  bindAttendanceFilters();
  renderAttendanceTable();

  setText(
    "pendingApprovals",
    snapshot.approvals.pendingLeave + snapshot.approvals.pendingExpenses + snapshot.approvals.pendingTimesheets,
  );

  document.getElementById("approvalCards").innerHTML = [
    ...snapshot.approvals.leaveRequests.map(
      (item) => approvalCard("Leave Request", item.employee, `${item.fromDate} to ${item.toDate}`, item.status, "leaveRequests", item._id),
    ),
    ...snapshot.approvals.timesheets.map(
      (item) => approvalCard("Timesheet", item.employee, `${item.taskTitle} | ${item.hours}h`, item.status, "timesheets", item._id),
    ),
    ...snapshot.approvals.expenses.map(
      (item) => approvalCard("Expense", item.employee, `${formatCurrency(item.amount)} | ${item.category}`, item.status, "expenses", item._id),
    ),
  ].join("");
}

function hydrateAttendanceFilters(records = []) {
  const select = document.getElementById("attendanceDepartmentFilter");
  if (!select || select.dataset.ready === "true") return;
  const departments = Array.from(new Set(records.map((item) => String(item.department || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  select.innerHTML = '<option value="">All departments</option>' + departments.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  select.dataset.ready = "true";
}

function bindAttendanceFilters() {
  ["attendanceSearch", "attendanceDepartmentFilter", "attendanceDateFilter"].forEach((id) => {
    const node = document.getElementById(id);
    if (!node || node.dataset.bound === "true") return;
    node.addEventListener(id === "attendanceSearch" ? "input" : "change", renderAttendanceTable);
    node.dataset.bound = "true";
  });
}

function getFilteredAttendanceRecords() {
  const search = String(document.getElementById("attendanceSearch")?.value || "").trim().toLowerCase();
  const department = String(document.getElementById("attendanceDepartmentFilter")?.value || "").trim();
  const dateFilter = String(document.getElementById("attendanceDateFilter")?.value || "today");
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  return managerAttendanceRecords.filter((item) => {
    const haystack = [item.userName, item.employee, item.projectName, item.department, item.designation].join(" ").toLowerCase();
    const itemDateKey = String(item.date || item.createdAt || "").slice(0, 10);
    const itemDate = new Date(item.date || item.createdAt || 0);
    const daysDiff = Number.isNaN(itemDate.getTime()) ? Number.POSITIVE_INFINITY : Math.floor((now - itemDate) / 86400000);
    const matchesSearch = !search || haystack.includes(search);
    const matchesDepartment = !department || String(item.department || "").trim() === department;
    const matchesDate =
      !dateFilter ||
      (dateFilter === "today" && itemDateKey === todayKey) ||
      (dateFilter === "7" && daysDiff >= 0 && daysDiff < 7) ||
      (dateFilter === "30" && daysDiff >= 0 && daysDiff < 30);
    return matchesSearch && matchesDepartment && matchesDate;
  });
}

function renderAttendanceTable() {
  const records = getFilteredAttendanceRecords();
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRecords = managerAttendanceRecords.filter((item) => String(item.date || item.createdAt || "").slice(0, 10) === todayKey);
  const totalHours = records.reduce((sum, item) => sum + Number(item.hours || item.totalHours || item.effectiveHours || 0), 0);

  setText("presentToday", todayRecords.filter((item) => String(item.status || "").toLowerCase() !== "absent").length);
  setText("avgHours", records.length ? `${Math.round((totalHours / records.length) * 10) / 10}h` : "0h");

  document.getElementById("attendanceTable").innerHTML = records.length
    ? records
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.userName || item.employee || "Employee")}</td>
              <td>${escapeHtml(item.department || "-")}</td>
              <td>${escapeHtml(item.projectName || "Assigned project")}</td>
              <td><span class="status-pill ${statusClass(item.status || "Present")}">${escapeHtml(item.status || "Present")}</span></td>
              <td>${escapeHtml(item.checkInFormatted || item.checkIn || "-")}</td>
              <td>${escapeHtml(item.checkOutFormatted || item.checkOut || "-")}</td>
              <td>${Number(item.hours || item.totalHours || item.effectiveHours || 0)}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="7">No attendance records match the selected filters.</td></tr>';
}

function approvalCard(type, owner, detail, status, collection, id) {
  return `
    <article class="list-card">
      <strong>${type}</strong>
      <span class="list-meta">${escapeHtml(owner)} | ${escapeHtml(detail)}</span>
      <span class="status-note">Current status: ${escapeHtml(status)}</span>
      ${
        status === "Pending"
          ? `<div class="hero-actions"><button class="btn btn-primary" onclick="approveItem('${collection}','${id}','Approved')">Approve</button><button class="btn ghost-btn" onclick="approveItem('${collection}','${id}','Rejected')">Reject</button></div>`
          : ""
      }
    </article>
  `;
}

function approveItem(collection, id, status) {
  const map = {
    leaveRequests: ["getLeaveRequests", "upsertLeaveRequest"],
    timesheets: ["getTimesheets", "upsertTimesheet"],
    expenses: ["getExpenses", "upsertExpense"],
  };

  const [getter, setter] = map[collection] || [];
  if (!getter || !setter) return;

  const items = window.enterpriseStore?.[getter]?.() || [];
  const current = items.find((item) => item._id === id);
  if (!current) return;
  window.enterpriseStore?.[setter]?.({ ...current, status });
  showToast?.(`${status} successfully`, "success");
  renderOperationsDesk();
}
