let memberTaskData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MEMBER",
  });
  if (!ready) return;
  await renderMemberTasks();
});

async function renderMemberTasks() {
  memberTaskData = await window.memberWorkflow.loadMemberExperience();
  const stats = window.memberWorkflow.deriveMemberStats(memberTaskData, memberTaskData.projects);
  const selectedFilter = String(new URLSearchParams(window.location.search).get("filter") || "ALL").toUpperCase();
  setText("taskOpenCount", stats.pending + stats.inProgress);
  setText("taskReviewCount", stats.review);
  setText("taskTimerState", stats.timerLabel);

  document.getElementById("taskHeroChips").innerHTML = [
    `<a class="member-chip" href="${window.memberWorkflow.buildMemberTasksUrl("ALL")}"><strong>${stats.total}</strong><span>Total Assigned</span></a>`,
    `<a class="member-chip" href="${window.memberWorkflow.buildMemberTasksUrl("IN_REVIEW")}"><strong>${stats.review}</strong><span>In Review</span></a>`,
    `<a class="member-chip" href="${window.memberWorkflow.buildMemberTasksUrl("COMPLETED")}"><strong>${stats.completed}</strong><span>Completed</span></a>`,
  ].join("");

  const groups = selectedFilter === "COMPLETED"
    ? [["Completed", ["Approved", "Completed"]]]
    : selectedFilter === "IN_REVIEW"
      ? [["Review", ["In Review"]]]
      : [
          ["To Do", ["Assigned", "Pending"]],
          ["In Progress", ["Accepted", "Active"]],
          ["Review", ["In Review"]],
          ["Completed", ["Approved", "Completed"]],
        ];

  document.getElementById("memberTaskBoard").innerHTML = groups
    .map(([label, statuses]) => {
      const items = (memberTaskData.subtasks || []).filter((subtask) => statuses.includes(subtask.status || "Assigned"));
      return `
        <section class="task-column">
          <h3>${label}</h3>
          <p>${items.length} items</p>
          ${
            items.length
              ? items.map(renderTaskCard).join("")
              : '<div class="empty-inline">No tasks in this stage.</div>'
          }
        </section>
      `;
    })
    .join("");

  window.clearInterval(window.__memberTaskTimerInterval);
  window.__memberTaskTimerInterval = window.setInterval(() => {
    const timer = window.memberWorkflow.getMemberTimerState();
    setText("taskTimerState", timer ? window.memberWorkflow.formatDuration(window.memberWorkflow.getActiveTimerElapsed(timer)) : "00:00:00");
  }, 1000);
}

function renderTaskCard(subtask) {
  const task = window.memberWorkflow.getTaskForSubtask(memberTaskData.tasks, subtask);
  const project = (memberTaskData.projects || []).find((item) => String(item.projectId) === String(task?.projectId));
  return `
    <article class="list-card task-card">
      <div class="task-row-top">
        <div class="task-copy">
          <strong>${escapeHtml(subtask.title)}</strong>
          <p>${escapeHtml(task?.projectName || "Project")} | ${escapeHtml(task?.title || "Main Task")}</p>
        </div>
        <span class="priority-pill ${priorityClass(subtask.priority || task?.priority || "Medium")}">${escapeHtml(subtask.priority || task?.priority || "Medium")}</span>
      </div>
      <div class="chip-row">
        <span class="status-pill ${statusClass(subtask.status || "Assigned")}">${escapeHtml(subtask.status || "Assigned")}</span>
        <span class="icon-chip">Due ${formatShortDate(subtask.deadline || task?.deadline)}</span>
      </div>
      <p class="workspace-note">${escapeHtml(subtask.instructions || subtask.description || "Assigned task is ready for execution.")}</p>
      <div class="task-inline-actions">
        <button class="btn ghost-btn" type="button" onclick="changeMemberTaskStatus('${subtask._id}', 'Accepted', 10)">Accept</button>
        <button class="btn ghost-btn" type="button" onclick="changeMemberTaskStatus('${subtask._id}', 'Active', 35)">Start</button>
        <button class="btn ghost-btn" type="button" onclick="startTaskTimer('${subtask._id}')">Timer</button>
        <button class="btn btn-primary" type="button" onclick="changeMemberTaskStatus('${subtask._id}', 'In Review', 100)">Review</button>
        <a class="btn ghost-btn" href="${project ? window.memberWorkflow.buildProjectDetailsUrl(project) : '../projects/projects.html'}">Project</a>
        <a class="btn ghost-btn" href="../file-uploads/file-uploads.html">Deliverables</a>
        <a class="btn ghost-btn" href="${project ? window.memberWorkflow.buildWorkspaceUrl(project) : '../workspace/workspace.html'}">Workspace</a>
      </div>
    </article>
  `;
}

async function changeMemberTaskStatus(id, status, progress) {
  try {
    await window.memberWorkflow.submitMemberSubtaskStatus(id, {
      status,
      progress,
      timeSpentHours: status === "In Review" ? 8 : undefined,
      submittedNote: status === "In Review" ? "Submitted by member for Team Lead review." : "",
    });
    showToast?.(`Task moved to ${status}.`, "success", { title: "Task Updated" });
    await renderMemberTasks();
  } catch (error) {
    showToast?.(error.message || "Unable to update task status.", "error", { title: "Update Failed" });
  }
}

function startTaskTimer(subtaskId) {
  const subtask = (memberTaskData.subtasks || []).find((item) => String(item._id) === String(subtaskId));
  const task = window.memberWorkflow.getTaskForSubtask(memberTaskData.tasks, subtask);
  window.memberWorkflow.startMemberTimer({
    subtaskId,
    taskId: task?._id,
    taskTitle: subtask?.title || task?.title || "Focused Work",
    projectId: task?.projectId,
    projectName: task?.projectName || "Workspace",
  });
  showToast?.("Timer started for this task.", "success", { title: "Timer Running" });
  renderMemberTasks();
}

window.changeMemberTaskStatus = changeMemberTaskStatus;
window.startTaskTimer = startTaskTimer;
