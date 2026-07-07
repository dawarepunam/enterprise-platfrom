const memberProfileState = {
  member: null,
  activePhotoIndex: 0,
};

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  const memberId = new URLSearchParams(window.location.search).get("memberId");
  if (!memberId) {
    renderEmptyState("Member profile is missing a member id.");
    return;
  }

  try {
    const response = await API.get(`/manager/members/${memberId}`);
    renderProfile(response.data);
  } catch (error) {
    renderEmptyState(error.message || "Unable to load member profile.");
  }
});

function renderProfile(member) {
  memberProfileState.member = member;
  const photos = member.uploadedPhotos || [];
  memberProfileState.activePhotoIndex = Math.min(memberProfileState.activePhotoIndex, Math.max(photos.length - 1, 0));
  const host = document.getElementById("memberProfileApp");
  const projectCards = (member.assignedProjects || [])
    .map(
      (project) => `
        <article class="manager-card-v2">
          <div class="manager-topline">
            <div>
              <h3>${escapeHtml(project.projectName || "-")}</h3>
              <p>${escapeHtml(project.clientName || "Client")}</p>
            </div>
            <span class="manager-chip ${priorityTone(project.priority)}">${escapeHtml(project.priority || "Medium")}</span>
          </div>
          <div class="manager-chip-row">
            <span class="manager-chip neutral">${escapeHtml(project.status || "Planning")}</span>
            <span class="manager-chip neutral">${Number(project.progress || 0)}% complete</span>
          </div>
        </article>
      `,
    )
    .join("");

  const trendRows = (member.productivityTrend || [])
    .map(
      (row) => `
        <tr>
          <td>${formatShortDate(row.date)}</td>
          <td>${row.hours}</td>
          <td>${row.updates}</td>
          <td>${row.productivity}%</td>
        </tr>
      `,
    )
    .join("");

  const historyRows = (member.workHistory || [])
    .map(
      (item) => `
        <article class="manager-list-card">
          <div class="manager-topline">
            <h4>${escapeHtml(item.actionType || "Update")}</h4>
            <span class="manager-chip neutral">${formatDateTime(item.createdAt)}</span>
          </div>
          <p>${escapeHtml(item.details || item.title || "")}</p>
        </article>
      `,
    )
    .join("");

  const updateRows = (member.dailyUpdates || [])
    .map(
      (item) => `
        <article class="manager-list-card">
          <div class="manager-topline">
            <h4>${escapeHtml(item.summary || item.completedWork || "Daily Update")}</h4>
            <span class="manager-chip neutral">${formatDateTime(item.createdAt)}</span>
          </div>
          <p><strong>Project:</strong> ${escapeHtml(item.projectName || "-")}</p>
          <p><strong>Completed:</strong> ${escapeHtml(item.completedWork || item.summary || "-")}</p>
          <p><strong>Pending:</strong> ${escapeHtml(item.pendingWork || "-")}</p>
          <p><strong>Blockers:</strong> ${escapeHtml(item.blockers || "No blockers reported")}</p>
        </article>
      `,
    )
    .join("");

  const fileRows = (member.uploadedFiles || [])
    .filter((item) => !String(item.mimeType || "").toLowerCase().startsWith("image/"))
    .map(
      (item) => `
        <article class="manager-card-v2">
          <div class="manager-topline">
            <div>
              <h4>${escapeHtml(item.name || "Uploaded file")}</h4>
              <p>${escapeHtml(item.mimeType || "file")}</p>
            </div>
            <span class="manager-chip neutral">${formatDateTime(item.createdAt)}</span>
          </div>
          <div class="manager-actions">
            <a class="manager-btn manager-btn-primary" href="${escapeHtml(item.oneDriveShareUrl || item.url || "#")}" target="_blank" rel="noreferrer">Open File</a>
          </div>
        </article>
      `,
    )
    .join("");

  host.innerHTML = `
    <section class="manager-grid-v2">
      <div class="manager-span-4 manager-glass-panel">
        <div class="manager-member-card">
          <img class="manager-avatar" src="${escapeHtml(getSafeProfileImage(member.profilePhoto))}" alt="${escapeHtml(member.name)}" />
          <div>
            <div class="manager-eyebrow">User Profile</div>
            <h2 class="h4 mb-1">${escapeHtml(member.name || "-")}</h2>
            <p class="manager-muted">${escapeHtml(member.role || "Member")} | ${escapeHtml(member.department || "-")}</p>
          </div>
        </div>
        <div class="manager-list-v2 mt-3">
          <div class="manager-list-card"><p><strong>Email:</strong> ${escapeHtml(member.email || "-")}</p></div>
          <div class="manager-list-card"><p><strong>Phone:</strong> ${escapeHtml(member.phone || "-")}</p></div>
          <div class="manager-list-card"><p><strong>Designation:</strong> ${escapeHtml(member.designation || "-")}</p></div>
          <div class="manager-list-card"><p><strong>Joining Date:</strong> ${formatShortDate(member.joiningDate)}</p></div>
          <div class="manager-list-card"><p><strong>Status:</strong> ${escapeHtml(member.currentStatus || "Active")}</p></div>
          <div class="manager-list-card"><p><strong>Skills:</strong> ${escapeHtml((member.skills || []).join(", ") || "-")}</p></div>
        </div>
      </div>
      <div class="manager-span-8 manager-glass-panel">
        <div class="manager-card-grid">
          ${renderStatCard("Assigned Projects", (member.assignedProjects || []).length, "Projects currently or previously linked")}
          ${renderStatCard("Active Projects", member.projectHistory?.activeProjects?.length || 0, "Assigned or active delivery projects")}
          ${renderStatCard("Completed Projects", member.projectHistory?.completedProjects?.length || 0, "Closed delivery work")}
          ${renderStatCard("Completed Tasks", member.completedTasks || 0, "Tasks closed by this user")}
          ${renderStatCard("Pending Tasks", member.pendingTasks || 0, "Open tasks still active")}
          ${renderStatCard("Daily Updates", (member.dailyUpdates || []).length, "Submitted progress updates")}
          ${renderStatCard("Uploaded Files", (member.uploadedFiles || []).length, "Files and proofs uploaded")}
          ${renderStatCard("Uploaded Photos", (member.uploadedPhotos || []).length, "Images submitted by the user")}
          ${renderStatCard("Productivity", `${member.productivityScore || 0}%`, "Task completion productivity")}
          ${renderStatCard("Working Hours", member.totalWorkingHours || 0, "Tracked in work history")}
        </div>
      </div>
      <div class="manager-span-12 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Auto Report</div>
            <h2 class="h4 mb-0">Generated from this user's work</h2>
          </div>
          <div class="manager-actions">
            <button class="manager-btn manager-btn-secondary" type="button" onclick="exportAutoReportExcel()">Export Excel</button>
            <button class="manager-btn manager-btn-primary" type="button" onclick="exportAutoReportPdf()">Export PDF</button>
          </div>
        </div>
        <div class="manager-card-grid">
          ${renderStatCard("Updates", member.autoReport?.totalDailyUpdates || 0, "Total daily updates")}
          ${renderStatCard("Files", member.autoReport?.totalUploadedFiles || 0, "Files uploaded")}
          ${renderStatCard("Images", member.autoReport?.uploadedImages || 0, "Photo uploads")}
          ${renderStatCard("Average Completion", `${member.autoReport?.averageCompletion || 0}%`, "Average update completion")}
          ${renderStatCard("Auto Productivity", `${member.autoReport?.productivityScore || 0}%`, "Calculated automatically")}
        </div>
        <div class="manager-list-card mt-3"><p>${escapeHtml(member.autoReport?.managerSummary || "Auto report unavailable.")}</p></div>
      </div>
      <div class="manager-span-12 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Assigned Projects</div>
            <h2 class="h4 mb-0">Project history and active ownership</h2>
          </div>
        </div>
        <div class="manager-card-grid">
          ${projectCards || renderEmptyInline("No projects linked to this user.")}
        </div>
      </div>
      <div class="manager-span-6 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Daily Updates</div>
            <h2 class="h4 mb-0">Submitted updates history</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${updateRows || renderEmptyInline("No daily updates submitted yet.")}
        </div>
      </div>
      <div class="manager-span-6 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Photo Gallery</div>
            <h2 class="h4 mb-0">Direct preview of uploaded work proofs</h2>
          </div>
        </div>
        ${renderPhotoGallery(photos)}
      </div>
      <div class="manager-span-6 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Files</div>
            <h2 class="h4 mb-0">Uploaded documents and links</h2>
          </div>
        </div>
        <div class="manager-card-grid">
          ${fileRows || renderEmptyInline("No uploaded files found yet.")}
        </div>
      </div>
      <div class="manager-span-6 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Productivity Trend</div>
            <h2 class="h4 mb-0">Recent working pattern</h2>
          </div>
        </div>
        <div class="table-responsive">
          <table class="manager-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Updates</th>
                <th>Productivity</th>
              </tr>
            </thead>
            <tbody>
              ${trendRows || `<tr><td colspan="4">${renderEmptyInline("No productivity trend available yet.")}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="manager-span-6 manager-glass-panel">
        <div class="manager-panel-header">
          <div>
            <div class="manager-eyebrow">Full History</div>
            <h2 class="h4 mb-0">Previous work actions</h2>
          </div>
        </div>
        <div class="manager-list-v2">
          ${historyRows || renderEmptyInline("No work history recorded yet.")}
        </div>
      </div>
    </section>
  `;
}

function renderPhotoGallery(photos) {
  if (!photos.length) {
    return renderEmptyInline("No uploaded photos found yet.");
  }

  const activePhoto = photos[memberProfileState.activePhotoIndex] || photos[0];
  const activePhotoUrl = activePhoto.oneDriveShareUrl || activePhoto.url || "#";

  return `
    <div class="manager-photo-gallery">
      <div class="manager-photo-preview">
        <a href="${escapeHtml(activePhotoUrl)}" target="_blank" rel="noreferrer">
          <img class="manager-photo-preview-image" src="${escapeHtml(activePhotoUrl)}" alt="${escapeHtml(activePhoto.name || "Photo")}" />
        </a>
        <div class="manager-photo-preview-copy">
          <div>
            <h3>${escapeHtml(activePhoto.name || "Photo")}</h3>
            <p>${formatDateTime(activePhoto.createdAt)}</p>
          </div>
          <div class="manager-actions">
            <button class="manager-btn manager-btn-secondary" type="button" onclick="stepGalleryPhoto(-1)">Previous</button>
            <button class="manager-btn manager-btn-secondary" type="button" onclick="stepGalleryPhoto(1)">Next</button>
            <a class="manager-btn manager-btn-primary" href="${escapeHtml(activePhotoUrl)}" target="_blank" rel="noreferrer">Open Full Size</a>
          </div>
        </div>
      </div>
      <div class="manager-photo-strip">
        ${photos
          .map((photo, index) => {
            const photoUrl = photo.oneDriveShareUrl || photo.url || "#";
            return `
              <button class="manager-photo-thumb ${index === memberProfileState.activePhotoIndex ? "is-active" : ""}" type="button" onclick="setActiveGalleryPhoto(${index})">
                <img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(photo.name || `Photo ${index + 1}`)}" />
                <span>${escapeHtml(photo.name || `Photo ${index + 1}`)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderStatCard(label, value, helpText) {
  return `
    <article class="manager-mini-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(helpText)}</small>
    </article>
  `;
}

function renderEmptyState(message) {
  document.getElementById("memberProfileApp").innerHTML = `
    <section class="manager-glass-panel">
      <div class="manager-empty-state">
        <h3>Profile unavailable</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    </section>
  `;
}

function renderEmptyInline(message) {
  return `<div class="manager-empty">${escapeHtml(message)}</div>`;
}

function formatShortDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function priorityTone(priority) {
  const normalized = String(priority || "").toLowerCase();
  if (normalized === "critical") return "danger";
  if (normalized === "high") return "warning";
  if (normalized === "low") return "success";
  return "neutral";
}

function getSafeProfileImage(value, fallback = "../../../assets/images/default-avatar.png") {
  if (typeof window.resolveWorkspaceImageSrc === "function") {
    return window.resolveWorkspaceImageSrc(value, fallback);
  }
  return String(value || "").trim() || fallback;
}

function setActiveGalleryPhoto(index) {
  const photos = memberProfileState.member?.uploadedPhotos || [];
  if (!photos.length) return;
  memberProfileState.activePhotoIndex = Math.max(0, Math.min(index, photos.length - 1));
  renderProfile(memberProfileState.member);
}

function stepGalleryPhoto(direction) {
  const photos = memberProfileState.member?.uploadedPhotos || [];
  if (!photos.length) return;
  const total = photos.length;
  memberProfileState.activePhotoIndex = (memberProfileState.activePhotoIndex + direction + total) % total;
  renderProfile(memberProfileState.member);
}

function exportAutoReportExcel() {
  const member = memberProfileState.member;
  if (!member) return;

  const rows = buildAutoReportRows(member);
  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1">
          <tr><th>Field</th><th>Value</th></tr>
          ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(String(value))}</td></tr>`).join("")}
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    `${slugifyFileName(member.name || "member")}-auto-report.xls`,
  );
  window.showToast?.("Auto report exported to Excel", "success");
}

