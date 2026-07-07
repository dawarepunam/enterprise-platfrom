// server/controllers/taskController.js
const Task = require("../models/Task");
const User = require("../models/User");
const TaskComment = require("../models/TaskComment");
const TaskTimeline = require("../models/TaskTimeline");
const { dispatchWorkflow } = require("../services/workflowService");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIo(req) {
  return req?.app?.get?.("io") || null;
}

function emitToTask(req, event, payload) {
  const io = getIo(req);
  if (io) io.to(`task_${payload._id || payload.taskId}`).emit(event, payload);
}

function emitToUser(req, userId, event, payload) {
  const io = getIo(req);
  if (io) io.to(`user_${userId}`).emit(event, payload);
}

async function logTimeline(taskId, userId, userName, action, details = "", extra = {}) {
  try {
    await TaskTimeline.create({ taskId, userId, userName, action, details, ...extra });
  } catch (_) { }
}

function calcProgress(checklist = []) {
  if (!checklist.length) return 0;
  const done = checklist.filter((c) => c.completed).length;
  return Math.round((done / checklist.length) * 100);
}

// ─── Phase 7: Task List ───────────────────────────────────────────────────────

exports.list = async (req, res) => {
  try {
    const {
      page = 1,
      size = 50,
      search = "",
      status,
      priority,
      assignee,
      assignedToMe,
      projectId,
      project,
      teamId,
    } = req.query;

    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (projectId || project) query.projectId = projectId || project;
    if (teamId) query.teamId = teamId;

    // Filter to tasks assigned to the current user
    const role = String(req.user?.role || "").toUpperCase();
    if ((assignedToMe === "true" || role === "MEMBER") && req.user) {
      const uid = String(req.user._id);
      const email = String(req.user.email || "");
      const name = String(req.user.name || "");
      query.$or = [
        { assigneeId: uid },
        { assigneeIds: uid },
        { "assignees.userId": uid },
        ...(email ? [{ assigneeEmail: email }, { "assignees.email": email }] : []),
        ...(name ? [{ assignee: name }, { "assignees.name": name }] : []),
        { "assignedTo._id": uid },
        { assignedTo: uid },
      ];
    } else if (assignee) {
      query.$or = [{ assigneeId: assignee }, { assigneeIds: assignee }];
    }

    const tasks = await Task.find(query)
      .sort({ deadline: 1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(size))
      .limit(Number(size))
      .lean();

    const total = await Task.countDocuments(query);

    // Attach comment counts
    const taskIds = tasks.map((t) => t._id);
    const commentCounts = await TaskComment.aggregate([
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: "$taskId", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    commentCounts.forEach((c) => { countMap[String(c._id)] = c.count; });

    const enriched = tasks.map((t) => ({
      ...t,
      commentCount: countMap[String(t._id)] || 0,
      checklistProgress: calcProgress(t.checklist || []),
    }));

    res.json({ success: true, data: enriched, total, page: Number(page), size: Number(size) });
  } catch (err) {
    console.error("taskController.list:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Phase 8: Task Detail ─────────────────────────────────────────────────────

exports.get = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("dependencies", "title status priority")
      .lean();
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Subtasks
    const subtasks = await Task.find({ parentTask: req.params.id }).lean();

    // Comments (most recent last)
    const comments = await TaskComment.find({ taskId: req.params.id })
      .sort({ createdAt: 1 })
      .lean();

    // Timeline (most recent first)
    const timeline = await TaskTimeline.find({ taskId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: {
        ...task,
        subtasks,
        comments,
        timeline,
        checklistProgress: calcProgress(task.checklist || []),
      },
    });
  } catch (err) {
    console.error("taskController.get:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.create = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.user?._id,
      createdByName: req.user?.name,
    });

    await logTimeline(task._id, req.user?._id, req.user?.name, "CREATED", `Task "${task.title}" created`);

    // Notify assignees
    const assigneeIds = [
      task.assigneeId,
      ...(task.assigneeIds || []),
      ...(task.assignees || []).map((assignee) => assignee.userId),
    ].filter(Boolean);
    if (assigneeIds.length) {
      await dispatchWorkflow({
        req,
        module: "task",
        event: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned: "${task.title}"`,
        priority: task.priority === "critical" ? "high" : "medium",
        actionUrl: `/employee/task-detail?id=${task._id}`,
        entityType: "task",
        entityId: task._id,
        userRefs: assigneeIds.map((id) => ({ userId: id })),
        metadata: { taskTitle: task.title },
      });
    }

    const io = getIo(req);
    if (io) io.emit("task_assigned", task);

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error("taskController.create:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const prevStatus = task.status;
    Object.assign(task, req.body);

    // Recalculate checklist progress if checklist changed
    if (req.body.checklist) {
      task.progress = calcProgress(task.checklist);
    }

    await task.save();

    if (req.body.status && req.body.status !== prevStatus) {
      await logTimeline(task._id, req.user?._id, req.user?.name, "STATUS_CHANGED",
        `Status changed from "${prevStatus}" to "${req.body.status}"`,
        { previousValue: prevStatus, newValue: req.body.status }
      );
    }

    emitToTask(req, "task_updated", task.toObject());

    res.json({ success: true, data: task });
  } catch (err) {
    console.error("taskController.update:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    const io = getIo(req);
    if (io) io.emit("task_deleted", { id: req.params.id });
    res.json({ success: true, message: "Task removed" });
  } catch (err) {
    console.error("taskController.delete:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Phase 8: Task Actions ────────────────────────────────────────────────────

exports.startTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const prev = task.status;
    task.status = "In Progress";
    task.startedAt = task.startedAt || new Date();
    await task.save();

    await logTimeline(task._id, req.user?._id, req.user?.name, "STARTED",
      `Task started by ${req.user?.name}`, { previousValue: prev, newValue: "In Progress" }
    );

    emitToTask(req, "task_updated", task.toObject());
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.pauseTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const prev = task.status;
    task.status = "Paused";
    await task.save();

    await logTimeline(task._id, req.user?._id, req.user?.name, "PAUSED",
      req.body.reason || "Task paused", { previousValue: prev, newValue: "Paused" }
    );

    emitToTask(req, "task_updated", task.toObject());
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitWork = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const prev = task.status;
    task.status = "Submitted for Review";
    if (req.body.hoursLogged) task.hoursLogged = (task.hoursLogged || 0) + Number(req.body.hoursLogged);
    if (req.body.attachments) {
      task.attachments = [...(task.attachments || []), ...req.body.attachments];
    }
    if (req.body.note) task.submissionNote = req.body.note;
    await task.save();

    await logTimeline(task._id, req.user?._id, req.user?.name, "SUBMITTED",
      `Work submitted by ${req.user?.name}${req.body.note ? `: ${req.body.note}` : ""}`,
      { previousValue: prev, newValue: "Submitted for Review" }
    );

    // Notify PM / Team Lead
    const notifyRefs = [];
    if (task.createdBy) notifyRefs.push({ userId: task.createdBy });
    if (task.projectManagerId) notifyRefs.push({ userId: task.projectManagerId });
    if (!notifyRefs.length) notifyRefs.push({ role: "PROJECT_MANAGER" }, { role: "TEAM_LEAD" });

    await dispatchWorkflow({
      req,
      module: "task",
      event: "task_submitted",
      title: "Task Submitted for Review",
      message: `${req.user?.name} submitted "${task.title}" for review.`,
      priority: "high",
      actionUrl: `/employee/task-detail?id=${task._id}`,
      entityType: "task",
      entityId: task._id,
      userRefs: notifyRefs,
      metadata: { taskTitle: task.title },
    });

    emitToTask(req, "task_updated", task.toObject());
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Phase 8: Checklist ───────────────────────────────────────────────────────

exports.updateChecklist = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const { itemId, completed, text, action } = req.body;

    if (action === "add" && text) {
      task.checklist.push({ text, completed: false });
    } else if (action === "delete" && itemId) {
      task.checklist = task.checklist.filter((c) => String(c._id) !== String(itemId));
    } else if (itemId !== undefined) {
      const item = task.checklist.id(itemId);
      if (!item) return res.status(404).json({ success: false, message: "Checklist item not found" });
      if (completed !== undefined) {
        item.completed = completed;
        item.completedAt = completed ? new Date() : null;
      }
      if (text !== undefined) item.text = text;
    }

    // Recalculate task progress from checklist
    task.progress = calcProgress(task.checklist);
    await task.save();

    await logTimeline(task._id, req.user?._id, req.user?.name, "CHECKLIST_UPDATED",
      `Checklist updated — progress: ${task.progress}%`
    );

    emitToTask(req, "task_updated", task.toObject());
    res.json({ success: true, data: task, progress: task.progress });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Phase 8: Comments ────────────────────────────────────────────────────────

exports.addComment = async (req, res) => {
  try {
    const { content, attachments = [], mentions = [] } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: "Content required" });

    const comment = await TaskComment.create({
      taskId: req.params.id,
      userId: req.user._id,
      userName: req.user.name,
      userAvatar: req.user.profilePhoto || "",
      userRole: req.user.role || "",
      content: content.trim(),
      attachments,
      mentions,
    });

    await logTimeline(req.params.id, req.user._id, req.user.name, "COMMENT_ADDED",
      `Comment by ${req.user.name}`
    );

    // Broadcast to task room
    const io = getIo(req);
    if (io) io.to(`task_${req.params.id}`).emit("task_comment", comment.toObject());

    // Notify mentioned users
    if (mentions.length) {
      const mentionedUsers = await User.find({ name: { $in: mentions } });
      for (const mu of mentionedUsers) {
        emitToUser(req, mu._id, "task_mention", {
          taskId: req.params.id,
          comment: comment.toObject(),
          mentionedBy: req.user.name,
        });
      }
    }

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const comments = await TaskComment.find({ taskId: req.params.id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markCommentSeen = async (req, res) => {
  try {
    const comment = await TaskComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

    const alreadySeen = comment.seenBy.some((s) => String(s.userId) === String(req.user._id));
    if (!alreadySeen) {
      comment.seenBy.push({ userId: req.user._id, seenAt: new Date() });
      await comment.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTimeline = async (req, res) => {
  try {
    const timeline = await TaskTimeline.find({ taskId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: timeline });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
