let profileData = null;
let attendanceMiniChart = null;

document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "employees",
    title: "Employee Profile",
    description: "Profile, documents, payroll, and performance",
  });
  bindDropzone();
  loadEmployeeProfile();
});

async function loadEmployeeProfile() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    document.getElementById("profileTabContent").innerHTML = `<div class="hr-empty">Employee id is missing.</div>`;
    return;
  }

  document.getElementById("profileSide").innerHTML = `<div class="hr-skeleton" style="height:320px"></div>`;
  document.getElementById("profileTabContent").innerHTML = `<div class="hr-skeleton" style="height:420px"></div>`;

  try {
    const response = await API.get(`/employees/${id}`);
    profileData = response.data;
    renderProfile();
  } catch (error) {
    document.getElementById("profileTabContent").innerHTML = `<div class="hr-empty">${error.message}</div>`;
  }
}

function renderProfile() {
  const employee = profileData.employee;
  const side = document.getElementById("profileSide");
  side.innerHTML = `
    <div class="profile-side-top">
      <button class="hr-btn profile-back-btn" id="profileBackButton">Back to Report</button>
      <img class="profile-avatar" src="${employee.profilePhoto || window.hrApp.defaultAvatar}" alt="${employee.name}" />
      <div class="hr-pill">Online</div>
      <h2 class="mt-3 mb-1">${employee.name}</h2>
      <div class="hr-meta">${employee.designation || "-"} | ${employee.department || "-"}</div>
    </div>
    <div class="hr-list mt-4">
      <div class="hr-list-item"><strong>Email</strong><span>${employee.email}</span></div>
      <div class="hr-list-item"><strong>Phone</strong><span>${employee.phone || "-"}</span></div>
      <div class="hr-list-item"><strong>Status</strong><span class="hr-status ${window.hrApp.statusClass(employee.status)}">${employee.status}</span></div>
      <div class="hr-list-item"><strong>Teams</strong><span>${employee.microsoft?.teamsReady ? "Connected" : "Not connected"}</span></div>
    </div>
    <div class="profile-stat-grid">
      <div class="hr-card"><strong>${profileData.overview.activeProjects}</strong><div class="hr-meta">Projects</div></div>
      <div class="hr-card"><strong>${profileData.overview.documents}</strong><div class="hr-meta">Docs</div></div>
      <div class="hr-card"><strong>${profileData.overview.activeTeams}</strong><div class="hr-meta">Teams</div></div>
      <div class="hr-card"><strong>${profileData.overview.upcomingMeetings}</strong><div class="hr-meta">Meetings</div></div>
    </div>
    <div class="hr-button-row mt-4">
      <button class="hr-action-button" id="openUploadModalBtn">Upload Document</button>
      <button class="hr-action-button alt" id="scheduleProfileMeetingBtn">Schedule Meeting</button>
    </div>
  `;

  const tabs = ["Overview", "Attendance", "Projects", "Leaves", "Payroll", "Documents", "Performance", "Meetings", "Teams"];
  document.getElementById("profileTabs").innerHTML = tabs.map((tab, index) => `
    <button class="profile-tab ${index === 0 ? "active" : ""}" data-profile-tab="${tab.toLowerCase()}">${tab}</button>
  `).join("");

  document.querySelectorAll("[data-profile-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-profile-tab]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderTab(button.dataset.profileTab);
    });
  });

  document.getElementById("openUploadModalBtn").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("documentUploadModal"));
    modal.show();
  });

  document.getElementById("profileBackButton").addEventListener("click", () => {
    window.hrApp.navigateBack("/hr/reports.html");
  });
  document.getElementById("scheduleProfileMeetingBtn").addEventListener("click", scheduleProfileMeeting);
  document.getElementById("employeeUploadBtn").addEventListener("click", uploadEmployeeDocument);
  renderTab("overview");
}

