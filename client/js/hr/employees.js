const employeeState = {
  page: 1,
  search: "",
  department: "",
  status: "",
  rows: [],
};

let employeeSearchTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "employees",
    title: "Employees",
    description: "Search and workforce actions",
    onRealtime: () => loadEmployees(),
  });
  const params = new URLSearchParams(window.location.search);
  employeeState.status = params.get("status") || "";
  employeeState.department = params.get("department") || "";
  employeeState.search = params.get("search") || "";
  bindEmployeeFilters();
  document.getElementById("employeeSearch").value = employeeState.search;
  document.getElementById("employeeStatusFilter").value = employeeState.status;
  loadEmployees();
});

function bindEmployeeFilters() {
  document.getElementById("employeeSearch").addEventListener("input", (event) => {
    clearTimeout(employeeSearchTimer);
    employeeSearchTimer = setTimeout(() => {
      employeeState.search = event.target.value.trim();
      employeeState.page = 1;
      loadEmployees();
    }, 280);
  });

  document.getElementById("employeeDepartmentFilter").addEventListener("change", (event) => {
    employeeState.department = event.target.value;
    employeeState.page = 1;
    loadEmployees();
  });

  document.getElementById("employeeStatusFilter").addEventListener("change", (event) => {
    employeeState.status = event.target.value;
    employeeState.page = 1;
    loadEmployees();
  });

  document.getElementById("employeesPrevBtn").addEventListener("click", () => {
    employeeState.page = Math.max(1, employeeState.page - 1);
    loadEmployees();
  });

  document.getElementById("employeesNextBtn").addEventListener("click", () => {
    employeeState.page += 1;
    loadEmployees();
  });

  document.getElementById("employeeExportBtn").addEventListener("click", () => {
    window.hrApp.csvDownload(employeeState.rows, "employees-export.csv");
  });
}

async function loadEmployees() {
  const tbody = document.getElementById("employeesTableBody");
  const cardGrid = document.getElementById("employeeCardGrid");
  tbody.innerHTML = `<tr><td colspan="10"><div class="hr-skeleton"></div></td></tr>`;
  window.hrApp.renderSkeletons(cardGrid, 6);

  const query = new URLSearchParams({
    page: employeeState.page,
    limit: 10,
    search: employeeState.search,
    department: employeeState.department,
    status: employeeState.status,
  });

  try {
    const response = await API.get(`/employees?${query.toString()}`);
    renderEmployees(response.data || {});
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="10">${error.message}</td></tr>`;
    cardGrid.innerHTML = `<div class="hr-empty">${error.message}</div>`;
  }
}

function renderEmployees(data) {
  employeeState.rows = data.items || [];
  const tbody = document.getElementById("employeesTableBody");
  const pagination = data.pagination || {};
  document.getElementById("employeesPaginationMeta").textContent = `Page ${pagination.page || 1} of ${pagination.totalPages || 1} | ${pagination.total || 0} employees`;

  const departmentFilter = document.getElementById("employeeDepartmentFilter");
  const selectedDepartment = employeeState.department;
  departmentFilter.innerHTML = `<option value="">All Departments</option>${(data.filters?.departments || []).map((item) => `<option value="${item}">${item}</option>`).join("")}`;
  departmentFilter.value = selectedDepartment;
  renderEmployeeSummary(data.summary || {});

  document.getElementById("employeeCardGrid").innerHTML = employeeState.rows.length ? employeeState.rows.map((employee, index) => `
    <article class="employee-mini-card hr-fade-enter" data-employee-card="${employee._id}" style="animation-delay:${index * 40}ms">
      <div class="employee-mini-card-head">
        <div class="hr-user-cell">
          <img class="hr-avatar" src="${employee.profilePhoto || window.hrApp.defaultAvatar}" alt="${employee.name}" />
          <div>
            <strong>${employee.name}</strong>
            <div class="hr-meta">${employee.employeeId}</div>
          </div>
        </div>
        <span class="hr-status ${window.hrApp.statusClass(employee.status)}">${employee.status || "ACTIVE"}</span>
      </div>
      <div class="employee-mini-card-meta">
        <div class="hr-meta">${employee.designation || "Role not set"}</div>
        <div class="employee-tag-row">
          <span class="employee-tag">${employee.department || "Unassigned"}</span>
          <span class="employee-tag">${employee.role || "Member"}</span>
        </div>
        <div class="hr-meta">${employee.email}</div>
      </div>
      <div class="employee-hover-panel">
        <div class="hr-meta">Joined ${window.hrApp.formatDate(employee.joiningDate, { dateStyle: "medium" })}</div>
        <div class="hr-meta">${employee.phone || "No phone on file"}</div>
      </div>
      <div class="employee-mini-card-actions">
        <button class="hr-btn" data-action="view" data-id="${employee._id}">View</button>
        <button class="hr-btn" data-action="edit" data-id="${employee._id}" data-name="${employee.name}" data-dept="${employee.department || ""}">Edit</button>
        <button class="hr-btn warning" data-action="promote" data-id="${employee._id}" data-designation="${employee.designation || ""}">Promote</button>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No employees matched your filters.</div>`;

  tbody.innerHTML = employeeState.rows.length ? employeeState.rows.map((employee) => `
    <tr data-employee-row="${employee._id}">
      <td>${employee.employeeId || "-"}</td>
      <td>
        <img class="hr-avatar" src="${employee.profilePhoto || window.hrApp.defaultAvatar}" alt="${employee.name}" />
      </td>
      <td>
        <strong>${employee.name}</strong><br />
        <span class="hr-meta">${employee.role || "-"}</span>
      </td>
      <td>${employee.department || "-"}</td>
      <td>${employee.email}</td>
      <td>${employee.phone || "-"}</td>
      <td>${employee.designation || "-"}</td>
      <td>${window.hrApp.formatDate(employee.joiningDate, { dateStyle: "medium" })}</td>
      <td><span class="hr-status ${window.hrApp.statusClass(employee.status)}">${employee.status || "ACTIVE"}</span></td>
      <td>
        <div class="hr-user-cell">
          <button class="hr-btn" data-action="view" data-id="${employee._id}">View</button>
          <button class="hr-btn" data-action="edit" data-id="${employee._id}" data-name="${employee.name}" data-dept="${employee.department || ""}">Edit</button>
          <button class="hr-btn" data-action="attendance" data-id="${employee._id}">Attendance</button>
          <button class="hr-btn" data-action="leave" data-id="${employee._id}">Leave</button>
          <button class="hr-btn primary" data-action="payroll" data-id="${employee._id}">Payroll</button>
          <button class="hr-btn danger" data-action="suspend" data-id="${employee._id}">Suspend</button>
          <button class="hr-btn danger" data-action="delete" data-id="${employee._id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="10">No employees matched your filters.</td></tr>`;

  document.querySelectorAll("[data-employee-row], [data-employee-card]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      const id = row.dataset.employeeRow || row.dataset.employeeCard;
      window.hrApp.navigate(`/hr/employee-profile.html?id=${id}`);
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleEmployeeAction(button.dataset.action, button.dataset);
    });
  });
}

