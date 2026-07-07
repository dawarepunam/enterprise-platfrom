const workspaceState = {
  experience: null,
  activeProject: null,
  activeRoom: null,
  messages: [],
  filteredMessages: [],
  events: [],
  socketReady: false,
  voiceCall: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MEMBER",
  });
  if (!ready) return;

  bindWorkspaceEvents();
  await bootWorkspace();
  setupWorkspaceRealtime();
});

function bindWorkspaceEvents() {
  document.getElementById("workspaceComposer").addEventListener("submit", handleWorkspaceMessageSubmit);
  document.getElementById("workspaceUpdateForm").addEventListener("submit", handleWorkspaceUpdateSubmit);
  document.getElementById("workspaceMessageSearch").addEventListener("input", handleWorkspaceSearch);
  document.getElementById("workspaceCallBtn").addEventListener("click", startWorkspaceCall);
  document.getElementById("workspaceMeetingBtn").addEventListener("click", startWorkspaceMeeting);
  document.getElementById("workspaceTimerAction").addEventListener("click", handleTimerAction);
  document.getElementById("workspaceTimerStop").addEventListener("click", handleTimerStop);
  document.getElementById("workspaceMessageInput").addEventListener("input", emitWorkspaceTyping);
  document.getElementById("workspaceFileInput").addEventListener("change", handleWorkspaceFileUpload);
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.innerHTML = getWorkspaceToolIcon(button.dataset.tool);
    button.addEventListener("click", () => handleWorkspaceTool(button.dataset.tool));
  });
}

async function bootWorkspace() {
  workspaceState.experience = await window.memberWorkflow.loadMemberExperience();
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId");
  const roomId = params.get("roomId");

  workspaceState.activeProject = window.memberWorkflow.getProjectWorkspaceSummary(projectId, roomId, workspaceState.experience);
  workspaceState.activeRoom = workspaceState.experience.rooms.find((room) => String(room.roomId) === String(roomId)) || null;

  if (!workspaceState.activeProject && workspaceState.experience.projects.length) {
    workspaceState.activeProject = workspaceState.experience.projects[0];
  }

  if (!workspaceState.activeRoom && workspaceState.activeProject?.roomId) {
    workspaceState.activeRoom = workspaceState.experience.rooms.find((room) => String(room.roomId) === String(workspaceState.activeProject.roomId)) || null;
  }

  renderWorkspaceShell();
  await loadWorkspaceMessages();
  startWorkspaceTimerTicker();
}

function renderWorkspaceShell() {
  const project = workspaceState.activeProject;
  const stats = window.memberWorkflow.deriveMemberStats(workspaceState.experience, workspaceState.experience.projects);
  const participantCount = project?.participants?.length || project?.members?.length || 0;

  setText("workspaceNotificationCount", stats.notificationCount);
  setText("workspaceRoomState", project?.roomId ? "Ready" : "Pending");
  setText("workspaceHeroTitle", project?.projectName || "Open project workspace");
  setText("workspaceHeroText", project?.description || "Chat, files, calls, meetings and updates stay inside the same project stream.");
  setText("activeWorkspaceTitle", project?.projectName || "Select a project");
  setText("activeWorkspaceMeta", project ? `${project.teamName || "Assigned Team"} | ${participantCount} members | Deadline ${formatShortDate(project.deadline)}` : "Previous chat history and files will appear here.");

  document.getElementById("workspaceHeroChips").innerHTML = project
    ? [
        `<div class="member-chip"><strong>${project.completion}%</strong><span>Completion</span></div>`,
        `<div class="member-chip"><strong>${project.myTaskCount}</strong><span>My Tasks</span></div>`,
        `<div class="member-chip"><strong>${project.openSubtasks}</strong><span>Open Subtasks</span></div>`,
      ].join("")
    : "";

  renderWorkspaceRooms();
  renderWorkspaceTiles();
  renderWorkspaceTasks();
  populateWorkspaceUpdateSubtasks();
  syncWorkspaceTimerButtons();
}

