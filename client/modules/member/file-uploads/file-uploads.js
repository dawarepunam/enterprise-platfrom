let fileData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  document.getElementById("fileUploadForm")?.addEventListener("submit", submitProofFile);
  await loadFiles();
});

async function loadFiles() {
  fileData = await window.memberWorkflow.loadMemberExperience();
  document.getElementById("fileProjectId").innerHTML = (fileData.projects || [])
    .map((project) => `<option value="${project.projectId}">${escapeHtml(project.projectName)}</option>`)
    .join("");

  document.getElementById("fileCards").innerHTML = (fileData.files || []).length
    ? fileData.files
        .map(
          (item) => `
            <article class="list-card">
              <strong>${escapeHtml(item.name || "Uploaded file")}</strong>
              <span class="list-meta">${escapeHtml(item.mimeType || "file")} | ${window.memberWorkflow.formatDateTime(item.createdAt)}</span>
              <a href="${escapeAttribute(item.oneDriveShareUrl || item.url || "#")}" target="_blank" rel="noreferrer">Open File</a>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No proof files uploaded yet.</p>';
}

async function submitProofFile(event) {
  event.preventDefault();
  const file = document.getElementById("proofFile")?.files?.[0];
  const projectId = document.getElementById("fileProjectId").value;
  const project = (fileData.projects || []).find((item) => String(item.projectId) === String(projectId));

  if (!file) {
    showToast?.("Select a file before uploading.", "warning", { title: "File Missing" });
    return;
  }

  try {
    await window.memberWorkflow.uploadMemberFile({
      file,
      projectId,
      teamId: project?.teamId || "",
      roomId: project?.roomId || "",
      module: "member",
      entityType: "project",
      entityId: projectId,
    });
    showToast?.("File uploaded to OneDrive and shared successfully.", "success", { title: "Upload Complete" });
    document.getElementById("fileUploadForm").reset();
    await loadFiles();
  } catch (error) {
    showToast?.(error.message || "Unable to upload file to OneDrive.", "error", { title: "Upload Failed" });
  }
}

function escapeAttribute(value = "") {
  return String(value).replace(/"/g, "&quot;");
}
