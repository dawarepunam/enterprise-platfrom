let managerProjects = [];
let managerMembers = [];
let managerTeams = [];
let pendingSelectedMembers = new Set();

document.addEventListener("DOMContentLoaded", async() => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  window.managerHub?.ensureManagerMigration?.();
  bindEvents();
  refreshTeamData();
});

function bindEvents() {
  document.getElementById("teamForm")?.addEventListener("submit", handleTeamSave);
  document.getElementById("teamProjectId")?.addEventListener("change", syncSelectedProject);
  document.getElementById("resetTeamForm")?.addEventListener("click", resetTeamForm);
  document.getElementById("addMemberButton")?.addEventListener("click", handleAddMemberSelection);
  document.getElementById("openTeamChatBtn")?.addEventListener("click", openTeamChat);
  document.getElementById("openTeamCallsBtn")?.addEventListener("click", openTeamCalls);
  document.getElementById("openTeamMeetingsBtn")?.addEventListener("click", openTeamMeetings);

  ["filterDepartment", "filterAvailability", "filterPerformance", "filterSkill", "memberSearch"].forEach((id) => {
    const element = document.getElementById(id);
    element?.addEventListener("change", renderMemberGrid);
    element?.addEventListener("input", renderMemberGrid);
  });
}

function resetTeamForm() {
  document.getElementById("teamForm")?.reset();
  document.getElementById("teamId").value = "";
  resetPendingSelectionFromTeam();
  syncSelectedProject();
  renderMemberGrid();
}

function refreshTeamData() {
  managerProjects = window.managerHub?.getManagerProjects?.() || [];
  managerMembers = window.managerHub?.getManagerMembers?.() || [];
  managerTeams = window.managerHub?.getManagerTeams?.() || [];
  resetPendingSelectionFromTeam();
  renderTeamMetrics();
  populateProjects();
  populateDepartments();
  populateSkills();
  populateMemberPicker();
  syncSelectedProject();
  renderMemberGrid();
  renderRecommendations();
  renderWorkloadView();
  renderRoster();
  renderPerformanceBoard();
}