function renderWorkspaceRooms() {
  const roomsMarkup = (workspaceState.experience.projects || [])
    .map((project) => {
      const isActive = String(project.projectId) === String(workspaceState.activeProject?.projectId);
      return `
        <button class="workspace-room ${isActive ? "active" : ""}" type="button" data-project-id="${project.projectId}">
          <strong>${escapeHtml(project.projectName)}</strong>
          <span>${escapeHtml(project.teamName || "Assigned Team")}</span>
          <span>${project.roomId ? "Workspace ready" : "Room pending"} | ${project.completion}% complete</span>
        </button>
      `;
    })
    .join("");

  document.getElementById("workspaceRoomList").innerHTML = roomsMarkup || '<div class="empty-inline">No project rooms are assigned yet.</div>';
  document.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const project = workspaceState.experience.projects.find((item) => String(item.projectId) === button.dataset.projectId);
      workspaceState.activeProject = project || null;
      workspaceState.activeRoom = workspaceState.experience.rooms.find((room) => String(room.roomId) === String(project?.roomId)) || null;
      renderWorkspaceShell();
      await loadWorkspaceMessages();
      updateWorkspaceQuery();
    });
  });
}

function renderWorkspaceTiles() {
  const project = workspaceState.activeProject;
  if (!project) {
    document.getElementById("workspaceTiles").innerHTML = '<div class="empty-inline">Select a project to see project metrics.</div>';
    return;
  }

  const participantCount = project.participants?.length || project.members?.length || 0;
  document.getElementById("workspaceTiles").innerHTML = [
    ["Priority", project.priority || "Medium", "Current project delivery priority"],
    ["Deadline", formatShortDate(project.deadline), "Nearest project due date"],
    ["Members", `${participantCount}`, "Team room participants"],
    ["Manager", project.manager || "Assigned", "Project owner"],
  ]
    .map(
      ([label, value, text]) => `
        <article class="workspace-tile">
          <strong>${label}</strong>
          <span>${value}</span>
          <p>${text}</p>
        </article>
      `,
    )
    .join("");
}

function renderWorkspaceTasks() {
  const project = workspaceState.activeProject;
  if (!project) {
    document.getElementById("workspaceTaskColumns").innerHTML = '<div class="empty-inline">No task data available.</div>';
    return;
  }

  const groups = [
    ["To Do", ["Assigned", "Pending"]],
    ["In Progress", ["Accepted", "Active"]],
    ["Review", ["In Review"]],
    ["Completed", ["Approved", "Completed"]],
  ];

  document.getElementById("workspaceTaskColumns").innerHTML = groups
    .map(([label, statuses]) => {
      const items = project.subtasks.filter((subtask) => statuses.includes(subtask.status || "Assigned"));
      return `
        <section class="task-column">
          <h3>${label}</h3>
          <p>${items.length} items</p>
          ${
            items.length
              ? items
                  .map((subtask) => {
                    const task = window.memberWorkflow.getTaskForSubtask(workspaceState.experience.tasks, subtask);
                    return `
                      <article class="list-card">
                        <div class="task-row-top">
                          <div class="task-copy">
                            <strong>${escapeHtml(subtask.title)}</strong>
                            <p>${escapeHtml(task?.title || "Main Task")}</p>
                          </div>
                          <span class="priority-pill ${priorityClass(subtask.priority || task?.priority || "Medium")}">${escapeHtml(subtask.priority || task?.priority || "Medium")}</span>
                        </div>
                        <div class="chip-row">
                          <span class="status-pill ${statusClass(subtask.status || "Assigned")}">${escapeHtml(subtask.status || "Assigned")}</span>
                          <span class="icon-chip">${formatShortDate(subtask.deadline || task?.deadline)}</span>
                        </div>
                        <div class="task-inline-actions">
                          <button class="btn ghost-btn" type="button" onclick="updateWorkspaceSubtask('${subtask._id}','Accepted',10)">Accept</button>
                          <button class="btn ghost-btn" type="button" onclick="updateWorkspaceSubtask('${subtask._id}','Active',35)">Start</button>
                          <button class="btn btn-primary" type="button" onclick="updateWorkspaceSubtask('${subtask._id}','In Review',100)">Review</button>
                        </div>
                      </article>
                    `;
                  })
                  .join("")
              : '<div class="empty-inline">No items</div>'
          }
        </section>
      `;
    })
    .join("");
}

function populateWorkspaceUpdateSubtasks() {
  const project = workspaceState.activeProject;
  const select = document.getElementById("workspaceUpdateSubtask");
  const subtasks = project?.subtasks || [];
  select.innerHTML = subtasks.length ? subtasks.map((subtask) => `<option value="${subtask._id}">${escapeHtml(subtask.title)}</option>`).join("") : '<option value="">No subtasks available</option>';
}

