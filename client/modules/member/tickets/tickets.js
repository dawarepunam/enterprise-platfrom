document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MEMBER",
  });
  if (!ready) return;
  document.getElementById("memberTicketForm").addEventListener("submit", submitMemberTicket);
  await renderMemberTickets();
});

async function renderMemberTickets() {
  const experience = await window.memberWorkflow.loadMemberExperience();
  const tickets = experience.tickets || [];
  setText("memberTicketOpen", tickets.filter((item) => item.status === "Open").length);
  setText("memberTicketReview", tickets.filter((item) => item.status === "In Review").length);
  setText("memberTicketTotal", tickets.length);

  document.getElementById("ticketProject").innerHTML = (experience.projects || [])
    .map((project) => `<option value="${escapeHtml(project.projectName)}">${escapeHtml(project.projectName)}</option>`)
    .join("") || '<option value="">General Workspace</option>';

  document.getElementById("memberTicketCards").innerHTML = tickets.length
    ? tickets
        .map(
          (ticket) => `
            <article class="list-card">
              <div class="project-titlebar">
                <div class="project-copy">
                  <strong>${escapeHtml(ticket.title)}</strong>
                  <p>${escapeHtml(ticket.summary || ticket.type || "Ticket record")}</p>
                </div>
                <span class="status-pill ${statusClass(ticket.status || "Open")}">${escapeHtml(ticket.status || "Open")}</span>
              </div>
              <div class="chip-row">
                <span class="priority-pill ${priorityClass(ticket.priority || "Medium")}">${escapeHtml(ticket.priority || "Medium")}</span>
                <span class="icon-chip">${escapeHtml(ticket.projectName || "General Workspace")}</span>
                <span class="icon-chip">${window.memberWorkflow.formatDateTime(ticket.createdAt)}</span>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No tickets raised yet.</p>';
}

async function submitMemberTicket(event) {
  event.preventDefault();
  window.memberWorkflow.saveMemberTicket({
    title: document.getElementById("ticketTitle").value.trim(),
    type: document.getElementById("ticketType").value,
    projectName: document.getElementById("ticketProject").value,
    priority: document.getElementById("ticketPriority").value,
    summary: document.getElementById("ticketSummary").value.trim(),
    status: "Open",
  });
  showToast?.("Ticket raised successfully.", "success", { title: "Ticket Saved" });
  document.getElementById("memberTicketForm").reset();
  await renderMemberTickets();
}
