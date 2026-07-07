document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  window.managerHub?.ensureManagerMigration?.();
  document.getElementById("fileForm")?.addEventListener("submit", saveFileRecord);
  renderFiles();
});

function saveFileRecord(event) {
  event.preventDefault();
  const project = (window.managerHub?.getManagerProjects?.() || []).find((item) => item._id === document.getElementById("fileProjectId").value);
  if (!project) return;
  window.managerHub?.addFile?.({
    projectId: project._id,
    teamId: (window.managerHub?.getManagerTeams?.() || []).find((team) => team.projectId === project._id)?._id || "",
    uploadedBy: getCurrentUser?.().name || "Manager",
    uploadedById: getCurrentUser?.()._id || "usr-2",
    name: document.getElementById("fileName").value.trim(),
    originalName: document.getElementById("fileName").value.trim(),
    mimeType: document.getElementById("fileMime").value.trim(),
    sizeLabel: document.getElementById("fileSize").value.trim(),
    storageUrl: "#",
    category: document.getElementById("fileCategory").value,
    relatedTo: document.getElementById("fileRelatedTo").value,
  });
  renderFiles();
}

function renderFiles() {
  const projects = window.managerHub?.getManagerProjects?.() || [];
  const files = window.managerHub?.getFiles?.() || [];
  document.getElementById("fileProjectId").innerHTML = projects.map((project) => `<option value="${project._id}">${escapeHtml(project.projectName)}</option>`).join("");
  document.getElementById("fileMetrics").innerHTML = [
    ["Files", files.length, "UP"],
    ["Project Docs", files.filter((file) => file.relatedTo === "Project").length, "PJ"],
    ["Chat Files", files.filter((file) => file.relatedTo === "Chat").length, "CH"],
    ["Meeting Files", files.filter((file) => file.relatedTo === "Meeting").length, "MT"],
  ]
    .map(
      ([label, value, icon]) => `
        <article class="manager-kpi">
          <span class="kpi-icon">${getNavIconSvg(icon)}</span>
          <strong>${escapeHtml(String(value))}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `,
    )
    .join("");

  document.getElementById("fileList").innerHTML = files
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map(
      (file) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(file.originalName || file.name)}</strong>
            <span class="manager-badge">${escapeHtml(file.category || "-")}</span>
          </div>
          <p>${escapeHtml(file.mimeType || "-")} • ${escapeHtml(file.sizeLabel || "-")} • ${escapeHtml(file.relatedTo || "-")}</p>
          <span class="muted-line">Uploaded by ${escapeHtml(file.uploadedBy || "-")} on ${formatShortDate(file.createdAt)}</span>
        </article>
      `,
    )
    .join("");
}
