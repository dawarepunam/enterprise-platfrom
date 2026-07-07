let payrollTrendChart;
let payrollRecords = [];

document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "payroll",
    title: "Payroll",
    description: "Salary processing and reminders",
  });
  loadPayroll();
});

async function loadPayroll() {
  window.hrApp.renderSkeletons("#payrollCards", 4);
  try {
    const response = await API.get("/hr/payroll");
    renderPayroll(response.data || {});
  } catch (error) {
    window.hrApp.toast(error.message, "error");
  }
}

function renderPayroll(data) {
  const cards = data.cards || {};
  payrollRecords = data.records || [];
  document.getElementById("payrollCards").innerHTML = [
    ["Total Cost", window.hrApp.formatCurrency(cards.totalCost || 0)],
    ["Processed", window.hrApp.formatNumber(cards.processed || 0)],
    ["Paid", window.hrApp.formatNumber(cards.paid || 0)],
    ["On Hold", window.hrApp.formatNumber(cards.onHold || 0)],
  ].map(([label, value]) => `<article class="hr-metric-card"><p class="hr-meta">${label}</p><strong>${value}</strong></article>`).join("");

  renderPayrollChart(payrollRecords);
  renderPayrollReminders(payrollRecords);
  document.getElementById("payrollTableBody").innerHTML = payrollRecords.map((record) => `
    <tr>
      <td>${record.employeeName}</td>
      <td>${record.monthKey}</td>
      <td>${record.department || "-"}</td>
      <td>${window.hrApp.formatCurrency(record.netSalary)}</td>
      <td><span class="hr-status ${window.hrApp.statusClass(record.status)}">${record.status}</span></td>
      <td>
        <div class="hr-button-row">
          <button class="hr-btn" data-payroll-reminder="${record.userId}">Send Reminder</button>
          <button class="hr-btn primary" data-payroll-meeting="${record.userId}">Schedule Meeting</button>
        </div>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-payroll-reminder]").forEach((button) => {
    button.addEventListener("click", () => sendReminder(button.dataset.payrollReminder));
  });
  document.querySelectorAll("[data-payroll-meeting]").forEach((button) => {
    button.addEventListener("click", () => scheduleMeeting(button.dataset.payrollMeeting));
  });
}

function renderPayrollChart(records) {
  const grouped = records.reduce((acc, item) => {
    acc[item.monthKey] = (acc[item.monthKey] || 0) + Number(item.netSalary || 0);
    return acc;
  }, {});
  const labels = Object.keys(grouped).sort();

  payrollTrendChart?.destroy();
  payrollTrendChart = new ApexCharts(document.getElementById("payrollTrendChart"), {
    chart: { type: "area", height: 320 },
    series: [{ name: "Net Payroll", data: labels.map((key) => grouped[key]) }],
    xaxis: { categories: labels },
    colors: ["#06b6d4"],
    dataLabels: { enabled: false },
    tooltip: { theme: "dark" },
  });
  payrollTrendChart.render();
}

function renderPayrollReminders(records) {
  document.getElementById("payrollReminderList").innerHTML = records.slice(0, 5).map((record) => `
    <article class="hr-list-item">
      <div>
        <strong>${record.employeeName}</strong>
        <div class="hr-meta">${record.monthKey} | ${window.hrApp.formatCurrency(record.netSalary)}</div>
      </div>
      <button class="hr-btn" data-payroll-reminder="${record.userId}">Send Reminder</button>
    </article>
  `).join("");

  document.querySelectorAll("[data-payroll-reminder]").forEach((button) => {
    button.addEventListener("click", () => sendReminder(button.dataset.payrollReminder));
  });
}

async function sendReminder(employeeId) {
  const confirmed = await window.hrApp.confirmDialog({
    title: "Send payroll reminder?",
    text: "This will send an Outlook-based payroll reminder.",
    confirmButtonText: "Send reminder",
  });
  if (!confirmed) return;
  await API.post("/hr/reminder", {
    employeeId,
    subject: "Payroll Reminder",
    message: "Your processed payroll summary is ready for review in the HR portal.",
  });
  window.hrApp.toast("Reminder sent");
}

async function scheduleMeeting(employeeId) {
  const confirmed = await window.hrApp.confirmDialog({
    title: "Schedule payroll meeting?",
    text: "A Microsoft Teams meeting will be created for tomorrow.",
    confirmButtonText: "Schedule",
  });
  if (!confirmed) return;
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await API.post("/hr/meeting", {
    employeeId,
    title: "Payroll Discussion",
    description: "Quick payroll review meeting scheduled by HR.",
    startDateTime: start.toISOString(),
    endDateTime: new Date(start.getTime() + 30 * 60000).toISOString(),
  });
  window.hrApp.toast("Meeting scheduled");
}
