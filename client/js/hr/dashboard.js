let attendanceChart;
let departmentChart;
let leaveBreakdownChart;
let payrollDepartmentChart;
let performanceOverviewChart;

document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "dashboard",
    title: "HR Dashboard",
    description: "Live people operations pulse",
    onRealtime: () => loadDashboard(),
  });
  loadDashboard();
});

async function loadDashboard() {
  window.hrApp.renderSkeletons("#dashboardCards", 9);
  window.hrApp.renderSkeletons("#dashboardInsightStrip", 3);
  window.hrApp.renderSkeletons("#leaveQueue", 3);
  window.hrApp.renderSkeletons("#interviewList", 3);
  window.hrApp.renderSkeletons("#dashboardNotificationFeed", 4);
  window.hrApp.renderSkeletons("#dashboardActivityFeed", 4);
  window.hrApp.renderSkeletons("#dashboardSnapshotGrid", 4);

  try {
    const response = await API.get("/hr/dashboard");
    renderDashboard(response.data || {});
  } catch (error) {
    window.hrApp.toast(error.message, "error");
  }
}

function renderDashboard(data) {
  const recruitment = data.recruitment || {};
  const cards = [
    ["Total Employees", data.employeeStats?.totalEmployees, "/hr/reports.html", "Directory synced with MongoDB"],
    ["Active Employees", data.employeeStats?.activeEmployees, "/hr/reports.html?status=ACTIVE", "Currently active workforce"],
    ["Inactive Employees", data.employeeStats?.inactiveEmployees, "/hr/reports.html?status=INACTIVE", "On hold, blocked, or inactive"],
    ["New Joiners", data.employeeStats?.newJoiners, "/hr/reports.html", "Joined this month"],
    ["Present Employees", data.attendanceStats?.attendancePercentage, "/hr/attendance.html", "Today's tracked presence", "%"],
    ["Leave Requests", data.leaveStats?.pendingLeaves, "/hr/leaves.html", "Waiting for HR action"],
    ["Payroll", data.payrollStats?.payrollCost, "/hr/payroll.html", "Current month payroll cost", "", true],
    ["Recruitment", recruitment.openJobs, "/hr/interviews.html", "Live open roles in ATS"],
  ];

  document.getElementById("dashboardCards").innerHTML = cards.map(([label, value, href, foot, suffix, isCurrency]) => `
    <a class="hr-metric-card hr-fade-enter text-decoration-none" href="${href}">
      <span class="hr-metric-badge">${label}</span>
      <strong>${isCurrency ? window.hrApp.formatCurrency(value) : `${window.hrApp.formatNumber(value || 0)}${suffix || ""}`}</strong>
      <div class="dashboard-mini">
        <span>${foot}</span>
        <span>View all</span>
      </div>
    </a>
  `).join("");

  document.getElementById("dashboardInsightStrip").innerHTML = [
    ["Department Coverage", data.employeeStats?.departments, "distinct departments mapped across the workforce"],
    ["Employee Growth", data.employeeStats?.employeeGrowth, "month-over-month team movement"],
    ["Approved Leaves", data.leaveStats?.approvedLeaves, "requests already resolved"],
  ].map(([label, value, meta]) => `
    <article class="hr-panel-card insight-card">
      <div class="hr-meta">${label}</div>
      <strong class="insight-value">${window.hrApp.formatNumber(value || 0)}</strong>
      <div class="hr-meta">${meta}</div>
    </article>
  `).join("");

  renderLeaveQueue();
  renderInterviews(data.interviews || []);
  renderNotifications(data.notifications || []);
  renderActivityFeed(data.activity || []);
  renderSnapshot(data);
  renderAttendanceChart(data.charts?.attendanceTrend || []);
  renderDepartmentChart(data.charts?.departmentBreakdown || []);
  renderLeaveBreakdownChart(data.charts?.leaveBreakdown || []);
  renderPayrollDepartmentChart(data.charts?.payrollByDepartment || []);
  renderPerformanceOverviewChart(data.charts?.performanceOverview || {});
}