function renderTeamMetrics() {
  document.getElementById("teamMetrics").innerHTML = [
    ["Teams Created", managerTeams.length, "TM"],
    ["Roster Members", managerTeams.reduce((sum, team) => sum + (team.members || []).length, 0), "US"],
    ["On Hold", managerTeams.reduce((sum, team) => sum + (team.holdMembers || []).length, 0), "ER"],
    ["Available Talent", managerMembers.filter((member) => member.availability === "Available").length, "DL"],
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
}

function populateProjects() {
  const select = document.getElementById("teamProjectId");
  if (!select) return;

  const queryProjectId = new URLSearchParams(window.location.search).get("projectId");
  select.innerHTML = managerProjects
    .map((project) => `<option value="${project._id}">${escapeHtml(project.projectName)} - ${escapeHtml(project.department)}</option>`)
    .join("");

  if (queryProjectId && managerProjects.some((project) => project._id === queryProjectId)) {
    select.value = queryProjectId;
  }
}

function populateDepartments() {
  const select = document.getElementById("filterDepartment");
  if (!select) return;

  const departments = Array.from(new Set(managerMembers.map((member) => member.department).filter(Boolean)));
  const currentValue = select.value;
  select.innerHTML = ['<option value="">All</option>']
    .concat(departments.map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`))
    .join("");
  select.value = departments.includes(currentValue) ? currentValue : "";
}

function populateSkills() {
  const select = document.getElementById("filterSkill");
  if (!select) return;

  const skills = Array.from(
    new Set(
      managerMembers
        .flatMap((member) => (member.skills || []).map((skill) => String(skill).trim()))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const currentValue = select.value;
  select.innerHTML = ['<option value="">All</option>']
    .concat(skills.map((skill) => `<option value="${escapeHtml(skill)}">${escapeHtml(skill)}</option>`))
    .join("");
  select.value = skills.includes(currentValue) ? currentValue : "";
}

function populateMemberPicker() {
  const picker = document.getElementById("memberPicker");
  if (!picker) return;

  const selected = new Set(getSelectedMembers());
  picker.innerHTML = ['<option value="">Choose a member to add</option>']
    .concat(
      getFilteredMembers()
        .filter((member) => !selected.has(member.name))
        .map((member) => {
          const skills = (member.skills || []).slice(0, 3).join(", ");
          return `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} - ${escapeHtml(skills || "No skills")}</option>`;
        }),
    )
    .join("");
}

function syncSelectedProject() {
  const project = getSelectedProject();
  const team = getSelectedTeam();
  const teamDepartment = document.getElementById("teamDepartment");
  const teamName = document.getElementById("teamName");
  const teamSkills = document.getElementById("teamSkills");
  const teamId = document.getElementById("teamId");
  const taskLink = document.getElementById("openTaskAssignment");

  if (!project) {
    if (teamDepartment) teamDepartment.value = "";
    if (teamName) teamName.value = "";
    if (teamSkills) teamSkills.value = "";
    if (teamId) teamId.value = "";
    setFeatureAvailability(null);
    return;
  }

  if (teamDepartment) teamDepartment.value = project.department || "";
  if (teamName) teamName.value = team?.name || `${project.projectName} Core Team`;
  if (teamSkills) teamSkills.value = Array.isArray(team?.skills) ? team.skills.join(", ") : "";
  if (teamId) teamId.value = team?._id || "";

  resetPendingSelectionFromTeam();

  if (taskLink) {
    taskLink.href = `../tasks/tasks.html?projectId=${encodeURIComponent(project._id)}`;
  }

  renderRoster();
  renderPerformanceBoard();
  renderRecommendations();
  renderWorkloadView();
  renderSelectionSummary();
  setFeatureAvailability(team);
}

function resetPendingSelectionFromTeam() {
  const team = getSelectedTeam();
  pendingSelectedMembers = new Set(team?.members || []);
}

function getSelectedProject() {
  return managerProjects.find((project) => project._id === document.getElementById("teamProjectId")?.value) || null;
}

function getSelectedTeam() {
  const project = getSelectedProject();
  if (!project) return null;
  return managerTeams.find((team) => String(team.projectId || "") === String(project._id)) || null;
}

function getFilteredMembers() {
  const department = document.getElementById("filterDepartment")?.value || "";
  const availability = document.getElementById("filterAvailability")?.value || "";
  const performance = Number(document.getElementById("filterPerformance")?.value || 0);
  const skill = document.getElementById("filterSkill")?.value || "";
  const query = String(document.getElementById("memberSearch")?.value || "").trim().toLowerCase();

  return managerMembers.filter((member) => {
    const matchesDepartment = !department || member.department === department;
    const matchesAvailability = !availability || member.availability === availability;
    const matchesPerformance = Number(member.performanceScore || 0) >= performance;
    const matchesSkill = !skill || (member.skills || []).some((memberSkill) => String(memberSkill || "").toLowerCase() === skill.toLowerCase());
    const haystack = `${member.name} ${member.department} ${(member.skills || []).join(" ")}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesDepartment && matchesAvailability && matchesPerformance && matchesSkill && matchesQuery;
  });
}

function renderMemberGrid() {
  const target = document.getElementById("memberSelectionList");
  if (!target) return;

  const filteredMembers = getFilteredMembers();
  const selectedMembers = managerMembers.filter((member) => pendingSelectedMembers.has(member.name));
  populateMemberPicker();

  if (!selectedMembers.length) {
    const emptyText = filteredMembers.length
      ? "Dropdown madhun members add kara. Selected members ithe checkbox sobat disatil."
      : "Current filters madhe member sapadle nahi.";
    target.innerHTML = `<article class="selected-member-card is-empty">${escapeHtml(emptyText)}</article>`;
    renderSelectionSummary();
    return;
  }

  target.innerHTML = selectedMembers
    .map((member) => `
      <label class="selected-member-card">
        <div class="selected-member-toggle">
          <input type="checkbox" checked onchange="toggleMemberSelection('${escapeJs(member.name)}', this.checked)" />
          <div class="selected-member-meta">
            <strong>${escapeHtml(member.name)}</strong>
            <span>${escapeHtml(member.department || "-")} - ${escapeHtml(member.availability || "Available")}</span>
          </div>
        </div>
        <div class="manager-inline-metrics">
          <span class="manager-badge">Skills ${escapeHtml((member.skills || []).slice(0, 3).join(", ") || "-")}</span>
          <span class="manager-badge">Performance ${member.performanceScore || 0}</span>
          <span class="manager-badge">Workload ${member.workload || 0}%</span>
        </div>
      </label>
    `)
    .join("");

  renderSelectionSummary();
}

