const MEMBER_TIMER_KEY = "memberActiveTimer";
const MEMBER_TIMER_HISTORY_KEY = "memberTimerHistory";
const MEMBER_TICKETS_KEY = "managerTickets";
const MEMBER_REWARDS_KEY = "managerRewards";

const memberWorkflow = {
    currentUser: null,
};

function getMemberUser() {
    if (memberWorkflow.currentUser) return memberWorkflow.currentUser;
    memberWorkflow.currentUser = getCurrentUser ? .() || {};
    return memberWorkflow.currentUser;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function readLocalJson(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        return fallback;
    }
}

function writeLocalJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function isCurrentMemberName(value) {
    const user = getMemberUser();
    return String(value || "").trim() === String(user.name || "").trim();
}

function isCurrentMemberId(value) {
    const user = getMemberUser();
    return String(value || "").trim() === String(user._id || "").trim();
}

function matchesCurrentMember(record = {}) {
    return (
        isCurrentMemberId(record.assigneeId || record.userId || record.memberId) ||
        isCurrentMemberName(record.assignee || record.employee || record.userName || record.author || record.memberName || record.raisedBy)
    );
}

function getTaskForSubtask(tasks, subtask) {
    return safeArray(tasks).find((task) => String(task._id) === String(subtask ? .taskId));
}

function normalizeMemberTaskStatus(status = "") {
    const normalized = String(status || "").trim().toLowerCase();
    if (["in progress", "active"].includes(normalized)) return "In Progress";
    if (["submitted for review", "in review"].includes(normalized)) return "In Review";
    if (["on hold", "paused"].includes(normalized)) return "Hold";
    if (["approved", "completed"].includes(normalized)) return "Completed";
    if (normalized === "rejected") return "Rejected";
    return normalized === "accepted" ? "In Progress" : "Pending";
}

function getSubtasksForTask(subtasks, taskId) {
    return safeArray(subtasks).filter((subtask) => String(subtask.taskId) === String(taskId));
}

function buildWorkItemsFromTasks(tasks = [], subtasks = []) {
    const items = safeArray(subtasks).slice();
    const subtaskTaskIds = new Set(items.map((subtask) => String(subtask.taskId || "")).filter(Boolean));

    safeArray(tasks).forEach((task) => {
        if (subtaskTaskIds.has(String(task._id || ""))) return;
        items.push({
            _id: task._id,
            taskId: task._id,
            projectId: task.projectId,
            title: task.title,
            description: task.description || "",
            instructions: task.description || "Assigned task is ready for execution.",
            assigneeId: task.assigneeId,
            assignee: task.assignee,
            assigneeEmail: task.assigneeEmail,
            priority: task.priority || "Medium",
            status: task.status || "Assigned",
            deadline: task.deadline,
            progress: task.progress || 0,
            estimatedHours: task.estimatedHours || 0,
            isParentTask: true,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        });
    });

    return items;
}

