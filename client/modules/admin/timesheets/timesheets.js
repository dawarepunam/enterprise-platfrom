const API = "http://localhost:5000/api/timesheets";

// Load data
async function loadTimesheets() {
  const res = await fetch(API);
  const data = await res.json();

  renderTable(data.items);
  updateSummary(data.summary);
}

// Add entry
async function addTimesheet() {
  const data = {
    task: document.getElementById("taskName").value,
    hours: document.getElementById("hours").value,
    date: document.getElementById("date").value,
    type: document.getElementById("type").value,
  };

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  loadTimesheets();
}

// Render table
function renderTable(items) {
  const table = document.getElementById("timesheetTable");
  table.innerHTML = "";

  items.forEach((i) => {
    table.innerHTML += `
            <tr>
                <td>${i.task}</td>
                <td>${i.hours}</td>
                <td>${i.type}</td>
                <td>${new Date(i.date).toLocaleDateString()}</td>
            </tr>
        `;
  });
}

// Summary
function updateSummary(s) {
  document.getElementById("totalHours").innerText = s.total;
  document.getElementById("billableHours").innerText = s.billable;
  document.getElementById("nonBillableHours").innerText = s.nonBillable;
}

// Init
loadTimesheets();