async function loadWorkspaceMessages() {
  const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
  if (!roomId) {
    workspaceState.messages = [];
    workspaceState.filteredMessages = [];
    renderWorkspaceMessages();
    return;
  }

  try {
    const response = await apiRequest(`/chat/rooms/${roomId}/messages`);
    workspaceState.messages = response.data?.messages || [];
    workspaceState.filteredMessages = applyWorkspaceMessageFilter(document.getElementById("workspaceMessageSearch").value);
    renderWorkspaceMessages();
  } catch (error) {
    workspaceState.messages = [];
    workspaceState.filteredMessages = [];
    pushWorkspaceEvent("Chat unavailable", error.message || "Unable to load project messages.");
    renderWorkspaceMessages();
  }
}

function renderWorkspaceMessages() {
  const currentUser = window.memberWorkflow.getMemberUser();
  const list = document.getElementById("workspaceMessageList");
  if (!workspaceState.filteredMessages.length) {
    list.innerHTML = '<div class="empty-inline">No messages in this room yet.</div>';
    return;
  }

  list.innerHTML = workspaceState.filteredMessages
    .map((message) => {
      const isMine = String(message.senderId) === String(currentUser._id);
      return `
        <article class="message-bubble ${isMine ? "me" : ""}">
          <strong>${escapeHtml(message.senderName || "Unknown user")}</strong>
          <span class="list-meta">${escapeHtml(message.senderRole || "MEMBER")} | ${window.memberWorkflow.formatDateTime(message.createdAt)}</span>
          ${renderWorkspaceMessageBody(message)}
        </article>
      `;
    })
    .join("");

  list.scrollTop = list.scrollHeight;
  renderWorkspaceEvents();
}

function renderWorkspaceMessageBody(message) {
  if (message.messageType === "SYSTEM" && message.callData?.type === "VOICE_CALL") {
    return renderWorkspaceCallCard(message.callData);
  }

  if (message.messageType === "LOCATION" && message.location) {
    const latitude = Number(message.location.latitude || 0).toFixed(5);
    const longitude = Number(message.location.longitude || 0).toFixed(5);
    return `
      <article class="workspace-call-card">
        <strong>Shared Location</strong>
        <p>${escapeHtml(message.location.label || `${latitude}, ${longitude}`)}</p>
        <p><a href="https://maps.google.com/?q=${latitude},${longitude}" target="_blank" rel="noreferrer">Open in Maps</a></p>
      </article>
    `;
  }

  if (message.messageType === "VOICE") {
    return `
      <article class="workspace-call-card">
        <strong>Voice Note</strong>
        <p>${escapeHtml(message.text || message.fileName || "Audio message")}</p>
        <p><audio controls src="${escapeAttribute(message.fileUrl || "#")}"></audio></p>
      </article>
    `;
  }

  if (message.messageType === "CODE") {
    return `<pre class="workspace-code-block"><code>${escapeHtml(message.text || "")}</code></pre>`;
  }

  if (message.messageType === "FILE") {
    return `<p><a href="${escapeAttribute(message.fileUrl || "#")}" target="_blank" rel="noreferrer">${escapeHtml(message.fileName || "Open file")}</a></p>`;
  }

  return `<p>${escapeHtml(message.text || "")}</p>`;
}

function renderWorkspaceCallCard(callData = {}) {
  return `
    <article class="workspace-call-card">
      <strong>Voice Call</strong>
      <p>${escapeHtml((callData.participantNames || []).join(", ") || "Project room participants")}</p>
      <small>Status: ${escapeHtml(callData.status || "ENDED")} | Duration: ${formatWorkspaceDuration(callData.duration || 0)}</small>
    </article>
  `;
}

function renderWorkspaceEvents() {
  const feed = document.getElementById("workspaceEventFeed");
  feed.innerHTML = workspaceState.events
    .slice(0, 4)
    .map(
      (item) => `
        <article class="activity-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `,
    )
    .join("");
}

async function handleWorkspaceMessageSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("workspaceMessageInput");
  const text = input.value.trim();
  const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
  if (!text || !roomId) return;

  try {
    await apiRequest(`/chat/rooms/${roomId}/messages`, {
      method: "POST",
      body: {
        text,
        messageType: text.includes("```") ? "CODE" : "TEXT",
        codeLanguage: text.includes("```") ? "text" : "",
      },
    });
    input.value = "";
  } catch (error) {
    pushWorkspaceEvent("Message failed", error.message || "Unable to send message.");
  }
}

