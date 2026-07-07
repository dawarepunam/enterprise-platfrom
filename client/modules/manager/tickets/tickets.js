document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;
  await window.managerHub?.ensureManagerMigration?.();
  document.getElementById("ticketForm")?.addEventListener("submit", saveTicket);
  document.getElementById("moodForm")?.addEventListener("submit", saveMood);
  renderTickets();
});

function saveTicket(event) {
  event.preventDefault();
  const project = (window.managerHub?.getManagerProjects?.() || []).find((item) => item._id === document.getElementById("ticketProject").value);
  window.managerHub?.addTicket?.({
    title: document.getElementById("ticketTitle").value.trim(),
    type: document.getElementById("ticketType").value,
    raisedBy: document.getElementById("ticketRaisedBy").value,
    projectName: project?.projectName || "",
    priority: document.getElementById("ticketPriority").value,
  });
  renderTickets();
}

function saveMood(event) {
  event.preventDefault();
  window.managerHub?.addMood?.({
    memberName: document.getElementById("moodMember").value,
    mood: document.getElementById("moodValue").value,
    note: document.getElementById("moodNote").value.trim(),
  });
  renderTickets();
}

function renderTickets() {
  const members = window.managerHub?.getManagerMembers?.() || [];
  const projects = window.managerHub?.getManagerProjects?.() || [];
  const tickets = window.managerHub?.getTickets?.() || [];
  const moods = window.managerHub?.getMoods?.() || [];
  document.getElementById("ticketRaisedBy").innerHTML = members.map((member) => `<option>${escapeHtml(member.name)}</option>`).join("");
  document.getElementById("moodMember").innerHTML = members.map((member) => `<option>${escapeHtml(member.name)}</option>`).join("");
  document.getElementById("ticketProject").innerHTML = projects.map((project) => `<option value="${project._id}">${escapeHtml(project.projectName)}</option>`).join("");

  document.getElementById("ticketMetrics").innerHTML = [
    ["Open Tickets", tickets.filter((item) => item.status === "Open").length, "ER"],
    ["In Review", tickets.filter((item) => item.status === "In Review").length, "RV"],
    ["Stressed Mood", moods.filter((item) => item.mood === "Stressed").length, "BD"],
    ["Happy Mood", moods.filter((item) => item.mood === "Happy").length, "DL"],
  ].map(([label, value, icon]) => `
    <article class="manager-kpi">
      <span class="kpi-icon">${getNavIconSvg(icon)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");

  document.getElementById("ticketList").innerHTML = tickets.slice().reverse().map((ticket) => `
    <article class="manager-list-item">
      <div class="manager-row-between">
        <strong>${escapeHtml(ticket.title)}</strong>
        <span class="priority-pill ${priorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span>
      </div>
      <p>${escapeHtml(ticket.type)} • ${escapeHtml(ticket.projectName || "-")} • ${escapeHtml(ticket.raisedBy)}</p>
      <span class="muted-line">${escapeHtml(ticket.status)} • ${formatShortDate(ticket.createdAt)}</span>
    </article>
  `).join("");

  document.getElementById("moodList").innerHTML = moods.slice().reverse().slice(0, 5).map((mood) => `
    <article class="manager-list-item">
      <strong>${escapeHtml(mood.memberName)} • ${escapeHtml(mood.mood)}</strong>
      <span class="muted-line">${escapeHtml(mood.note || "")}</span>
    </article>
  `).join("");
}