function getSelectedMembers() {
  return Array.from(pendingSelectedMembers);
}

function toggleMemberSelection(memberName, checked) {
  if (checked) {
    pendingSelectedMembers.add(memberName);
  } else {
    pendingSelectedMembers.delete(memberName);
  }
  renderMemberGrid();
}

function renderSelectionSummary() {
  const target = document.getElementById("selectionSummary");
  if (!target) return;

  const selectedMembers = managerMembers.filter((member) => pendingSelectedMembers.has(member.name));
  if (!selectedMembers.length) {
    target.innerHTML = '<div class="manager-empty">Create Team madhe members select kele ki roster summary ithe disel.</div>';
    return;
  }

  const departments = Array.from(new Set(selectedMembers.map((member) => member.department).filter(Boolean)));
  const avgPerformance = Math.round(selectedMembers.reduce((sum, member) => sum + Number(member.performanceScore || 0), 0) / selectedMembers.length);
  const avgWorkload = Math.round(selectedMembers.reduce((sum, member) => sum + Number(member.workload || 0), 0) / selectedMembers.length);

  target.innerHTML = `
    <div class="selection-summary-grid">
      <article class="selection-summary-card">
        <strong>${selectedMembers.length}</strong>
        <span>Selected Members</span>
      </article>
      <article class="selection-summary-card">
        <strong>${departments.length}</strong>
        <span>Departments Covered</span>
      </article>
      <article class="selection-summary-card">
        <strong>${avgPerformance}%</strong>
        <span>Average Performance</span>
      </article>
      <article class="selection-summary-card">
        <strong>${avgWorkload}%</strong>
        <span>Average Workload</span>
      </article>
    </div>
    <article class="manager-list-item">
      <strong>Selected roster</strong>
      <p>${escapeHtml(selectedMembers.map((member) => `${member.name} (${member.department})`).join(", "))}</p>
      <div class="manager-inline-metrics">
        ${departments.map((department) => `<span class="manager-badge">${escapeHtml(department)}</span>`).join("")}
      </div>
    </article>
  `;
}

