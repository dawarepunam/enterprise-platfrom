let dailyUpdateData = null;
let assignedProjects = [];

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  document.getElementById("dailyUpdateForm")?.addEventListener("submit", submitDailyUpdate);
  await loadDailyUpdates();
});

async function loadDailyUpdates() {
  const [memberData, projects] = await Promise.all([
    window.memberWorkflow.loadMemberData(),
    window.memberWorkflow.loadAssignedProjects().catch(() => []),
  ]);
  dailyUpdateData = memberData;
  assignedProjects = Array.isArray(projects) ? projects : [];
  prefillProjectName();
  renderUpdateHistory();
}

function prefillProjectName() {
  const input = document.getElementById("updateProjectName");
  if (!input || input.value.trim() || assignedProjects.length !== 1) return;
  input.value = assignedProjects[0].projectName || "";
}

function resolveProjectByName(projectName = "") {
  const normalized = String(projectName || "").trim().toLowerCase();
  if (!normalized) return null;
  return assignedProjects.find((project) => String(project.projectName || "").trim().toLowerCase() === normalized) || null;
}

function renderUpdateHistory() {
  const items = (dailyUpdateData.dailyUpdates || []).filter((item) => String(item.userId || "") === String(window.memberWorkflow.getMemberUser()._id || "") || String(item.author || item.employee || "") === String(window.memberWorkflow.getMemberUser().name || ""));
  document.getElementById("updateCards").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="list-card">
              <strong>${escapeHtml(item.summary || item.completedWork || item.note || "Daily update")}</strong>
              <span class="list-meta">${window.memberWorkflow.formatDateTime(item.createdAt)} | ${Number(item.hoursWorked || item.hours || 0)}h | ${Number(item.completion || 0)}%</span>
              <span class="status-note">${escapeHtml(item.pendingWork || "No pending work shared")}</span>
              <span class="status-note">${escapeHtml(item.blockers || "No blockers reported")}</span>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No daily updates submitted yet.</p>';
}

async function submitDailyUpdate(event) {
  event.preventDefault();

  try {
    const projectName = document.getElementById("updateProjectName").value.trim();
    const project = resolveProjectByName(projectName);
    await window.memberWorkflow.createMemberDailyUpdate({
      projectId: project?._id || "",
      projectName: project?.projectName || projectName,
      completedWork: document.getElementById("updateCompletedWork").value.trim(),
      pendingWork: document.getElementById("updatePendingWork").value.trim(),
      hoursWorked: Number(document.getElementById("updateHours").value || 0),
      completion: Number(document.getElementById("updateCompletion").value || 0),
      summary: document.getElementById("updateCompletedWork").value.trim(),
      blockers: document.getElementById("updateBlockers").value.trim(),
      notes: document.getElementById("updateNotes").value.trim(),
    });
    showToast?.("Daily update saved and shared with your Team Lead.", "success", { title: "Update Submitted" });
    document.getElementById("dailyUpdateForm").reset();
    await loadDailyUpdates();
  } catch (error) {
    showToast?.(error.message || "Unable to submit daily update.", "error", { title: "Submit Failed" });
  }
}
