document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "TEAM_LEAD" });
  if (!ready) return;

  const templates = [
    { name: "CRM Module Pack", note: "Lead form UI, Lead API, status update, follow-up logic, reports.", subtasks: ["Lead Form UI", "Lead API", "Lead Status Update", "Follow-up System", "Reports"] },
    { name: "Chat Module Pack", note: "UI, socket integration, storage, seen/unseen, file sharing, voice and video.", subtasks: ["Chat UI", "Socket Integration", "Message Storage", "Seen/Unseen", "File Sharing", "Voice Calling", "Video Meeting"] },
    { name: "Backend API Pack", note: "Model, controller, routes, validation, role access and QA notes.", subtasks: ["Model", "Controller", "Routes", "Validation", "RBAC Rules", "QA Notes"] },
    { name: "Testing Pack", note: "Checklist, bug proof, regression pass and review signoff.", subtasks: ["QA Checklist", "Bug Log", "Regression Review", "Approval Handoff"] },
  ];

  document.getElementById("templateList").innerHTML = templates
    .map(
      (item) => `
        <article class="action-card">
          <strong>${item.name}</strong>
          <span>${item.note}</span>
          <div class="template-list">
            ${item.subtasks.map((subtask) => `<span class="status-note">${subtask}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");
});