async function handleWorkspaceFileUpload() {
  const fileInput = document.getElementById("workspaceFileInput");
  const file = fileInput.files?.[0];
  const caption = document.getElementById("workspaceFileCaption").value.trim();
  const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
  if (!file || !roomId) return;

  try {
    const fileUrl = await readWorkspaceFileAsDataUrl(file);
    const fileName = file.name.toLowerCase();
    const isArchive = fileName.endsWith(".zip") || fileName.endsWith(".rar") || fileName.endsWith(".7z");
    await apiRequest(`/chat/rooms/${roomId}/files`, {
      method: "POST",
      body: {
        name: file.name,
        url: fileUrl,
        mimeType: file.type,
        size: file.size,
        caption,
        messageType: file.type.startsWith("audio/") ? "VOICE" : "FILE",
        fileCategory: file.type.startsWith("image/") ? "image" : isArchive ? "archive" : "file",
      },
    });
    document.getElementById("workspaceFileCaption").value = "";
    fileInput.value = "";
  } catch (error) {
    pushWorkspaceEvent("File share failed", error.message || "Unable to share file.");
  }
}

async function handleWorkspaceUpdateSubmit(event) {
  event.preventDefault();
  const subtaskId = document.getElementById("workspaceUpdateSubtask").value;
  const subtask = (workspaceState.activeProject?.subtasks || []).find((item) => String(item._id) === String(subtaskId));
  const task = window.memberWorkflow.getTaskForSubtask(workspaceState.experience.tasks, subtask);
  if (!subtask) return;

  try {
    await window.memberWorkflow.createMemberDailyUpdate({
      subtaskId,
      taskId: task?._id,
      projectId: workspaceState.activeProject.projectId,
      projectName: workspaceState.activeProject.projectName,
      taskTitle: subtask.title,
      hoursWorked: Number(document.getElementById("workspaceUpdateHours").value || 0),
      completion: Number(document.getElementById("workspaceUpdateCompletion").value || 0),
      summary: document.getElementById("workspaceUpdateSummary").value.trim(),
      blockers: document.getElementById("workspaceUpdateBlockers").value.trim(),
    });

    showToast?.("Daily update submitted.", "success", { title: "Update Saved" });
    document.getElementById("workspaceUpdateForm").reset();
    pushWorkspaceEvent("Daily update", `${subtask.title} update shared with the delivery team.`);
  } catch (error) {
    showToast?.(error.message || "Unable to submit update.", "error", { title: "Update Failed" });
  }
}

function handleWorkspaceSearch(event) {
  workspaceState.filteredMessages = applyWorkspaceMessageFilter(event.target.value);
  renderWorkspaceMessages();
}

async function startWorkspaceCall() {
  const context = getWorkspaceCallContext();
  if (!context.roomId) {
    showToast?.("Call cannot start until this project room is ready.", "warning", { title: "Room Pending" });
    return;
  }

  workspaceState.voiceCall?.startCall(context);
}

async function startWorkspaceMeeting() {
  if (!workspaceState.activeRoom?.teamId) {
    showToast?.("Meeting cannot start until this project room is ready.", "warning", { title: "Room Pending" });
    return;
  }

  try {
    await apiRequest("/meetings/start", {
      method: "POST",
      body: {
        teamId: workspaceState.activeRoom.teamId,
        title: `${workspaceState.activeProject.projectName} Live Meeting`,
        meetingType: "VIDEO",
      },
    });
    pushWorkspaceEvent("Meeting started", `Meeting launched for ${workspaceState.activeProject.projectName}.`);
  } catch (error) {
    pushWorkspaceEvent("Meeting failed", error.message || "Unable to start meeting.");
  }
}

async function handleWorkspaceTool(tool) {
  const input = document.getElementById("workspaceFileInput");
  const messageInput = document.getElementById("workspaceMessageInput");

  if (tool === "attach") {
    input.accept = "*/*";
    input.click();
    return;
  }

  if (tool === "screenshot") {
    input.accept = "image/*";
    input.click();
    return;
  }

  if (tool === "zip") {
    input.accept = ".zip,.rar,.7z,application/zip";
    input.click();
    return;
  }

  if (tool === "voice") {
    input.accept = "audio/*";
    input.click();
    return;
  }

  if (tool === "code") {
    messageInput.value = `${messageInput.value ? `${messageInput.value}\n` : ""}\`\`\`\n// code snippet\n\`\`\``;
    messageInput.focus();
    return;
  }

  if (tool === "pin") {
    pushWorkspaceEvent("Pinned note", "Use this project room for latest handoff, blockers and meeting links.");
    return;
  }

  if (tool === "location") {
    const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
    if (!roomId) {
      pushWorkspaceEvent("Location blocked", "Project room is not ready yet.");
      return;
    }

    const location = await getWorkspaceLocation();
    if (!location.supported || !location.granted) {
      pushWorkspaceEvent("Location blocked", location.label);
      return;
    }

    try {
      await apiRequest(`/chat/rooms/${roomId}/messages`, {
        method: "POST",
        body: {
          messageType: "LOCATION",
          text: `Location shared: ${location.label}`,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            label: location.label,
          },
        },
      });
      pushWorkspaceEvent("Location shared", location.label);
    } catch (error) {
      pushWorkspaceEvent("Location failed", error.message || "Unable to share location.");
    }
  }
}