function handleTeamSave(event) {
  event.preventDefault();

  const project = getSelectedProject();
  if (!project) return;

  const selectedMembers = getSelectedMembers();
  if (!selectedMembers.length) {
    window.alert("Kamital ek member select kara ani mag team create kara.");
    return;
  }

  const memberIds = managerMembers.filter((member) => selectedMembers.includes(member.name)).map((member) => member._id);
  const savedTeam = window.managerHub?.saveTeam?.({
    _id: document.getElementById("teamId").value || `team-${Date.now()}`,
    projectId: project._id,
    projectName: project.projectName,
    name: document.getElementById("teamName").value.trim(),
    manager: getCurrentUser?.().name || "Manager",
    department: project.department || "",
    status: project.status === "Planning" ? "Planning" : "Active",
    members: selectedMembers,
    memberIds,
    memberDepartments: selectedMembers.map((memberName) => {
      const member = managerMembers.find((item) => item.name === memberName);
      return {
        name: memberName,
        department: member?.department || "",
      };
    }),
    skills: String(document.getElementById("teamSkills").value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  });

  refreshTeamData();

  if (savedTeam) {
    document.getElementById("teamId").value = savedTeam._id || "";
    setFeatureAvailability(savedTeam);
  }
}

function handleAddMemberSelection() {
  const picker = document.getElementById("memberPicker");
  if (!picker?.value) return;

  pendingSelectedMembers.add(picker.value);
  picker.value = "";
  renderMemberGrid();
}

function openTeamChat() {
  const team = getSelectedTeam();
  const project = getSelectedProject();
  if (!project || !team) return;
  window.location.href = `../chat/chat.html?projectId=${encodeURIComponent(project._id)}`;
}

function openTeamCalls() {
  const team = getSelectedTeam();
  if (!team) return;
  window.location.href = `../calls/calls.html?teamId=${encodeURIComponent(team._id)}`;
}

function openTeamMeetings() {
  const team = getSelectedTeam();
  if (!team) return;
  window.location.href = `../meetings/meetings.html?teamId=${encodeURIComponent(team._id)}`;
}

function renderRecommendations() {
  const target = document.getElementById("recommendationList");
  const project = getSelectedProject();
  if (!target || !project) return;

  const recommendations = window.managerHub?.getRecommendationSnapshot?.(project._id) || [];
  target.innerHTML = recommendations
    .slice(0, 5)
    .map(
      (row) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(row.memberName)}</strong>
            <span class="manager-badge">${row.skillMatch}% match</span>
          </div>
          <p>${escapeHtml(row.department)} - ${escapeHtml(row.availability)} - ${row.experience} yrs</p>
          <div class="manager-inline-metrics">
            <span class="manager-badge">Workload ${row.currentWorkload}%</span>
            <span class="manager-badge">Attendance ${row.attendanceRate}%</span>
            <span class="manager-badge">Performance ${row.performanceScore}</span>
            <span class="manager-badge">Leave ${row.leaveBalance} days</span>
          </div>
          <span class="muted-line">${escapeHtml(row.conflictWarning || `Available hours ${row.availableHours}/day`)}</span>
        </article>
      `,
    )
    .join("");
}

function renderWorkloadView() {
  const target = document.getElementById("workloadList");
  if (!target) return;

  const workload = window.managerHub?.getWorkloadSnapshot?.() || [];
  target.innerHTML = workload
    .slice(0, 6)
    .map(
      (row) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(row.memberName)}</strong>
            <span class="manager-badge">${row.totalWorkload}% workload</span>
          </div>
          <p>${row.projectSplit.map((item) => `${escapeHtml(item.projectName)} ${item.percent}%`).join(" - ") || "No project split"}</p>
          <span class="muted-line">${escapeHtml(row.conflictWarning || `Available ${row.availableHours} hours/day`)}</span>
        </article>
      `,
    )
    .join("");
}

