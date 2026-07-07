let attendanceHoursChart;
let attendanceDensityChart;
let attendanceWeeklyChart;

document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "attendance",
    title: "Attendance",
    description: "Working-hours monitoring",
  });
  loadAttendance();
});

async function loadAttendance() {
  window.hrApp.renderSkeletons("#attendanceCards", 4);
  try {
    const response = await API.get("/hr/attendance");
    renderAttendance(response.data || {});
  } catch (error) {
    window.hrApp.toast(error.message, "error");
  }
}

function renderAttendance(data) {
  const cards = data.cards || {};
  document.getElementById("attendanceCards").innerHTML = [
    ["Total Hours Today", cards.totalHoursToday],
    ["Weekly Hours", cards.weeklyHours],
    ["Monthly Hours", cards.monthlyHours],
    ["Productive Hours", cards.productiveHours],
    ["Break Hours", cards.breakHours],
    ["Overtime", cards.overtimeHours],
  ].map(([label, value]) => `
    <article class="hr-metric-card"><p class="hr-meta">${label}</p><strong>${window.hrApp.formatNumber(value || 0)}</strong></article>
  `).join("");

  renderAttendanceCharts(data.trend || []);
  renderWeeklyBreakdown(data.weeklyBreakdown || []);
  renderDensityList(data.employeeDensity || []);
  document.getElementById("attendanceTableBody").innerHTML = (data.logs || []).map((log) => `
    <tr>
      <td>${log.date || window.hrApp.formatDate(log.createdAt, { dateStyle: "medium" })}</td>
      <td>${log.checkInAt ? window.hrApp.formatDate(log.checkInAt, { timeStyle: "short" }) : "-"}</td>
      <td><span class="hr-status ${window.hrApp.statusClass(log.status)}">${log.status || "Present"}</span></td>
      <td>${log.checkOutAt ? window.hrApp.formatDate(log.checkOutAt, { timeStyle: "short" }) : "-"}</td>
      <td>${window.hrApp.formatNumber(log.breakHours || 0)}h</td>
      <td>${window.hrApp.formatNumber(log.lateMinutes || 0)}m</td>
      <td>${window.hrApp.formatNumber(log.overtimeHours || 0)}h</td>
      <td>${window.hrApp.formatNumber(log.productiveHours || 0)}h</td>
    </tr>
  `).join("");
}

function renderAttendanceCharts(trend) {
  attendanceHoursChart?.destroy();
  attendanceHoursChart = new Chart(document.getElementById("attendanceHoursChart"), {
    type: "line",
    data: {
      labels: trend.map((item) => item.date),
      datasets: [{
        label: "Hours",
        data: trend.map((item) => item.hours),
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6,182,212,0.14)",
        fill: true,
      }],
    },
    options: {
      plugins: { legend: { labels: { color: "#cbd5e1" } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
      },
    },
  });

  attendanceDensityChart?.destroy();
  attendanceDensityChart = new ApexCharts(document.getElementById("attendanceDensityChart"), {
    chart: { type: "bar", height: 320 },
    series: [{ name: "Hours", data: trend.map((item) => item.hours) }],
    xaxis: { categories: trend.map((item) => item.date) },
    colors: ["#8b5cf6"],
    tooltip: { theme: "dark" },
    dataLabels: { enabled: false },
  });
  attendanceDensityChart.render();
}

function renderWeeklyBreakdown(items) {
  attendanceWeeklyChart?.destroy();
  attendanceWeeklyChart = new ApexCharts(document.getElementById("attendanceWeeklyChart"), {
    chart: { type: "radar", height: 320 },
    series: [{ name: "Hours", data: items.map((item) => item.hours) }],
    labels: items.map((item) => item.label),
    colors: ["#06b6d4"],
    tooltip: { theme: "dark" },
  });
  attendanceWeeklyChart.render();
}

function renderDensityList(items) {
  document.getElementById("attendanceDensityList").innerHTML = items.length ? items.map((item) => `
    <article class="hr-list-item">
      <div>
        <strong>${item.label}</strong>
        <div class="hr-meta">Tracked attendance hours</div>
      </div>
      <span class="hr-pill">${window.hrApp.formatNumber(item.hours)}</span>
    </article>
  `).join("") : `<div class="hr-empty">No attendance density data found.</div>`;
}
