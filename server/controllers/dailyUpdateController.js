const DailyUpdate = require("../models/DailyUpdate");
const Subtask = require("../models/Subtask");
const Task = require("../models/Task");
const { dispatchWorkflow } = require("../services/workflowService");

function pickFirstNonEmpty(...values) {
    return (
        values.find((value) => {
            if (value === undefined || value === null) return false;
            return String(value).trim() !== "";
        }) || ""
    );
}

async function list(req, res) {
    const role = String(req.user?.role || "").toUpperCase();
    const query = {};

    if (role === "MEMBER") {
        query.$or = [{ userId: req.user._id }, { author: req.user.name }, { employee: req.user.name }];
    }

    const documents = await DailyUpdate.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
}

async function getById(req, res) {
    const document = await DailyUpdate.findById(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "daily update not found" });
    }

    res.json({ success: true, data: document });
}

async function create(req, res) {
    const subtask = req.body.subtaskId ? await Subtask.findById(req.body.subtaskId) : null;
    const task = req.body.taskId ? await Task.findById(req.body.taskId) : subtask?.taskId ? await Task.findById(subtask.taskId) : null;
    const payload = {
        ...req.body,
        userId: req.user._id,
        author: req.user.name,
        employee: req.user.name,
        role: req.user.role,
        subtaskId: pickFirstNonEmpty(req.body.subtaskId, subtask?._id),
        taskId: pickFirstNonEmpty(req.body.taskId, task?._id, subtask?.taskId),
        projectId: pickFirstNonEmpty(req.body.projectId, task?.projectId, subtask?.projectId),
        projectName: pickFirstNonEmpty(req.body.projectName, task?.projectName),
        taskTitle: pickFirstNonEmpty(req.body.taskTitle, task?.title, subtask?.title),
    };

    const document = await DailyUpdate.create(payload);

    if (task?.leadId || task?.leadEmail || task?.lead || task?.managerId || task?.managerEmail || task?.manager) {
        await dispatchWorkflow({
            req,
            module: "daily-updates",
            event: "DAILY_UPDATE_CREATED",
            title: "Daily update submitted",
            message: `${req.user.name} posted a daily update for ${payload.taskTitle || "your work"}.`,
            priority: "medium",
            actionUrl: "/employee/daily-updates",
            entityType: "dailyUpdate",
            entityId: document._id,
            userRefs: [
                { userId: task?.leadId },
                { email: task?.leadEmail },
                { name: task?.lead },
                { userId: task?.managerId },
                { email: task?.managerEmail },
                { name: task?.manager },
            ].filter(Boolean),
            email: {
                subject: `Daily update from ${req.user.name}`,
                template: "generic",
                variables: {
                    title: "Daily update submitted",
                    employeeName: req.user.name,
                    projectName: payload.projectName || task?.projectName || "General Workspace",
                    taskTitle: payload.taskTitle || task?.title || "Task update",
                    actionLabel: "View Update",
                },
            },
        });
    }

    res.status(201).json({ success: true, message: "daily update created", data: document });
}

async function update(req, res) {
    const document = await DailyUpdate.findById(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "daily update not found" });
    }

    Object.assign(document, req.body);
    await document.save();
    res.json({ success: true, message: "daily update updated", data: document });
}

async function remove(req, res) {
    const document = await DailyUpdate.findByIdAndDelete(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "daily update not found" });
    }

    res.json({ success: true, message: "daily update deleted", id: req.params.id });
}

module.exports = { list, getById, create, update, remove };