function renderEmployeeSummary(summary) {
  document.getElementById("employeeSummaryCards").innerHTML = [
    ["Total Employees", summary.totalEmployees, "/hr/employees.html"],
    ["Active Employees", summary.activeEmployees, "/hr/employees.html?status=ACTIVE"],
    ["Inactive Employees", summary.inactiveEmployees, "/hr/employees.html?status=INACTIVE"],
    ["New Joiners", summary.newJoiners, "/hr/employees.html?status=ACTIVE"],
  ].map(([label, value, href]) => `
    <a class="hr-metric-card text-decoration-none" href="${href}">
      <p class="hr-meta">${label}</p>
      <strong>${window.hrApp.formatNumber(value || 0)}</strong>
      <div class="hr-meta">Open filtered list</div>
    </a>
  `).join("");
}

async function handleEmployeeAction(action, payload) {
  if (action === "view") {
    window.hrApp.navigate(`/hr/employee-profile.html?id=${payload.id}`);
    return;
  }

  if (action === "edit") {
    const result = await window.hrApp.inputDialog({
      title: `Edit ${payload.name}`,
      html: `<input id="swal-name" class="swal2-input" value="${payload.name || ""}" placeholder="Name" /><input id="swal-dept" class="swal2-input" value="${payload.dept || ""}" placeholder="Department" />`,
      preConfirm: () => ({
        name: document.getElementById("swal-name").value,
        department: document.getElementById("swal-dept").value,
      }),
    });
    if (!result.isConfirmed) return;
    await API.put(`/users/${payload.id}`, result.value);
    window.hrApp.toast("Employee updated");
    loadEmployees();
    return;
  }

  if (action === "promote") {
    const result = await window.hrApp.inputDialog({
      title: "Promote employee",
      input: "text",
      inputValue: payload.designation || "",
      inputPlaceholder: "New designation",
    });
    if (!result.isConfirmed) return;
    await API.put(`/users/${payload.id}`, { designation: result.value, title: result.value });
    window.hrApp.toast("Designation updated");
    loadEmployees();
    return;
  }

  if (action === "attendance") {
    window.hrApp.navigate(`/hr/attendance.html?employee=${payload.id}`);
    return;
  }

  if (action === "leave") {
    window.hrApp.navigate(`/hr/leaves.html?employee=${payload.id}`);
    return;
  }

  if (action === "payroll") {
    window.hrApp.navigate(`/hr/payroll.html?employee=${payload.id}`);
    return;
  }

  if (action === "suspend") {
    const confirmed = await window.hrApp.confirmDialog({
      title: "Suspend this employee?",
      text: "This will update the status to BLOCKED.",
      confirmButtonText: "Suspend",
      icon: "warning",
    });
    if (!confirmed) return;
    await API.put(`/users/${payload.id}`, { status: "BLOCKED" });
    window.hrApp.toast("Employee suspended");
    loadEmployees();
    return;
  }

  if (action === "delete") {
    const confirmed = await window.hrApp.confirmDialog({
      title: "Delete employee?",
      text: "This action removes the record from MongoDB.",
      confirmButtonText: "Delete",
      icon: "warning",
    });
    if (!confirmed) return;
    await API.delete(`/users/${payload.id}`);
    window.hrApp.toast("Employee deleted");
    loadEmployees();
  }
}