async function renderLeaveQueue() {
  try {
    const response = await API.get("/leave");
    const pending = (response.data || []).filter((item) => /pending/i.test(String(item.status || ""))).slice(0, 5);
    document.getElementById("dashboardNotificationPill").textContent = `${pending.length} pending`;
    document.getElementById("leaveQueue").innerHTML = pending.length ? pending.map((leave) => `
      <article class="hr-list-item">
        <div>
          <strong>${leave.employee || "Employee"}</strong>
          <div class="hr-meta">${leave.fromDate || "-"} to ${leave.toDate || "-"} | ${leave.reason || "No reason added"}</div>
        </div>
        <div class="hr-button-row">
          <button class="hr-btn success" data-leave-action="approve" data-leave-id="${leave._id}">Approve</button>
          <button class="hr-btn danger" data-leave-action="reject" data-leave-id="${leave._id}">Reject</button>
          <button class="hr-btn warning" data-leave-action="hold" data-leave-id="${leave._id}">Hold</button>
        </div>
      </article>
    `).join("") : `<div class="hr-empty">No pending leave requests right now.</div>`;

    document.querySelectorAll("[data-leave-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.leaveAction;
        const id = button.dataset.leaveId;
        const allowed = await window.hrApp.confirmDialog({
          title: `Confirm ${action}`,
          text: `This leave request will be marked as ${action}.`,
          icon: "question",
          confirmButtonText: `Yes, ${action}`,
        });
        if (!allowed) return;
        await apiRequest(`/leaves/${action}/${id}`, "PATCH", {});
        window.hrApp.toast(`Leave ${action}d successfully`);
        loadDashboard();
      });
    });
  } catch (error) {
    document.getElementById("leaveQueue").innerHTML = `<div class="hr-empty">${error.message}</div>`;
  }
}

function renderInterviews(items) {
  document.getElementById("interviewList").innerHTML = items.length ? items.slice(0, 5).map((interview) => `
    <article class="hr-list-item">
      <div>
        <strong>${interview.candidateName}</strong>
        <div class="hr-meta">${interview.position || "Interview"} | ${window.hrApp.formatDate(interview.scheduledAt, { dateStyle: "medium", timeStyle: "short" })}</div>
      </div>
      <div class="hr-button-row">
        <a class="hr-btn primary" href="/hr/interviews.html">Open</a>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No interviews scheduled.</div>`;
}

function renderNotifications(items) {
  document.getElementById("dashboardNotificationFeed").innerHTML = items.length ? items.map((item) => `
    <article class="hr-list-item">
      <div>
        <strong>${item.title || item.type}</strong>
        <div class="hr-meta">${item.message || ""}</div>
      </div>
      <span class="hr-status ${window.hrApp.statusClass(item.priority || item.type)}">${item.priority || "Info"}</span>
    </article>
  `).join("") : `<div class="hr-empty">No HR notifications found.</div>`;
}

function renderActivityFeed(items) {
  document.getElementById("dashboardActivityFeed").innerHTML = items.length ? items.map((item) => `
    <article class="hr-list-item">
      <div>
        <strong>${item.title}</strong>
        <div class="hr-meta">${item.meta}</div>
      </div>
      <span class="hr-status ${window.hrApp.statusClass(item.type)}">${window.hrApp.formatDate(item.time, { dateStyle: "medium", timeStyle: "short" })}</span>
    </article>
  `).join("") : `<div class="hr-empty">No recent activity to show.</div>`;
}

function renderSnapshot(data) {
  const performance = data.charts?.performanceOverview || {};
  const rows = [
    ["Average Project Progress", `${performance.avgProjectProgress || 0}%`, "Hover-ready delivery benchmark from active projects."],
    ["Completion Rate", `${performance.completionRate || 0}%`, "Closed work vs total tracked projects."],
    ["Microsoft Readiness", `${performance.microsoftReadiness || 0}%`, "Employees with Teams or Outlook wired."],
    ["Processed Payroll Count", `${window.hrApp.formatNumber(data.payrollStats?.processedCount || 0)}`, "Salary records generated for the active month."],
  ];

  document.getElementById("dashboardSnapshotGrid").innerHTML = rows.map(([label, stat, hover]) => `
    <article class="snapshot-item">
      <div class="hr-meta">${label}</div>
      <strong class="snapshot-stat">${stat}</strong>
      <div class="snapshot-hover">${hover}</div>
    </article>
  `).join("");
}

function renderAttendanceChart(points) {
  const ctx = document.getElementById("attendanceTrendChart");
  if (!ctx) return;
  attendanceChart?.destroy();
  attendanceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map((item) => item.date),
      datasets: [
        {
          label: "Present Employees",
          data: points.map((item) => item.present),
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139,92,246,0.14)",
          fill: true,
          tension: 0.35,
        },
        {
          label: "Hours Logged",
          data: points.map((item) => item.hours),
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6,182,212,0.12)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: { color: "#cbd5e1" },
        },
      },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
      },
    },
  });
}