function renderTab(tab) {
  const content = document.getElementById("profileTabContent");
  const map = {
    overview: `
      <div class="profile-tabcontent-section">
        <div class="profile-overview-grid">
          <div class="profile-overview-card"><div class="hr-meta">Present Days</div><strong>${profileData.attendance.summary.presentDays}</strong></div>
          <div class="profile-overview-card"><div class="hr-meta">Working Hours</div><strong>${profileData.attendance.summary.totalHours}</strong></div>
          <div class="profile-overview-card"><div class="hr-meta">Late Entries</div><strong>${profileData.attendance.summary.lateEntries}</strong></div>
        </div>
        <div class="hr-list">
          <div class="hr-list-item"><strong>Active Projects</strong><span>${profileData.overview.activeProjects}</span></div>
          <div class="hr-list-item"><strong>Upcoming Meetings</strong><span>${profileData.overview.upcomingMeetings}</span></div>
          <div class="hr-list-item"><strong>Document Vault</strong><span>${profileData.overview.documents}</span></div>
        </div>
      </div>
    `,
    attendance: `
      <div class="profile-tabcontent-section">
        <div class="hr-panel-card">
          <div class="hr-card-head"><strong>Monthly Attendance Graph</strong></div>
          <canvas id="employeeAttendanceChart" height="120"></canvas>
        </div>
        <div class="hr-list">
          ${profileData.attendance.logs.slice(0, 8).map((item) => `
            <div class="hr-list-item">
              <div>
                <strong>${item.date || window.hrApp.formatDate(item.createdAt, { dateStyle: "medium" })}</strong>
                <div class="hr-meta">${item.checkInAt ? `In ${window.hrApp.formatDate(item.checkInAt, { timeStyle: "short" })}` : "No check-in"} | ${item.checkOutAt ? `Out ${window.hrApp.formatDate(item.checkOutAt, { timeStyle: "short" })}` : "Open shift"}</div>
              </div>
              <span class="hr-status ${window.hrApp.statusClass(item.status)}">${item.status || "Present"}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `,
    projects: renderListTab(profileData.projects, (item) => [item.projectName, `${item.status || "-"} | ${item.progress || 0}% progress`]),
    leaves: renderListTab(profileData.leaves, (item) => [item.reason || "Leave request", `${item.fromDate || "-"} to ${item.toDate || "-"} | ${item.status || "Pending"}`]),
    payroll: renderListTab(profileData.payroll, (item) => [item.monthKey, `${window.hrApp.formatCurrency(item.netSalary)} | ${item.status}`]),
    documents: `
      <div class="profile-tabcontent-section">
        <div class="hr-list">
          ${profileData.documents.length ? profileData.documents.map((item) => `
            <div class="hr-list-item">
              <div>
                <strong>${item.name}</strong>
                <div class="hr-meta">${item.mimeType || "Document"} | ${window.hrApp.formatDate(item.createdAt, { dateStyle: "medium" })}</div>
              </div>
              <div class="hr-button-row">
                <a class="hr-btn" href="${item.oneDriveShareUrl || item.url}" target="_blank">Preview</a>
                <button class="hr-btn" data-copy-link="${item.oneDriveShareUrl || item.url}">Copy Link</button>
                <a class="hr-btn" href="${item.url}" target="_blank">Open File</a>
                <a class="hr-btn primary" href="${item.url}" target="_blank" download>Download</a>
              </div>
            </div>
          `).join("") : `<div class="hr-empty">No documents uploaded yet.</div>`}
        </div>
      </div>
    `,
    performance: renderListTab(profileData.performance, (item) => [item.projectName, `${item.progress}% progress | ${item.priority}`]),
    meetings: renderListTab(profileData.meetings, (item) => [item.title, `${window.hrApp.formatDate(item.scheduledFor || item.startTime, { dateStyle: "medium", timeStyle: "short" })}`]),
    teams: renderListTab(profileData.teams, (item) => [item.name, `${item.department || "-"} | ${item.status || "-"}`]),
  };

  content.innerHTML = map[tab] || map.overview;
  document.querySelectorAll("[data-copy-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copyLink);
      window.hrApp.toast("Share link copied");
    });
  });
  if (tab === "attendance") {
    renderEmployeeAttendanceChart();
  }
}

function renderListTab(items, formatter) {
  return `
    <div class="profile-tabcontent-section">
      <div class="hr-list">
        ${items.length ? items.map((item) => {
          const [title, meta] = formatter(item);
          return `<div class="hr-list-item"><div><strong>${title || "-"}</strong><div class="hr-meta">${meta || ""}</div></div></div>`;
        }).join("") : `<div class="hr-empty">No records found.</div>`}
      </div>
    </div>
  `;
}

function renderEmployeeAttendanceChart() {
  const canvas = document.getElementById("employeeAttendanceChart");
  if (!canvas) return;
  attendanceMiniChart?.destroy();
  attendanceMiniChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: profileData.attendance.graph.map((item) => item.date),
      datasets: [{
        label: "Hours",
        data: profileData.attendance.graph.map((item) => item.hours),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,0.18)",
        fill: true,
        tension: 0.35,
      }],
    },
    options: {
      plugins: {
        legend: { labels: { color: "#cbd5e1" } },
      },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
      },
      onClick: function (_, elements) {
        if (elements.length) {
          window.hrApp.navigate("/hr/attendance.html");
        }
      },
    },
  });
}

function bindDropzone() {
  const dropzone = document.getElementById("documentDropzone");
  const fileInput = document.getElementById("employeeDocumentFile");
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    if (event.dataTransfer.files?.length) {
      fileInput.files = event.dataTransfer.files;
    }
  });
}

async function uploadEmployeeDocument() {
  const employeeId = new URLSearchParams(window.location.search).get("id");
  const file = document.getElementById("employeeDocumentFile").files[0];
  if (!file) {
    window.hrApp.toast("Select a file first", "warning");
    return;
  }

  const progress = document.getElementById("employeeUploadProgress");
  progress.style.width = "18%";
  progress.textContent = "18%";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("employeeId", employeeId);
  formData.append("module", "hr-documents");

  let timer;
  try {
    timer = setInterval(() => {
      const value = Math.min(90, Number(progress.style.width.replace("%", "")) + 18);
      progress.style.width = `${value}%`;
      progress.textContent = `${value}%`;
    }, 250);
    await apiRequest("/files/upload", "POST", formData, true);
    clearInterval(timer);
    progress.style.width = "100%";
    progress.textContent = "100%";
    window.hrApp.toast("Document uploaded successfully");
    bootstrap.Modal.getInstance(document.getElementById("documentUploadModal"))?.hide();
    loadEmployeeProfile();
  } catch (error) {
    clearInterval(timer);
    window.hrApp.toast(error.message, "error");
  }
}

async function scheduleProfileMeeting() {
  const employeeId = new URLSearchParams(window.location.search).get("id");
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await API.post("/hr/meeting", {
    employeeId,
    title: "Employee Check-In",
    description: "Profile-level HR sync using Microsoft Teams.",
    startDateTime: start.toISOString(),
    endDateTime: new Date(start.getTime() + 30 * 60000).toISOString(),
  });
  window.hrApp.toast("Meeting scheduled");
}
