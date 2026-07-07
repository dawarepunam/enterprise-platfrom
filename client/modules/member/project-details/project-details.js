document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MEMBER",
  });
  if (!ready) return;
  await loadProjectDetailsPage();
});

async function loadProjectDetailsPage() {
  const projectId = new URLSearchParams(window.location.search).get("projectId");
  if (!projectId) {
    renderEmptyProject("Project link is missing a project id.");
    return;
  }

  try {
    const project = await window.memberWorkflow.loadMemberProjectDetail(projectId);
    renderProject(project);
  } catch (error) {
    renderEmptyProject(error.message || "Unable to load project details.");
  }
}

async function handleProjectTeamsOpen(projectId) {
  if (!projectId) return;
  try {
    const teamsUrl = await window.memberWorkflow.getMicrosoftTeamsUrl(projectId);
    window.location.href = teamsUrl;
  } catch (error) {
    showToast?.(error.message || "Unable to open Microsoft Teams.", "error", { title: "Teams Unavailable" });
  }
}

function renderProject(project) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const subtasks = Array.isArray(project.subtasks) ? project.subtasks : [];
  const meetings = Array.isArray(project.meetings) ? project.meetings : [];
  const dailyUpdates = Array.isArray(project.dailyUpdates) ? project.dailyUpdates : [];
  const workHistory = Array.isArray(project.workHistory) ? project.workHistory : [];
  const members = Array.isArray(project.teamMembersDetailed) ? project.teamMembersDetailed : [];
  const openWork = subtasks.filter((item) => !["Approved", "Completed"].includes(item.status)).length;
  const heroChips = [
    `<div class="member-chip"><strong>${project.clientName || "Internal"}</strong><span>Client</span></div>`,
    `<div class="member-chip"><strong>${formatShortDate(project.deadline)}</strong><span>Due Date</span></div>`,
    `<div class="member-chip"><strong>${meetings.length}</strong><span>Meetings</span></div>`,
  ];

  setText("projectTitle", project.projectName || "Project");
  setText("projectDescription", project.description || "Project delivery details are available below.");
  setText("projectStatus", project.status || "Active");
  setText("projectCompletion", `${project.completionPercentage || project.progress || 0}%`);
  setText("projectOpenWork", openWork);
  document.getElementById("projectHeroChips").innerHTML = heroChips.join("");

  document.getElementById("summaryTiles").innerHTML = [
    ["Manager", project.assignedManagerDetailed?.name || project.manager || "Unassigned"],
    ["Team", project.teams?.[0]?.name || project.projectTeamName || "Assigned Team"],
    ["Files", `${(project.files || []).length}`],
    ["Leads", `${(project.leads || []).length}`],
  ]
    .map(
      ([label, value]) => `
        <article class="workspace-tile">
          <strong>${label}</strong>
          <span>${escapeHtml(value)}</span>
          <p>Live project data synced from the workspace.</p>
        </article>
      `,
    )
    .join("");

  document.getElementById("memberList").innerHTML = members.length
    ? members
        .map(
          (member) => `
            <article class="message-bubble">
              <strong>${escapeHtml(member.name)}</strong>
              <p>${escapeHtml(member.role || "MEMBER")} | ${escapeHtml(member.department || "Delivery")}</p>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-inline">No team member list available.</div>';

  document.getElementById("projectActions").innerHTML = [
    `<a class="btn btn-primary" href="${window.memberWorkflow.buildWorkspaceUrl(project)}">Open Workspace</a>`,
    `<a class="btn ghost-btn" href="../my-tasks/my-tasks.html">My Tasks</a>`,
    `<a class="btn ghost-btn" href="../daily-updates/daily-updates.html">Daily Updates</a>`,
    `<button class="btn ghost-btn" type="button" onclick="handleProjectTeamsOpen('${escapeAttribute(project._id || "")}')">Microsoft Teams</button>`,
    project.oneDriveShareUrl ? `<a class="btn ghost-btn" href="${escapeAttribute(project.oneDriveShareUrl)}" target="_blank" rel="noreferrer">OneDrive</a>` : "",
  ].join("");

  document.getElementById("taskList").innerHTML = subtasks.length
    ? subtasks
        .map((subtask) => {
          const task = tasks.find((item) => String(item._id) === String(subtask.taskId));
          return `
            <article class="message-bubble">
              <strong>${escapeHtml(subtask.title)}</strong>
              <p>${escapeHtml(task?.title || "Main Task")} | ${escapeHtml(subtask.status || "Pending")} | ${formatShortDate(subtask.deadline)}</p>
            </article>
          `;
        })
        .join("")
    : '<div class="empty-inline">No assigned tasks in this project yet.</div>';

  const timeline = dailyUpdates
    .map((item) => ({
      title: item.summary || item.taskTitle || "Daily update",
      meta: `${window.memberWorkflow.formatDateTime(item.createdAt)} | ${Number(item.completion || 0)}% complete`,
      body: item.blockers || "No blockers reported",
      createdAt: item.createdAt,
    }))
    .concat(
      workHistory.map((item) => ({
        title: item.title || item.actionType || "Activity",
        meta: window.memberWorkflow.formatDateTime(item.createdAt),
        body: item.details || "Workspace activity recorded",
        createdAt: item.createdAt,
      })),
    )
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  document.getElementById("timelineList").innerHTML = timeline.length
    ? timeline
        .slice(0, 12)
        .map(
          (item) => `
            <article class="message-bubble">
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.meta)}</p>
              <p>${escapeHtml(item.body)}</p>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-inline">No updates or work history available yet.</div>';
}

function renderEmptyProject(message) {
  setText("projectTitle", "Project unavailable");
  setText("projectDescription", message);
  document.getElementById("summaryTiles").innerHTML = '<div class="empty-inline">No project data available.</div>';
  document.getElementById("memberList").innerHTML = "";
  document.getElementById("projectActions").innerHTML = '<a class="btn btn-primary" href="../projects/projects.html">Back to Projects</a>';
  document.getElementById("taskList").innerHTML = "";
  document.getElementById("timelineList").innerHTML = "";
}

function escapeAttribute(value = "") {
  return String(value).replace(/"/g, "&quot;");
}

window.handleProjectTeamsOpen = handleProjectTeamsOpen;
