let employeeGrowthChart;
let attendanceAnalyticsChart;
let departmentPerformanceChart;
let payrollDistributionChart;
let reportData = null;
let reportSearchTimer = null;

const reportState = {
  page: 1,
  search: "",
  department: "",
  status: "",
  rows: [],
  pagination: {},
};

document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "reports",
    title: "Employee Reports",
    description: "Live workforce report and drilldown",
    onRealtime: () => {
      loadReports();
      loadReportEmployees();
    },
  });

  const params = new URLSearchParams(window.location.search);
  reportState.search = params.get("search") || "";
  reportState.department = params.get("department") || "";
  reportState.status = params.get("status") || "";

  bindReportFilters();
  document.getElementById("reportEmployeeSearch").value = reportState.search;
  document.getElementById("reportEmployeeStatusFilter").value = reportState.status;

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => exportReport(button.dataset.export));
  });

  loadReports();
  loadReportEmployees();
});

function bindReportFilters() {
  document.getElementById("reportEmployeeSearch").addEventListener("input", (event) => {
    clearTimeout(reportSearchTimer);
    reportSearchTimer = setTimeout(() => {
      reportState.search = event.target.value.trim();
      reportState.page = 1;
      syncReportQuery();
      loadReportEmployees();
    }, 260);
  });

  document.getElementById("reportEmployeeDepartmentFilter").addEventListener("change", (event) => {
    reportState.department = event.target.value;
    reportState.page = 1;
    syncReportQuery();
    loadReportEmployees();
  });

  document.getElementById("reportEmployeeStatusFilter").addEventListener("change", (event) => {
    reportState.status = event.target.value;
    reportState.page = 1;
    syncReportQuery();
    loadReportEmployees();
  });

  document.getElementById("reportEmployeesPrevBtn").addEventListener("click", () => {
    reportState.page = Math.max(1, reportState.page - 1);
    syncReportQuery();
    loadReportEmployees();
  });

  document.getElementById("reportEmployeesNextBtn").addEventListener("click", () => {
    reportState.page += 1;
    syncReportQuery();
    loadReportEmployees();
  });
}

function syncReportQuery() {
  const params = new URLSearchParams();
  if (reportState.search) params.set("search", reportState.search);
  if (reportState.department) params.set("department", reportState.department);
  if (reportState.status) params.set("status", reportState.status);
  if (reportState.page > 1) params.set("page", String(reportState.page));
  const query = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

async function loadReports() {
  try {
    const response = await API.get("/hr/reports");
    reportData = response.data || {};
    renderReports();
  } catch (error) {
    window.hrApp.toast(error.message, "error");
  }
}

async function loadReportEmployees() {
  const tbody = document.getElementById("reportEmployeesTableBody");
  tbody.innerHTML = `<tr><td colspan="7"><div class="hr-skeleton"></div></td></tr>`;

  const query = new URLSearchParams({
    page: String(reportState.page),
    limit: "8",
    search: reportState.search,
    department: reportState.department,
    status: reportState.status,
  });

  try {
    const response = await API.get(`/employees?${query.toString()}`);
    renderReportEmployees(response.data || {});
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
  }
}

function renderReportEmployees(data) {
  reportState.rows = data.items || [];
  reportState.pagination = data.pagination || {};

  const departmentFilter = document.getElementById("reportEmployeeDepartmentFilter");
  departmentFilter.innerHTML = `<option value="">All Departments</option>${(data.filters?.departments || []).map((item) => `<option value="${item}">${item}</option>`).join("")}`;
  departmentFilter.value = reportState.department;

  renderReportSummary(data.summary || {});

  document.getElementById("reportPaginationMeta").textContent = `Page ${reportState.pagination.page || 1} of ${reportState.pagination.totalPages || 1}`;
  document.getElementById("reportEmployeeCount").textContent = `${reportState.pagination.total || 0} employees matched`;
  document.getElementById("reportEmployeesPrevBtn").disabled = (reportState.pagination.page || 1) <= 1;
  document.getElementById("reportEmployeesNextBtn").disabled = (reportState.pagination.page || 1) >= (reportState.pagination.totalPages || 1);

  document.getElementById("reportEmployeesTableBody").innerHTML = reportState.rows.length ? reportState.rows.map((employee) => `
    <tr data-report-employee="${employee._id}">
      <td>
        <div class="hr-user-cell">
          <img class="hr-avatar" src="${employee.profilePhoto || window.hrApp.defaultAvatar}" alt="${employee.name}" />
          <div>
            <strong>${employee.name}</strong>
            <div class="hr-meta">${employee.employeeId || employee.email}</div>
          </div>
        </div>
      </td>
      <td>${employee.department || "Unassigned"}</td>
      <td>
        <div><strong>${employee.designation || employee.role || "Member"}</strong></div>
        <div class="hr-meta">${employee.role || "MEMBER"}</div>
      </td>
      <td>
        <div>${employee.email}</div>
        <div class="hr-meta">${employee.phone || "No phone"}</div>
      </td>
      <td>${window.hrApp.formatDate(employee.joiningDate, { dateStyle: "medium" })}</td>
      <td><span class="hr-status ${window.hrApp.statusClass(employee.status)}">${employee.status || "ACTIVE"}</span></td>
      <td>
        <button class="hr-btn primary" data-open-profile="${employee._id}">Open Profile</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="7">No employees matched your filters.</td></tr>`;

  document.querySelectorAll("[data-report-employee]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      window.hrApp.navigate(`/hr/employee-profile.html?id=${row.dataset.reportEmployee}`);
    });
  });

  document.querySelectorAll("[data-open-profile]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      window.hrApp.navigate(`/hr/employee-profile.html?id=${button.dataset.openProfile}`);
    });
  });
}

