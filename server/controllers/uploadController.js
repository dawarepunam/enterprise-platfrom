const File = require("../models/File");
const Subtask = require("../models/Subtask");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Team = require("../models/Team");
const { dispatchWorkflow } = require("../services/workflowService");

async function list(req, res) {
    const role = String(req.user ? .role || "").toUpperCase();
    let query = { uploadedBy: req.user._id };

    if (role === "MEMBER") {
        const [projects, teams] = await Promise.all([
            Project.find({
                $or: [{ teamMemberIds: req.user._id }, { teamMembers: req.user.name }],
            }).select("_id").lean(),
            Team.find({
                $or: [
                    { managerId: req.user._id },
                    { teamLeadId: req.user._id },
                    { memberIds: req.user._id },
                    { members: req.user.name },
                ],
            }).select("_id roomId").lean(),
        ]);

        const projectIds = projects.map((project) => project._id);
        const teamIds = teams.map((team) => team._id);
        const roomIds = teams.map((team) => team.roomId).filter(Boolean);

        query = {
            $or: [
                { uploadedBy: req.user._id },
                { projectId: { $in: projectIds } },
                { teamId: { $in: teamIds } },
                { roomId: { $in: roomIds } },
            ],
        };
    }

    const documents = await File.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
}

async function getById(req, res) {
    const document = await File.findById(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "file record not found" });
    }

    res.json({ success: true, data: document });
}

async function create(req, res) {
    const subtask = req.body.subtaskId ? await Subtask.findById(req.body.subtaskId) : null;
    const task = req.body.taskId ? await Task.findById(req.body.taskId) : subtask ? .taskId ? await Task.findById(subtask.taskId) : null;

    if (!req.body.name || !req.body.url) {
        return res.status(400).json({ success: false, message: "File name and URL are required" });
    }

    const document = await File.create({
        teamId: req.body.teamId || subtask ? .teamId,
        roomId: req.body.roomId || subtask ? .roomId || "",
        uploadedBy: req.user._id,
        uploadedByName: req.user.name,
        name: req.body.name,
        url: req.body.url,
        mimeType: req.body.mimeType || "",
        size: Number(req.body.size || 0),
        metadata: {
            subtaskId: req.body.subtaskId || "",
            taskId: req.body.taskId || "",
        },
    });

    if (subtask) {
        subtask.submittedAssets = Array.from(new Set([...(subtask.submittedAssets || []), document.url]));
        await subtask.save();
    }

    await dispatchWorkflow({
                req,
                module: "files",
                event: "FILE_SHARED",
                title: "Proof file uploaded",
                message: `${req.user.name} uploaded ${document.name}${task ? ` for ${task.title}` : ""}.`,
    priority: "medium",
    actionUrl: document.roomId ? `/employee/chat?roomId=${encodeURIComponent(document.roomId)}` : "/employee/files",
    entityType: "file",
    entityId: document._id,
    userRefs: [
      { userId: task?.leadId },
      { email: task?.leadEmail },
      { name: task?.lead },
      { userId: task?.managerId },
      { email: task?.managerEmail },
      { name: task?.manager },
      { userId: req.user._id },
    ],
    email: {
      subject: `Proof uploaded: ${document.name}`,
      template: "generic",
      variables: {
        title: "Work proof uploaded",
        memberName: req.user.name,
        fileName: document.name,
        projectName: task?.projectName || req.body.projectName || "General Workspace",
        taskTitle: task?.title || req.body.taskTitle || "Task",
        actionLabel: "Open File",
      },
    },
    metadata: {
      projectName: task?.projectName || "",
      taskTitle: task?.title || "",
      fileName: document.name,
    },
  });

  res.status(201).json({ success: true, message: "file uploaded", data: document });
}

async function update(req, res) {
  const document = await File.findById(req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: "file record not found" });
  }

  Object.assign(document, req.body);
  await document.save();
  res.json({ success: true, message: "file updated", data: document });
}

async function remove(req, res) {
  const document = await File.findByIdAndDelete(req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: "file record not found" });
  }

  res.json({ success: true, message: "file deleted", id: req.params.id });
}

module.exports = { list, getById, create, update, remove };