function renderDepartmentChart(items) {
  departmentChart?.destroy();
  departmentChart = new ApexCharts(document.getElementById("departmentChart"), {
    chart: { type: "donut", height: 320, toolbar: { show: false } },
    labels: items.map((item) => item.label),
    series: items.map((item) => item.value),
    colors: ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#f43f5e", "#3b82f6"],
    legend: { position: "bottom", labels: { colors: ["#cbd5e1"] } },
    dataLabels: { enabled: true },
    tooltip: { theme: "dark" },
    states: { hover: { filter: { type: "lighten", value: 0.12 } } },
  });
  departmentChart.render();
}

function renderLeaveBreakdownChart(items) {
  leaveBreakdownChart?.destroy();
  leaveBreakdownChart = new ApexCharts(document.getElementById("leaveBreakdownChart"), {
    chart: { type: "pie", height: 320, toolbar: { show: false } },
    labels: items.map((item) => item.label),
    series: items.map((item) => item.value),
    colors: ["#8b5cf6", "#22c55e", "#f59e0b", "#f43f5e"],
    tooltip: { theme: "dark" },
    legend: { position: "bottom", labels: { colors: ["#cbd5e1"] } },
    states: { hover: { filter: { type: "lighten", value: 0.18 } } },
  });
  leaveBreakdownChart.render();
}

function renderPayrollDepartmentChart(items) {
  payrollDepartmentChart?.destroy();
  payrollDepartmentChart = new ApexCharts(document.getElementById("payrollDepartmentChart"), {
    chart: { type: "donut", height: 320, toolbar: { show: false } },
    labels: items.map((item) => item.label),
    series: items.map((item) => item.value),
    colors: ["#06b6d4", "#8b5cf6", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e"],
    legend: { position: "bottom", labels: { colors: ["#cbd5e1"] } },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value) => window.hrApp.formatCurrency(value),
      },
    },
  });
  payrollDepartmentChart.render();
}

function renderPerformanceOverviewChart(metrics) {
  performanceOverviewChart?.destroy();
  performanceOverviewChart = new ApexCharts(document.getElementById("performanceOverviewChart"), {
    chart: { type: "radialBar", height: 320 },
    series: [
      Number(metrics.avgProjectProgress || 0),
      Number(metrics.completionRate || 0),
      Number(metrics.microsoftReadiness || 0),
    ],
    labels: ["Project Progress", "Completion Rate", "MS Readiness"],
    colors: ["#8b5cf6", "#06b6d4", "#22c55e"],
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { color: "#cbd5e1" },
          value: { color: "#e2e8f0" },
        },
      },
    },
    tooltip: { enabled: true, theme: "dark" },
  });
  performanceOverviewChart.render();
}