function exportAutoReportPdf() {
  const member = memberProfileState.member;
  if (!member) return;

  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    window.showToast?.("Popup blocked. Please allow popups to export PDF.", "warning");
    return;
  }

  printWindow.document.write(buildAutoReportPrintDocument(member));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
  window.showToast?.("Print dialog opened. Choose Save as PDF to export.", "success");
}

function buildAutoReportRows(member) {
  const autoReport = member.autoReport || {};
  const assignedProjects = (member.assignedProjects || []).map((project) => project.projectName).filter(Boolean).join(", ") || "-";
  const latestUpdate = member.dailyUpdates?.[0]?.createdAt ? formatDateTime(member.dailyUpdates[0].createdAt) : "-";

  return [
    ["Member Name", member.name || "-"],
    ["Role", member.role || "-"],
    ["Department", member.department || "-"],
    ["Status", member.currentStatus || "Active"],
    ["Assigned Projects", assignedProjects],
    ["Productivity Score", `${member.productivityScore || 0}%`],
    ["Completed Tasks", member.completedTasks || 0],
    ["Pending Tasks", member.pendingTasks || 0],
    ["Daily Updates", autoReport.totalDailyUpdates || 0],
    ["Uploaded Files", autoReport.totalUploadedFiles || 0],
    ["Uploaded Images", autoReport.uploadedImages || 0],
    ["Average Completion", `${autoReport.averageCompletion || 0}%`],
    ["Auto Productivity", `${autoReport.productivityScore || 0}%`],
    ["Working Hours", member.totalWorkingHours || 0],
    ["Latest Update", latestUpdate],
    ["Manager Summary", autoReport.managerSummary || "Auto report unavailable."],
  ];
}

function buildAutoReportPrintDocument(member) {
  const rows = buildAutoReportRows(member);
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(member.name || "Member")} Auto Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { margin: 0 0 24px; color: #475569; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; vertical-align: top; }
          th { width: 32%; background: #eff6ff; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(member.name || "Member")} Auto Report</h1>
        <p>Generated on ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
        <table>
          <tbody>
            ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`).join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugifyFileName(value) {
  return String(value || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "report";
}

window.setActiveGalleryPhoto = setActiveGalleryPhoto;
window.stepGalleryPhoto = stepGalleryPhoto;
window.exportAutoReportExcel = exportAutoReportExcel;
window.exportAutoReportPdf = exportAutoReportPdf;