function renderReportSummary(summary) {
  document.getElementById("reportSummaryCards").innerHTML = [
    ["Total Employees", summary.totalEmployees, "Complete workforce synced to the report view."],
    ["Active Employees", summary.activeEmployees, "Live active headcount available for drilldown."],
    ["Inactive Employees", summary.inactiveEmployees, "Blocked, inactive, or paused records."],
    ["New Joiners", summary.newJoiners, "Latest hires entering this month."],
  ].map(([label, value, meta]) => `
    <article class="hr-metric-card hr-fade-enter">
      <span class="hr-metric-badge">${label}</span>
      <strong>${window.hrApp.formatNumber(value || 0)}</strong>
      <div class="dashboard-mini">
        <span>${meta}</span>
        <span>Live</span>
      </div>
    </article>
  `).join("");
}

function renderReports() {
  const growthMap = (reportData.employeeGrowth || []).reduce((acc, item) => {
    acc[item.month] = (acc[item.month] || 0) + 1;
    return acc;
  }, {});
  const growthLabels = Object.keys(growthMap).sort();

  employeeGrowthChart?.destroy();
  employeeGrowthChart = new Chart(document.getElementById("employeeGrowthChart"), {
    type: "bar",
    data: {
      labels: growthLabels,
      datasets: [{ label: "New Employees", data: growthLabels.map((label) => growthMap[label]), backgroundColor: "#7b5cff" }],
    },
    options: {
      plugins: { legend: { labels: { color: "#cbd5e1" } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
      },
    },
  });

  const deptItems = reportData.departmentPerformance || [];
  departmentPerformanceChart?.destroy();
  departmentPerformanceChart = new ApexCharts(document.getElementById("departmentPerformanceChart"), {
    chart: { type: "bar", height: 320, toolbar: { show: false } },
    series: [
      { name: "Employees", data: deptItems.map((item) => item.employees) },
      { name: "Projects", data: deptItems.map((item) => item.projects) },
    ],
    xaxis: {
      categories: deptItems.map((item) => item.department),
      labels: { style: { colors: "#94a3b8" } },
    },
    yaxis: { labels: { style: { colors: "#94a3b8" } } },
    grid: { borderColor: "rgba(148,163,184,0.08)" },
    legend: { labels: { colors: "#cbd5e1" } },
    tooltip: { theme: "dark" },
    colors: ["#16c3ff", "#7b5cff"],
  });
  departmentPerformanceChart.render();

  const lateMap = (reportData.attendanceAnalytics || []).reduce((acc, item) => {
    const key = item.date || new Date(item.createdAt).toISOString().slice(0, 10);
    acc[key] = (acc[key] || 0) + Number(item.hours || 0);
    return acc;
  }, {});
  const attendanceLabels = Object.keys(lateMap).sort().slice(-12);
  attendanceAnalyticsChart?.destroy();
  attendanceAnalyticsChart = new Chart(document.getElementById("attendanceAnalyticsChart"), {
    type: "line",
    data: {
      labels: attendanceLabels,
      datasets: [{ label: "Hours Logged", data: attendanceLabels.map((item) => lateMap[item]), borderColor: "#16c3ff", fill: false, tension: 0.35 }],
    },
    options: {
      plugins: { legend: { labels: { color: "#cbd5e1" } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
      },
    },
  });

  const payrollByDepartment = deptItems.map((item) => item.payroll);
  payrollDistributionChart?.destroy();
  payrollDistributionChart = new ApexCharts(document.getElementById("payrollDistributionChart"), {
    chart: { type: "donut", height: 320, toolbar: { show: false } },
    labels: deptItems.map((item) => item.department),
    series: payrollByDepartment,
    legend: { position: "bottom", labels: { colors: "#cbd5e1" } },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => window.hrApp.formatCurrency(value),
      },
    },
    colors: ["#7b5cff", "#16c3ff", "#18b07a", "#ffb44c", "#ff5f7f"],
  });
  payrollDistributionChart.render();

  document.getElementById("departmentReportTableBody").innerHTML = deptItems.map((item) => `
    <tr>
      <td>${item.department}</td>
      <td>${item.employees}</td>
      <td>${item.projects}</td>
      <td>${window.hrApp.formatCurrency(item.payroll)}</td>
    </tr>
  `).join("");
}

function exportReport(format) {
  const rows = reportState.rows.length ? reportState.rows : reportData?.exports?.employees || [];
  if (format === "pdf") {
    window.print();
    return;
  }

  const fileName = format === "excel" ? "employee-report.xls" : "employee-report.csv";
  window.hrApp.csvDownload(rows, fileName);
}
