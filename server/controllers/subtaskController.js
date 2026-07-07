const Subtask = require("../models/Subtask");
const Task = require("../models/Task");
const TaskUpdate = require("../models/TaskUpdate");
const Team = require("../models/Team");
const { dispatchWorkflow, findUsersByRefs } = require("../services/workflowService");
const { ensureTeamRoom, buildTeamRoomPayload } = require("../utils/teamAccess");

async function resolveSubtaskUsers(payload = {}) {
  const [assignee] = await findUsersByRefs([
    { userId: payload.assigneeId },
    { email: payload.assigneeEmail || payload.assignee },
    { name: payload.assignee },
  ]);

  const [reviewer] = await findUsersByRefs([
    { userId: payload.reviewerId || payload.leadId },
    { email: payload.reviewerEmail || payload.leadEmail || payload.reviewer },
    { name: payload.reviewer || payload.lead },
  ]);

  return {
    ...payload,
    assigneeId: assignee?._id || payload.assigneeId || null,
    assignee: assignee?.name || payload.assignee || "",
    assigneeEmail: assignee?.email || payload.assigneeEmail || "",
    reviewerId: reviewer?._id || payload.reviewerId || payload.leadId || null,
    reviewer: reviewer?.name || payload.reviewer || payload.lead || "",
    reviewerEmail: reviewer?.email || payload.reviewerEmail || payload.leadEmail || "",
  };
}

async function loadTaskOrFail(taskId) {
  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Parent task not found");
    error.statusCode = 404;
    throw error;
  }

  return task;
}

async function ensureSubtaskExecutionRoom(req, task, subtask) {
  const roomId = `task_${task._id}_subtask_${subtask._id}`;
  let team = subtask.teamId ? await Team.findById(subtask.teamId) : null;

  const memberIds = [subtask.assigneeId].filter(Boolean);
  const members = [subtask.assignee].filter(Boolean);

  if (!team) {
    team = await Team.create({
      name: `${task.title} - ${subtask.title}`,
      projectId: task.projectId || subtask.projectId || null,
      projectName: task.projectName || "",
      roomId,
      managerId: task.managerId || null,
      manager: task.manager || "",
      teamLeadId: task.leadId || subtask.reviewerId || null,
      teamLead: task.lead || subtask.reviewer || "",
      department: task.department || "",
      memberIds,
      members,
      status: "Active",
      notes: `Execution room for ${subtask.title}`,
    });
  } else {
    team.name = `${task.title} - ${subtask.title}`;
    team.projectId = task.projectId || subtask.projectId || null;
    team.projectName = task.projectName || "";
    team.roomId = roomId;
    team.managerId = task.managerId || null;
    team.manager = task.manager || "";
    team.teamLeadId = task.leadId || subtask.reviewerId || null;
    team.teamLead = task.lead || subtask.reviewer || "";
    team.department = task.department || "";
    team.memberIds = memberIds;
    team.members = members;
    team.status = "Active";
    await team.save();
  }

  const room = await ensureTeamRoom(team, req.user);
  subtask.teamId = team._id;
  subtask.roomId = room.roomId;
  await subtask.save();
  return { team, room };
}

function emitRoomAvailability(req, team, room) {
  const io = req.app?.get("io");
  if (!io || !team || !room) return;

  const payload = buildTeamRoomPayload(team, room, req.user);
  const participantIds = [
    team.managerId,
    team.teamLeadId,
    ...(team.memberIds || []),
  ].filter(Boolean);

  participantIds.forEach((participantId) => {
    io.to(`user_${participantId}`).emit("chat:room:created", payload);
  });
}

async function syncParentTaskStatus(taskId) {
  const task = await Task.findById(taskId);
  if (!task) return null;

  const subtasks = await Subtask.find({ taskId }).lean();
  if (!subtasks.length) return task;

  const total = subtasks.length;
  const approved = subtasks.filter((item) => item.status === "Approved" || item.status === "Completed").length;
  const rejected = subtasks.filter((item) => item.status === "Rejected").length;
  const inReview = subtasks.filter((item) => item.status === "In Review").length;
  const active = subtasks.filter((item) => ["Assigned", "Accepted", "Active"].includes(item.status)).length;
  const pending = subtasks.filter((item) => item.status === "Pending").length;

  task.progress = Math.round((approved / total) * 100);

  if (approved === total) {
    task.status = "Approved";
  } else if (rejected > 0) {
    task.status = "Rejected";
  } else if (inReview > 0) {
    task.status = "Submitted for Review";
  } else if (active > 0) {
    task.status = "In Progress";
  } else if (pending === total) {
    task.status = "Assigned";
  }

  await task.save();
  return task;
}