function emitWorkspaceTyping() {
  const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
  if (!roomId) return;
  emitSocket("chat:typing", { roomId });
}

function setupWorkspaceRealtime() {
  const socket = connectSocket();
  if (!socket) return;

  workspaceState.voiceCall = new ProjectVoiceCall({
    socket,
    getCurrentUser: () => window.memberWorkflow.getMemberUser(),
    getRoomContext: () => getWorkspaceCallContext(),
    onEvent: (message) => pushWorkspaceEvent("Voice call", message),
  });

  onSocket("connected", () => {
    workspaceState.socketReady = true;
  });

  onSocket("chat:message", (message) => {
    const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
    if (!roomId || message.roomId !== roomId) return;
    if (!workspaceState.messages.some((item) => String(item._id) === String(message._id))) {
      workspaceState.messages.push(message);
    }
    workspaceState.filteredMessages = applyWorkspaceMessageFilter(document.getElementById("workspaceMessageSearch").value);
    renderWorkspaceMessages();
    clearWorkspaceTyping();
  });

  onSocket("chat:file", (payload) => {
    const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
    if (!roomId || payload.message.roomId !== roomId) return;
    if (!workspaceState.messages.some((item) => String(item._id) === String(payload.message._id))) {
      workspaceState.messages.push(payload.message);
    }
    workspaceState.filteredMessages = applyWorkspaceMessageFilter(document.getElementById("workspaceMessageSearch").value);
    pushWorkspaceEvent("File shared", `${payload.message.senderName} shared ${payload.message.fileName}.`);
    renderWorkspaceMessages();
  });

  onSocket("chat:typing", (payload) => {
    const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
    if (!roomId || payload.roomId !== roomId) return;
    document.getElementById("workspaceTypingIndicator").textContent = `${payload.name} is typing...`;
    window.clearTimeout(window.__workspaceTypingTimer);
    window.__workspaceTypingTimer = window.setTimeout(clearWorkspaceTyping, 1200);
  });

  onSocket("meeting:started", (meeting) => {
    const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
    if (!roomId || meeting.roomId !== roomId) return;
    pushWorkspaceEvent("Meeting alert", `${meeting.startedByName} started ${meeting.title}.`);
  });

  onSocket("call:incoming", (call) => {
    const roomId = workspaceState.activeRoom?.roomId || workspaceState.activeProject?.roomId;
    if (!roomId || call.roomId !== roomId) return;
    pushWorkspaceEvent("Incoming call", `${call.callerName} started an audio call.`);
  });
}

async function handleTimerAction() {
  const currentTimer = window.memberWorkflow.getMemberTimerState();
  const firstSubtask = workspaceState.activeProject?.subtasks?.[0];
  const firstTask = window.memberWorkflow.getTaskForSubtask(workspaceState.experience.tasks, firstSubtask);

  if (!currentTimer) {
    window.memberWorkflow.startMemberTimer({
      subtaskId: firstSubtask?._id,
      taskId: firstTask?._id,
      taskTitle: firstSubtask?.title || workspaceState.activeProject?.projectName || "Focused Work",
      projectId: workspaceState.activeProject?.projectId,
      projectName: workspaceState.activeProject?.projectName,
    });
  } else if (currentTimer.status === "running") {
    window.memberWorkflow.pauseMemberTimer();
  } else {
    window.memberWorkflow.resumeMemberTimer();
  }

  syncWorkspaceTimerButtons();
}

async function handleTimerStop() {
  const record = await window.memberWorkflow.stopMemberTimer(`Tracked from ${workspaceState.activeProject?.projectName || "workspace"}.`);
  if (record) {
    showToast?.(`Timer saved for ${record.hours} hours.`, "success", { title: "Time Logged" });
  }
  syncWorkspaceTimerButtons();
}

