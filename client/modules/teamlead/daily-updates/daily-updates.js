document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "TEAM_LEAD" });
  if (!ready) return;
  bindLeadUpdateForm();
  renderLeadNotes();
});

function renderLeadNotes() {
  const currentUser = getCurrentUser?.() || {};
  const notes = (window.enterpriseStore?.getTaskUpdates?.() || [])
    .filter((item) => String(item.role || "") === "TEAM_LEAD" || String(item.author || "") === String(currentUser.name || ""))
    .slice(0, 6);

  document.getElementById("updatesList").innerHTML = notes.length
    ? notes
        .map(
          (note) => `
            <article class="list-card">
              <strong>${escapeHtml(note.summary || "Lead update")}</strong>
              <span class="list-meta">${escapeHtml(note.status || "-")} • ${Number(note.progress || 0)}%</span>
              <span class="status-note">${escapeHtml(note.feedback || note.resourceNeed || "Manager-facing update saved.")}</span>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No lead notes captured yet.</p>';
}

function bindLeadUpdateForm() {
  document.getElementById("leadUpdateForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const completedWork = document.getElementById("completedWork").value.trim();
    const blockers = document.getElementById("blockers").value.trim();
    const resourceNeed = document.getElementById("resourceNeed").value.trim();

    window.enterpriseStore?.upsertTaskUpdate?.({
      _id: `lead-note-${Date.now()}`,
      taskId: "manager-report",
      author: getCurrentUser?.().name || "Team Lead",
      role: "TEAM_LEAD",
      updateType: "Manager Report",
      status: blockers ? "Risk Reported" : "Reported",
      progress: blockers ? 70 : 90,
      summary: completedWork || "Daily lead status submitted to manager.",
      feedback: blockers,
      resourceNeed,
      createdAt: new Date().toISOString(),
    });

    showToast?.("Lead status update sent to manager summary", "success");
    document.getElementById("leadUpdateForm").reset();
    renderLeadNotes();
  });
}