function buildSubtaskActionUrl(subtask) {
  if (subtask.roomId) {
    return `/modules/collaboration/chat/chat.html?roomId=${encodeURIComponent(subtask.roomId)}`;
  }

  return `/modules/teamlead/team-tasks/team-tasks.html?subtaskId=${subtask._id}`;
}

async function createTaskUpdateEntry(subtask, actor, updateType, status, summary, feedback = "") {
  return TaskUpdate.create({
    taskId: subtask.taskId,
    subtaskId: subtask._id,
    projectId: subtask.projectId || null,
    author: actor?.name || "System",
    role: actor?.role || "SYSTEM",
    updateType,
    status,
    progress: Number(subtask.progress || 0),
    summary,
    feedback,
    attachments: subtask.submittedAssets || [],
  });
}

async function sendSubtaskWorkflow(req, task, subtask, title, message, options = {}) {
  await dispatchWorkflow({
    req,
    module: "subtasks",
    event: options.event || "SUBTASK_UPDATED",
    title,
    message,
    priority: subtask.priority === "Critical" ? "high" : "medium",
    actionUrl: buildSubtaskActionUrl(subtask),
    entityType: "subtask",
    entityId: subtask._id,
    userRefs: [
      { userId: subtask.assigneeId },
      { email: subtask.assigneeEmail },
      { name: subtask.assignee },
      { userId: subtask.reviewerId },
      { email: subtask.reviewerEmail },
      { name: subtask.reviewer },
      { userId: task.leadId },
      { email: task.leadEmail },
      { name: task.lead },
      { userId: task.managerId },
      { email: task.managerEmail },
      { name: task.manager },
    ],
    email: {
      subject: `${title}: ${subtask.title}`,
      template: options.template || "taskAssigned",
      variables: {
        title,
        taskTitle: subtask.title,
        parentTask: task.title,
        projectName: task.projectName || "General Workspace",
        priority: subtask.priority,
        deadline: subtask.deadline ? new Date(subtask.deadline).toLocaleString() : "Not set",
        instructions: subtask.instructions || subtask.description || "Open the task for full guidance.",
        reviewNote: options.feedback || "",
        actionLabel: options.actionLabel || "Open Task Chat",
      },
    },
    metadata: {
      projectName: task.projectName,
      taskTitle: task.title,
      subtaskTitle: subtask.title,
      roomId: subtask.roomId,
      subtaskStatus: subtask.status,
    },
  });
}

async function list(req, res) {
  const filters = {};
  const role = String(req.user?.role || "").toUpperCase();

  if (role === "MEMBER") {
    filters.$or = [{ assigneeId: req.user._id }, { assignee: req.user.name }];
  }

  if (role === "TEAM_LEAD") {
    filters.$or = [{ reviewerId: req.user._id }, { reviewer: req.user.name }];
  }

  const documents = await Subtask.find(filters).sort({ createdAt: -1 });
  res.json({ success: true, data: documents });
}

async function getById(req, res) {
  const document = await Subtask.findById(req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: "subtasks record not found" });
  }

  res.json({ success: true, data: document });
}

async function listPendingReviews(req, res) {
  const documents = await Subtask.find({
    $and: [
      { status: "In Review" },
      { $or: [{ reviewerId: req.user._id }, { reviewer: req.user.name }] },
    ],
  }).sort({ updatedAt: -1 });

  res.json({ success: true, data: documents });
}

async function create(req, res) {
  const payload = await resolveSubtaskUsers(req.body);
  const task = await loadTaskOrFail(payload.taskId);

  const subtask = await Subtask.create({
    ...payload,
    projectId: payload.projectId || task.projectId || null,
    reviewerId: payload.reviewerId || task.leadId || null,
    reviewer: payload.reviewer || task.lead || "",
    reviewerEmail: payload.reviewerEmail || task.leadEmail || "",
    status: payload.status || "Assigned",
    progress: Number(payload.progress || 0),
  });

  const { team, room } = await ensureSubtaskExecutionRoom(req, task, subtask);
  emitRoomAvailability(req, team, room);
  await createTaskUpdateEntry(subtask, req.user, "Comment", "Reported", `Subtask ${subtask.title} assigned to ${subtask.assignee || "member"}.`);
  await syncParentTaskStatus(task._id);
  await sendSubtaskWorkflow(
    req,
    task,
    subtask,
    "Subtask assigned",
    `${subtask.title} has been assigned${subtask.assignee ? ` to ${subtask.assignee}` : ""}. Chat room is ready for execution.`,
    { event: "SUBTASK_ASSIGNED" },
  );

  res.status(201).json({ success: true, message: "subtasks created", data: subtask });
}