function syncWorkspaceTimerButtons() {
  const timer = window.memberWorkflow.getMemberTimerState();
  const action = document.getElementById("workspaceTimerAction");
  action.textContent = !timer ? "Start Timer" : timer.status === "running" ? "Pause Timer" : "Resume Timer";
  setText("workspaceTimerState", timer ? window.memberWorkflow.formatDuration(window.memberWorkflow.getActiveTimerElapsed(timer)) : "00:00:00");
}

function startWorkspaceTimerTicker() {
  window.clearInterval(window.__workspaceTimerInterval);
  window.__workspaceTimerInterval = window.setInterval(() => {
    syncWorkspaceTimerButtons();
  }, 1000);
}

async function updateWorkspaceSubtask(id, status, progress) {
  try {
    await window.memberWorkflow.submitMemberSubtaskStatus(id, {
      status,
      progress,
      timeSpentHours: status === "In Review" ? 8 : undefined,
      submittedNote: status === "In Review" ? "Submitted from project workspace." : "",
    });
    workspaceState.experience = await window.memberWorkflow.loadMemberExperience();
    workspaceState.activeProject = window.memberWorkflow.getProjectWorkspaceSummary(workspaceState.activeProject?.projectId, workspaceState.activeProject?.roomId, workspaceState.experience);
    renderWorkspaceShell();
    showToast?.(`Task moved to ${status}.`, "success", { title: "Task Updated" });
  } catch (error) {
    showToast?.(error.message || "Unable to update task.", "error", { title: "Update Failed" });
  }
}

function updateWorkspaceQuery() {
  const params = new URLSearchParams();
  if (workspaceState.activeProject?.projectId) params.set("projectId", workspaceState.activeProject.projectId);
  if (workspaceState.activeProject?.roomId) params.set("roomId", workspaceState.activeProject.roomId);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function pushWorkspaceEvent(title, body) {
  workspaceState.events.unshift({ title, body });
  renderWorkspaceEvents();
}

function getWorkspaceCallContext() {
  const room = workspaceState.activeRoom || {};
  const project = workspaceState.activeProject || {};
  return {
    roomId: room.roomId || project.roomId || "",
    teamId: room.teamId || project.teamId || "",
    participants: project.participants || room.participants || [],
  };
}

function applyWorkspaceMessageFilter(term) {
  const query = String(term || "").trim().toLowerCase();
  if (!query) return workspaceState.messages.slice();

  return workspaceState.messages.filter((message) => {
    const participantNames = message.callData?.participantNames?.join(" ") || "";
    const fileName = message.fileName || "";
    const locationLabel = message.location?.label || "";
    return `${message.senderName || ""} ${message.text || ""} ${participantNames} ${fileName} ${locationLabel}`.toLowerCase().includes(query);
  });
}

function clearWorkspaceTyping() {
  document.getElementById("workspaceTypingIndicator").textContent = "";
}

function readWorkspaceFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function escapeAttribute(value = "") {
  return String(value).replace(/"/g, "&quot;");
}

async function getWorkspaceLocation() {
  if (!navigator.geolocation) {
    return { supported: false, granted: false, label: "Browser location unavailable" };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          supported: true,
          granted: true,
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
          label: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        }),
      () => resolve({ supported: true, granted: false, label: "Location permission denied" }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function formatWorkspaceDuration(seconds) {
  const totalSeconds = Math.max(0, Number(seconds || 0));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${remainingSeconds}`;
}

function getWorkspaceToolIcon(tool) {
  const icons = {
    attach: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.44 11.05-8.49 8.49a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95L10.1 18.15a2 2 0 1 1-2.83-2.83l8.48-8.49"></path></svg>',
    screenshot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4l2-3h4l2 3h4v11H4z"></path><circle cx="12" cy="13" r="3"></circle></svg>',
    zip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h10l2 2h4v14H4z"></path><path d="M12 8h.01"></path><path d="M12 12h.01"></path><path d="M12 16h.01"></path></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 16-4-4 4-4"></path><path d="m16 8 4 4-4 4"></path><path d="m14 4-4 16"></path></svg>',
    location: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
    voice: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><path d="M12 19v3"></path></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 3 6 6-4 1-3 7-2-2-7 3 3-7-2-2 7-3 2-4Z"></path></svg>',
  };
  return icons[tool] || icons.attach;
}

window.updateWorkspaceSubtask = updateWorkspaceSubtask;