function formatDateTime(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDuration(milliseconds = 0) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function getEnterpriseProjects() {
    return safeArray(window.enterpriseStore ? .getProjects ? .());
}

function getEnterpriseTeams() {
    return safeArray(window.enterpriseStore ? .getTeams ? .());
}

function getEnterpriseCommunications() {
    return safeArray(window.enterpriseStore ? .getCommunications ? .());
}

async function loadMemberData() {
    const fallbackStore = window.enterpriseStore || {};
    const fallbackTasks = safeArray(fallbackStore.getTasks ? .()).filter(matchesCurrentMember);
    const fallbackSubtasks = safeArray(fallbackStore.getSubtasks ? .()).filter(matchesCurrentMember);

    try {
        const [tasksResponse, subtasksResponse, updatesResponse, attendanceResponse, leaveResponse, timesheetResponse, expenseResponse, fileResponse, notificationResponse] =
        await Promise.all([
            apiRequest("/tasks").catch(() => ({ data: fallbackTasks })),
            apiRequest("/subtasks").catch(() => ({ data: fallbackSubtasks })),
            apiRequest("/daily-updates").catch(() => ({ data: fallbackStore.getTaskUpdates ? .() || [] })),
            apiRequest("/attendance").catch(() => ({ data: fallbackStore.getAttendance ? .() || [] })),
            apiRequest("/leave").catch(() => ({ data: fallbackStore.getLeaveRequests ? .() || [] })),
            apiRequest("/timesheets").catch(() => ({ data: fallbackStore.getTimesheets ? .() || [] })),
            apiRequest("/expenses").catch(() => ({ data: fallbackStore.getExpenses ? .() || [] })),
            apiRequest("/uploads").catch(() => ({ data: [] })),
            apiRequest("/notifications").catch(() => ({ data: [] })),
        ]);

        const tasks = safeArray(tasksResponse.data).filter(matchesCurrentMember);
        const subtasks = buildWorkItemsFromTasks(tasks, safeArray(subtasksResponse.data).filter(matchesCurrentMember));
        return {
            tasks,
            subtasks,
            dailyUpdates: safeArray(updatesResponse.data),
            attendance: safeArray(attendanceResponse.data).filter(matchesCurrentMember),
            leave: safeArray(leaveResponse.data).filter(matchesCurrentMember),
            timesheets: safeArray(timesheetResponse.data).filter(matchesCurrentMember),
            expenses: safeArray(expenseResponse.data).filter(matchesCurrentMember),
            files: safeArray(fileResponse.data),
            notifications: safeArray(notificationResponse.data),
        };
    } catch (error) {
        return {
            tasks: fallbackTasks,
            subtasks: buildWorkItemsFromTasks(fallbackTasks, fallbackSubtasks),
            dailyUpdates: safeArray(fallbackStore.getTaskUpdates ? .()),
            attendance: safeArray(fallbackStore.getAttendance ? .()).filter(matchesCurrentMember),
            leave: safeArray(fallbackStore.getLeaveRequests ? .()).filter(matchesCurrentMember),
            timesheets: safeArray(fallbackStore.getTimesheets ? .()).filter(matchesCurrentMember),
            expenses: safeArray(fallbackStore.getExpenses ? .()).filter(matchesCurrentMember),
            files: [],
            notifications: [],
        };
    }
}

async function loadAssignedProjects() {
    const fallbackProjects = getEnterpriseProjects().filter((project) => {
        const memberIds = safeArray(project.teamMemberIds).map(String);
        const memberNames = safeArray(project.teamMembers);
        return memberIds.includes(String(getMemberUser()._id || "")) || memberNames.includes(getMemberUser().name || "");
    });

    try {
        const response = await apiRequest("/projects/employee");
        return safeArray(response.data);
    } catch (error) {
        return fallbackProjects;
    }
}

async function loadMemberProjectDetail(projectId) {
    if (!projectId) {
        throw new Error("Project id is required");
    }

    const response = await apiRequest(`/projects/${projectId}`);
    return response.data || null;
}

async function getMicrosoftTeamsUrl(projectId) {
    const response = await apiRequest(`/microsoft/teams/open?projectId=${encodeURIComponent(projectId || "")}`);
    return response ? .data ? .teamsWebUrl || "https://teams.microsoft.com";
}

async function loadMemberRooms() {
    try {
        const response = await apiRequest("/chat/rooms/my");
        return safeArray(response.data);
    } catch (error) {
        return [];
    }
}

function getMemberTickets() {
    return safeArray(readLocalJson(MEMBER_TICKETS_KEY, [])).filter((item) => matchesCurrentMember(item));
}

function getMemberRewards() {
    return safeArray(readLocalJson(MEMBER_REWARDS_KEY, [])).filter((item) => matchesCurrentMember(item));
}

function saveMemberTicket(payload) {
    const current = safeArray(readLocalJson(MEMBER_TICKETS_KEY, []));
    const record = {
        _id: payload._id || `ticket-${Date.now()}`,
        createdAt: payload.createdAt || new Date().toISOString(),
        status: payload.status || "Open",
        raisedBy: getMemberUser().name,
        ...payload,
    };
    current.unshift(record);
    writeLocalJson(MEMBER_TICKETS_KEY, current);
    return record;
}

function getMemberTimerState() {
    const timer = readLocalJson(MEMBER_TIMER_KEY, null);
    return timer && typeof timer === "object" ? timer : null;
}

function getTimerHistory() {
    return safeArray(readLocalJson(MEMBER_TIMER_HISTORY_KEY, []));
}

function getActiveTimerElapsed(timer = getMemberTimerState()) {
    if (!timer) return 0;
    if (timer.status === "running" && timer.startedAt) {
        return Number(timer.accumulatedMs || 0) + Math.max(0, Date.now() - new Date(timer.startedAt).getTime());
    }
    return Number(timer.accumulatedMs || 0);
}

function persistTimer(timer) {
    writeLocalJson(MEMBER_TIMER_KEY, timer);
    return timer;
}

function startMemberTimer(context = {}) {
    const timer = {
        subtaskId: context.subtaskId || "",
        taskId: context.taskId || "",
        taskTitle: context.taskTitle || "Focused Work",
        projectId: context.projectId || "",
        projectName: context.projectName || "Workspace",
        startedAt: new Date().toISOString(),
        accumulatedMs: 0,
        status: "running",
    };
    return persistTimer(timer);
}

function pauseMemberTimer() {
    const timer = getMemberTimerState();
    if (!timer || timer.status !== "running") return timer;
    const elapsed = getActiveTimerElapsed(timer);
    return persistTimer({
        ...timer,
        accumulatedMs: elapsed,
        startedAt: "",
        status: "paused",
    });
}

function resumeMemberTimer() {
    const timer = getMemberTimerState();
    if (!timer || timer.status !== "paused") return timer;
    return persistTimer({
        ...timer,
        startedAt: new Date().toISOString(),
        status: "running",
    });
}

async function stopMemberTimer(note = "") {
    const timer = getMemberTimerState();
    if (!timer) return null;

    const elapsedMs = getActiveTimerElapsed(timer);
    const hours = Math.round((elapsedMs / 36e5) * 100) / 100;
    const record = {
        ...timer,
        note,
        endedAt: new Date().toISOString(),
        elapsedMs,
        hours,
    };

    const history = getTimerHistory();
    history.unshift(record);
    writeLocalJson(MEMBER_TIMER_HISTORY_KEY, history);
    localStorage.removeItem(MEMBER_TIMER_KEY);

    try {
        await apiRequest("/timesheets", {
            method: "POST",
            body: {
                projectId: record.projectId,
                projectName: record.projectName,
                taskId: record.taskId,
                taskTitle: record.taskTitle,
                hours,
                description: note || "Saved from member timer",
            },
        });
    } catch (error) {
        // Keep local record even if timesheet sync is unavailable.
    }

    return record;
}

function deriveAssignedProjects(data, rooms = [], assignedProjects = []) {
    const projectsById = new Map();
    const enterpriseProjects = assignedProjects.length ? assignedProjects : getEnterpriseProjects();
    const teams = getEnterpriseTeams();
    const currentUser = getMemberUser();

    safeArray(assignedProjects).forEach((project) => {
        const projectId = project._id || project.projectId || project.projectName;
        const linkedRoom = safeArray(rooms).find((room) => String(room.projectId || "") === String(project._id || "") || String(room.projectName || "").trim() === String(project.projectName || "").trim());
        const team = teams.find((item) => String(item.projectId || "") === String(project._id || ""));

        if (!projectsById.has(projectId)) {
            projectsById.set(projectId, {
                projectId,
                projectName: project.projectName || "Untitled Project",
                description: project.description || "Execution workspace for assigned team work.",
                deadline: project.deadline || project.dueDate || "",
                priority: project.priority || "Medium",
                status: project.status || "Assigned",
                progressPoints: [Number(project.progress || 0)],
                roomId: linkedRoom ? .roomId || project.roomId || "",
                teamId: linkedRoom ? .teamId || team ? ._id || project.teamId || "",
                teamName: linkedRoom ? .teamName || team ? .name || project.teamName || "Assigned Team",
                manager: project.manager || "",
                lead: project.teamLead || "",
                members: linkedRoom ? .members || team ? .members || safeArray(project.teamMembers),
                participants: linkedRoom ? .participants || [],
                tasks: [],
                subtasks: [],
                teamsWebUrl: project.teamsWebUrl || "",
                oneDriveShareUrl: project.oneDriveShareUrl || "",
                filesReady: Number(project.filesReady || project.documentsCount || 0),
            });
        }
    });

    safeArray(data.tasks).forEach((task) => {
        const project = enterpriseProjects.find((item) => String(item._id) === String(task.projectId)) || {};
        const linkedRoom = safeArray(rooms).find((room) => String(room.projectName || "").trim() === String(task.projectName || "").trim());
        const team = teams.find((item) => String(item.projectName || "").trim() === String(task.projectName || "").trim());
        const projectId = task.projectId || project._id || linkedRoom ? .projectId || task.projectName;
        const subtasks = getSubtasksForTask(data.subtasks, task._id);

        if (!projectsById.has(projectId)) {
            projectsById.set(projectId, {
                projectId,
                projectName: task.projectName || project.projectName || linkedRoom ? .projectName || "Untitled Project",
                description: project.description || "Execution workspace for assigned team work.",
                deadline: task.deadline || project.deadline || "",
                priority: task.priority || project.priority || "Medium",
                status: project.status || task.status || "Active",
                progressPoints: [],
                roomId: linkedRoom ? .roomId || "",
                teamId: linkedRoom ? .teamId || team ? ._id || "",
                teamName: linkedRoom ? .teamName || team ? .name || "Assigned Team",
                manager: project.manager || task.manager || "",
                lead: project.teamLead || task.lead || "",
                members: linkedRoom ? .members || team ? .members || [currentUser.name].filter(Boolean),
                participants: linkedRoom ? .participants || [],
                tasks: [],
                subtasks: [],
                teamsWebUrl: project.teamsWebUrl || "",
                oneDriveShareUrl: project.oneDriveShareUrl || "",
                filesReady: Number(project.filesReady || project.documentsCount || 0),
            });
        }

        const bucket = projectsById.get(projectId);
        bucket.tasks.push(task);
        bucket.subtasks.push(...subtasks);
        bucket.progressPoints.push(Number(task.progress || 0));
        if (!bucket.deadline || (task.deadline && new Date(task.deadline) < new Date(bucket.deadline))) {
            bucket.deadline = task.deadline;
        }
        if (bucket.priority !== "Critical" && task.priority === "Critical") {
            bucket.priority = "Critical";
        }
        if (!bucket.roomId && linkedRoom ? .roomId) bucket.roomId = linkedRoom.roomId;
    });

    safeArray(rooms).forEach((room) => {
        const existing = Array.from(projectsById.values()).find((item) => item.roomId === room.roomId || item.projectName === room.projectName);
        if (existing) {
            existing.roomId = existing.roomId || room.roomId;
            existing.teamId = existing.teamId || room.teamId;
            existing.teamName = existing.teamName || room.teamName;
            existing.members = room.members || existing.members;
            existing.participants = room.participants || existing.participants;
            return;
        }

        projectsById.set(room.roomId || room.projectName, {
            projectId: room.projectId || room.roomId || room.projectName,
            projectName: room.projectName || room.teamName || "Workspace",
            description: "Collaboration workspace assigned by your manager.",
            deadline: "",
            priority: "Medium",
            status: "Active",
            progressPoints: [],
            roomId: room.roomId || "",
            teamId: room.teamId || "",
            teamName: room.teamName || "Assigned Team",
            manager: "",
            lead: "",
            members: room.members || [currentUser.name].filter(Boolean),
            participants: room.participants || [],
            tasks: [],
            subtasks: [],
            teamsWebUrl: "",
            oneDriveShareUrl: "",
            filesReady: 0,
        });
    });

    return Array.from(projectsById.values())
        .map((project) => {
            const completedSubtasks = project.subtasks.filter((item) => ["Approved", "Completed"].includes(item.status)).length;
            const totalSubtasks = Math.max(project.subtasks.length, project.tasks.length, 1);
            const completion = project.progressPoints.length ?
                Math.round(project.progressPoints.reduce((sum, value) => sum + value, 0) / project.progressPoints.length) :
                Math.round((completedSubtasks / totalSubtasks) * 100);

            return {
                ...project,
                completion,
                myTaskCount: project.tasks.length,
                mySubtaskCount: project.subtasks.length,
                completedSubtasks,
                openSubtasks: project.subtasks.filter((item) => !["Approved", "Completed"].includes(item.status)).length,
                latestDeadline: project.deadline || project.tasks.map((item) => item.deadline).filter(Boolean).sort()[0] || "",
            };
        })
        .sort((left, right) => new Date(left.deadline || "2999-12-31") - new Date(right.deadline || "2999-12-31"));
}

function deriveMemberStats(data, projects = []) {
    const subtasks = safeArray(data.subtasks);
    const timer = getMemberTimerState();
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayAttendance = safeArray(data.attendance).find((item) => String(item.date || "").slice(0, 10) === todayKey);
    const todayUpdates = safeArray(data.dailyUpdates).filter((item) => String(item.createdAt || item.date || "").slice(0, 10) === todayKey && matchesCurrentMember(item));

    return {
        total: subtasks.length,
        pending: subtasks.filter((item) => ["Assigned", "Pending"].includes(item.status)).length,
        inProgress: subtasks.filter((item) => ["Accepted", "Active"].includes(item.status)).length,
        completed: subtasks.filter((item) => ["Approved", "Completed"].includes(item.status)).length,
        review: subtasks.filter((item) => item.status === "In Review").length,
        notificationCount: safeArray(data.notifications).filter((item) => !item.read).length,
        projects: safeArray(projects).length,
        timerRunning: Boolean(timer),
        timerLabel: timer ? formatDuration(getActiveTimerElapsed(timer)) : "00:00:00",
        attendanceState: todayAttendance ? .checkOutAt ? "Checked Out" : todayAttendance ? .checkInAt ? "Checked In" : "Pending",
        dailyUpdates: todayUpdates.length,
        rewards: getMemberRewards().length,
        tickets: getMemberTickets().length,
    };
}

async function loadMemberExperience() {
    const [data, rooms, assignedProjects] = await Promise.all([loadMemberData(), loadMemberRooms(), loadAssignedProjects()]);
    const projects = deriveAssignedProjects(data, rooms, assignedProjects);
    return {
        ...data,
        rooms,
        assignedProjects,
        projects,
        communications: getEnterpriseCommunications(),
        rewards: getMemberRewards(),
        tickets: getMemberTickets(),
        timer: getMemberTimerState(),
        timerHistory: getTimerHistory(),
    };
}

function getProjectWorkspaceSummary(projectId, roomId, experience) {
    const projects = safeArray(experience ? .projects);
    return (
        projects.find((project) => String(project.projectId) === String(projectId)) ||
        projects.find((project) => String(project.roomId) === String(roomId)) ||
        projects[0] ||
        null
    );
}

function buildWorkspaceUrl(project) {
    const params = new URLSearchParams();
    if (project ? .projectId) params.set("projectId", project.projectId);
    if (project ? .roomId) params.set("roomId", project.roomId);
    return `/employee/chat${params.toString() ? `?${params.toString()}` : ""}`;
}

function buildProjectDetailsUrl(project) {
  const projectId = project?._id || project?.projectId;
  return projectId ? `/employee/project-detail?id=${encodeURIComponent(projectId)}` : buildWorkspaceUrl(project);
}

function buildMemberTeamsUrl(project) {
  const projectId = project?._id || project?.projectId || "";
  return `/employee/chat${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`;
}

function buildMemberTasksUrl(filter = "") {
  return `/employee/tasks${filter ? `?filter=${encodeURIComponent(filter)}` : ""}`;
}

function buildProjectsUrl(status = "") {
  return `/employee/projects${status ? `?status=${encodeURIComponent(status)}` : ""}`;
}

async function submitMemberSubtaskStatus(subtaskId, payload) {
  try {
    return await apiRequest(`/subtasks/${subtaskId}`, {
      method: "PUT",
      body: payload,
    });
  } catch (error) {
    return apiRequest(`/tasks/${subtaskId}`, {
      method: "PATCH",
      body: payload,
    });
  }
}

async function createMemberDailyUpdate(payload) {
  return apiRequest("/daily-updates", {
    method: "POST",
    body: payload,
  });
}

async function uploadMemberFile(payload) {
  const formData = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    formData.append(key, value);
  });

  return apiRequest("/microsoft/onedrive/upload", "POST", formData, true);
}

window.memberWorkflow = {
  getMemberUser,
  loadMemberData,
  loadMemberExperience,
  loadMemberProjectDetail,
  loadMemberRooms,
  getTaskForSubtask,
  getSubtasksForTask,
  normalizeMemberTaskStatus,
  formatDateTime,
  formatDuration,
  deriveAssignedProjects,
  deriveMemberStats,
  getProjectWorkspaceSummary,
  buildWorkspaceUrl,
  buildProjectDetailsUrl,
  buildMemberTeamsUrl,
  buildMemberTasksUrl,
  buildProjectsUrl,
  loadAssignedProjects,
  getMicrosoftTeamsUrl,
  submitMemberSubtaskStatus,
  createMemberDailyUpdate,
  uploadMemberFile,
  getMemberTimerState,
  getActiveTimerElapsed,
  startMemberTimer,
  pauseMemberTimer,
  resumeMemberTimer,
  stopMemberTimer,
  getTimerHistory,
  getMemberTickets,
  getMemberRewards,
  saveMemberTicket,
};