async function update(req, res) {
  const subtask = await Subtask.findById(req.params.id);
  if (!subtask) {
    return res.status(404).json({ success: false, message: "subtasks record not found" });
  }

  const previousStatus = subtask.status;
  const previousAssignee = String(subtask.assigneeId || "");
  const payload = await resolveSubtaskUsers(req.body);
  Object.assign(subtask, payload);
  await subtask.save();

  const task = await loadTaskOrFail(subtask.taskId);
  const { team, room } = await ensureSubtaskExecutionRoom(req, task, subtask);
  emitRoomAvailability(req, team, room);

  if (String(subtask.assigneeId || "") !== previousAssignee) {
    await createTaskUpdateEntry(subtask, req.user, "Comment", "Reported", `Subtask ${subtask.title} reassigned to ${subtask.assignee || "member"}.`);
    await sendSubtaskWorkflow(
      req,
      task,
      subtask,
      "Subtask reassigned",
      `${subtask.title} has been reassigned${subtask.assignee ? ` to ${subtask.assignee}` : ""}.`,
      { event: "SUBTASK_REASSIGNED" },
    );
  }

  if (subtask.status !== previousStatus) {
    if (subtask.status === "Accepted" && !subtask.acceptedAt) {
      subtask.acceptedAt = new Date();
      await subtask.save();
    }

    if (subtask.status === "Active" && !subtask.startedAt) {
      subtask.startedAt = new Date();
      await subtask.save();
    }

    if (subtask.status === "In Review") {
      subtask.submittedAt = new Date();
      await subtask.save();
    }

    const config = {
      Accepted: {
        title: "Task accepted",
        message: `${subtask.assignee || "Member"} accepted ${subtask.title}.`,
        updateType: "Progress",
        updateStatus: "Reported",
      },
      "In Review": {
        title: "Submission received",
        message: `${subtask.title} was submitted for review.`,
        updateType: "Submission",
        updateStatus: "Submitted",
      },
      Approved: {
        title: "Subtask approved",
        message: `${subtask.title} has been approved and project progress updated.`,
        updateType: "Review",
        updateStatus: "Approved",
        template: "taskCompleted",
      },
      Rejected: {
        title: "Changes requested",
        message: `${subtask.title} needs rework before approval.`,
        updateType: "Review",
        updateStatus: "Rejected",
      },
      Active: {
        title: "Subtask started",
        message: `${subtask.title} is now in progress.`,
        updateType: "Progress",
        updateStatus: "Reported",
      },
    }[subtask.status] || {
      title: "Subtask updated",
      message: `${subtask.title} is now ${subtask.status}.`,
      updateType: "Comment",
      updateStatus: "Reported",
    };

    await createTaskUpdateEntry(
      subtask,
      req.user,
      config.updateType,
      config.updateStatus,
      config.message,
      subtask.submittedNote || req.body.feedback || "",
    );
    await sendSubtaskWorkflow(req, task, subtask, config.title, config.message, {
      event: "SUBTASK_STATUS_CHANGED",
      template: config.template,
      feedback: subtask.submittedNote || req.body.feedback || "",
      actionLabel: subtask.status === "Rejected" ? "Open Fixes" : "Open Task",
    });
  }

  await syncParentTaskStatus(task._id);
  res.json({ success: true, message: "subtasks updated", data: subtask });
}

async function remove(req, res) {
  const document = await Subtask.findByIdAndDelete(req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: "subtasks record not found" });
  }

  await syncParentTaskStatus(document.taskId);
  res.json({ success: true, message: "subtasks deleted", id: req.params.id });
}

async function approve(req, res) {
  req.body.status = "Approved";
  req.body.progress = 100;
  return update(req, res);
}

async function reject(req, res) {
  req.body.status = "Rejected";
  req.body.progress = Number(req.body.progress || 65);
  return update(req, res);
}

module.exports = {
  list,
  getById,
  listPendingReviews,
  create,
  update,
  remove,
  approve,
  reject,
};