function renderRoster() {
  const target = document.getElementById("teamRoster");
  const team = getSelectedTeam();
  if (!target) return;

  if (!team) {
    target.innerHTML = '<div class="manager-empty">No team created yet for the selected project.</div>';
    return;
  }

  target.innerHTML = `
    <article class="manager-list-item">
      <strong>${escapeHtml(team.name)}</strong>
      <p>${escapeHtml(team.projectName)} - ${escapeHtml(team.department || "-")}</p>
      <div class="manager-inline-metrics">
        <span class="manager-badge">Members ${(team.members || []).length}</span>
        <span class="manager-badge">Status ${escapeHtml(team.status || "Active")}</span>
      </div>
    </article>
  `;

  target.innerHTML += (team.members || [])
    .map((memberName) => {
      const member = managerMembers.find((item) => item.name === memberName);
      const holdStatus = (team.holdMembers || []).find((item) => item.name === memberName);
      return `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(memberName)}</strong>
            <span class="manager-badge">${holdStatus ? `On Hold: ${escapeHtml(holdStatus.reason)}` : escapeHtml(member?.availability || "Active")}</span>
          </div>
          <p>${escapeHtml(member?.department || "-")} - Skills ${escapeHtml((member?.skills || []).join(", "))}</p>
          <div class="manager-member-actions">
            <a class="btn ghost-btn" href="../tasks/tasks.html?projectId=${encodeURIComponent(team.projectId || "")}&memberName=${encodeURIComponent(memberName)}">Assign Task</a>
            <button class="btn ghost-btn" type="button" onclick="holdSelectedMember('${escapeJs(team._id)}','${escapeJs(memberName)}')">Put On Hold</button>
            <button class="btn ghost-btn" type="button" onclick="shiftSelectedMember('${escapeJs(team._id)}','${escapeJs(memberName)}')">Shift Project</button>
            <button class="btn ghost-btn" type="button" onclick="removeSelectedMember('${escapeJs(team._id)}','${escapeJs(memberName)}')">Remove</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPerformanceBoard() {
  const target = document.getElementById("performanceBoard");
  const team = getSelectedTeam();
  if (!target) return;

  if (!team || !(team.members || []).length) {
    target.innerHTML = '<div class="manager-empty">Add members to see workload and productivity signals.</div>';
    return;
  }

  const tasks = window.managerHub?.getManagerTasks?.() || [];
  target.innerHTML = team.members
    .map((memberName) => {
      const member = managerMembers.find((item) => item.name === memberName) || {};
      const memberTasks = tasks.filter((task) => String(task.projectId || "") === String(team.projectId || "") && task.assignee === memberName);
      const avgProgress = memberTasks.length
        ? Math.round(memberTasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / memberTasks.length)
        : 0;
      const overdue = memberTasks.filter((task) => task.status !== "Completed" && new Date(task.deadline) < new Date()).length;
      const flagged = overdue > 0 || Number(member.performanceScore || 0) < 80 || Number(member.workload || 0) > 80;

      return `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(memberName)}</strong>
            <span class="manager-badge">${flagged ? "Needs Attention" : "Healthy"}</span>
          </div>
          <p>Tasks ${memberTasks.length} - Avg progress ${avgProgress}% - Workload ${member.workload || 0}% - Performance ${member.performanceScore || 0}</p>
          <span class="muted-line">${flagged ? "Consider coaching, hold, shift, or removal." : "Balanced workload and stable output."}</span>
        </article>
      `;
    })
    .join("");
}

function setFeatureAvailability(team) {
  const hasTeam = Boolean(team?._id);
  const featureStatus = document.getElementById("teamFeatureStatus");
  const taskLink = document.getElementById("openTaskAssignment");
  const chatButton = document.getElementById("openTeamChatBtn");
  const callsButton = document.getElementById("openTeamCallsBtn");
  const meetingsButton = document.getElementById("openTeamMeetingsBtn");

  if (featureStatus) {
    featureStatus.textContent = hasTeam
      ? `${team.name} ready aahe. Ata chat, calls, meetings ani task assignment open karu shakta.`
      : "Pahile team create kara. Nantar chat, calls, meetings ani task assignment active hotil.";
  }

  if (taskLink) {
    taskLink.setAttribute("aria-disabled", hasTeam ? "false" : "true");
    taskLink.classList.toggle("is-disabled", !hasTeam);
    taskLink.tabIndex = hasTeam ? 0 : -1;
  }

  [chatButton, callsButton, meetingsButton].forEach((button) => {
    if (!button) return;
    button.disabled = !hasTeam;
    button.setAttribute("aria-disabled", hasTeam ? "false" : "true");
  });
}

function removeSelectedMember(teamId, memberName) {
  if (!window.confirm(`Remove ${memberName} from this team and unassign open tasks?`)) return;
  window.managerHub?.removeMemberFromTeam?.(teamId, memberName);
  refreshTeamData();
}

function holdSelectedMember(teamId, memberName) {
  const reason = window.prompt(`Why is ${memberName} being put on hold?`, "Temporary bandwidth block");
  if (!reason) return;
  window.managerHub?.holdMember?.(teamId, memberName, reason);
  refreshTeamData();
}

function shiftSelectedMember(teamId, memberName) {
  const nextProject = window.prompt(
    `Enter target project ID for ${memberName}.`,
    managerProjects.find((project) => project._id !== getSelectedProject()?._id)?._id || "",
  );
  if (!nextProject) return;
  window.managerHub?.shiftMember?.(teamId, memberName, nextProject);
  refreshTeamData();
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.removeSelectedMember = removeSelectedMember;
window.holdSelectedMember = holdSelectedMember;
window.shiftSelectedMember = shiftSelectedMember;
window.toggleMemberSelection = toggleMemberSelection;

