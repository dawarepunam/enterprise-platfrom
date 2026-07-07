const createCrudController = require("../utils/createCrudController");
const User = require("../models/User");
const { dispatchWorkflow } = require("../services/workflowService");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const DailyUpdate = require("../models/DailyUpdate");

const base = createCrudController("users");

async function list(req, res) {
  return base.list(req, res);
}

function normalizePermissions(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMicrosoftProfile(payload) {
  return {
    outlookEmail: String(payload.microsoft?.outlookEmail || payload.email || "").trim().toLowerCase(),
    outlookReady: Boolean(payload.microsoft?.outlookEmail || payload.email),
    calendarReady: Boolean(payload.microsoft?.calendarReady),
    teamsReady: Boolean(payload.microsoft?.teamsReady),
    oneDriveReady: Boolean(payload.microsoft?.oneDriveReady),
    lastWelcomeEmailAt: null,
  };
}

function buildUserPayload(body = {}, overrides = {}) {
  const payload = {
    ...body,
    ...overrides,
    email: String(overrides.email || body.email || "").trim().toLowerCase(),
  };

  payload.permissions = normalizePermissions(overrides.permissions !== undefined ? overrides.permissions : body.permissions);
  payload.microsoft = buildMicrosoftProfile(payload);

  return payload;
}

async function createUserRecord(req, res, payload, { createdMessage = "users created" } = {}) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    return res.status(409).json({ success: false, message: "User already exists with this email" });
  }

  if (!payload.employeeId) {
    let count = await User.countDocuments();
    let uniqueIdFound = false;
    let candidateId = "";
    while (!uniqueIdFound) {
      count++;
      candidateId = `EMP${String(count).padStart(3, "0")}`;
      const existing = await User.findOne({ employeeId: candidateId });
      if (!existing) {
        uniqueIdFound = true;
      }
    }
    payload.employeeId = candidateId;
  }

  const user = await User.create(payload);

  Promise.resolve(dispatchWorkflow({
    req,
    module: "users",
    event: "USER_CREATED",
    title: "Welcome to Smart Enterprise",
    message: `${user.name} has been onboarded as ${user.role}.`,
    priority: "medium",
    actionUrl: "/login.html",
    entityType: "user",
    entityId: user._id,
    userRefs: [{ userId: user._id }],
    email: {
      subject: "Your Smart Enterprise account is ready",
      template: "welcome",
      variables: {
        title: "Your account is now active",
        role: user.role,
        email: user.email,
        actionLabel: "Open Login",
      },
    },
    metadata: {
      createdUserId: String(user._id),
      createdUserRole: user.role,
      createdUserEmail: user.email,
    },
  })).catch(() => {});

  user.microsoft = {
    ...(user.microsoft || {}),
    ...payload.microsoft,
    lastWelcomeEmailAt: new Date(),
  };
  await user.save();

  return res.status(201).json({ success: true, message: createdMessage, data: user.toJSON() });
}

async function getById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User record not found" });
    }

    const plainUser = user.toJSON();
    const userName = user.name;
    const userId = user._id;

    // Fetch related records
    const userProjects = await Project.find({
      $or: [
        { managerId: userId },
        { teamLeadId: userId },
        { teamMemberIds: userId },
        { manager: userName },
        { teamMembers: userName }
      ]
    }).sort({ createdAt: -1 });

    const userTasks = await Task.find({
      $or: [
        { assignee: userName },
        { assigneeId: userId }
      ]
    }).sort({ createdAt: -1 });

    const userAttendance = await Attendance.find({
      $or: [
        { userName: userName },
        { employee: userName }
      ]
    }).sort({ date: -1, createdAt: -1 });

    const userLeaves = await Leave.find({
      $or: [
        { employee: userName },
        { userName: userName }
      ]
    }).sort({ createdAt: -1 });

    const userUpdates = await DailyUpdate.find({
      $or: [
        { employee: userName },
        { userName: userName }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    // Calculate metrics
    const totalProjects = userProjects.length;
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(task => String(task.status).toLowerCase() === "completed").length;
    const pendingTasks = totalTasks - completedTasks;

    const totalAttendance = userAttendance.length;
    const presentCount = userAttendance.filter(att => String(att.status).toLowerCase() === "present" || String(att.status).toLowerCase() === "active").length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

    const totalLeaves = userLeaves.length;
    const approvedLeaves = userLeaves.filter(leave => String(leave.status).toLowerCase() === "approved").length;

    // Dynamic performance rating
    let performanceScore = 85; // Starting base
    if (attendanceRate >= 90) performanceScore += 5;
    if (attendanceRate < 75) performanceScore -= 10;
    
    performanceScore += (completedTasks * 2);
    performanceScore -= (pendingTasks * 1);
    
    const unapprovedLeaves = totalLeaves - approvedLeaves;
    performanceScore -= (unapprovedLeaves * 3);
    
    // Clamp between 20 and 100
    performanceScore = Math.max(20, Math.min(100, performanceScore));

    plainUser.workload = {
      projectsCount: totalProjects,
      tasksCount: totalTasks,
      completedTasksCount: completedTasks,
      pendingTasksCount: pendingTasks,
      attendanceRate,
      leavesCount: totalLeaves,
      approvedLeavesCount: approvedLeaves,
      performanceScore,
      projects: userProjects.slice(0, 5),
      tasks: userTasks.slice(0, 5),
      attendance: userAttendance.slice(0, 10),
      leaves: userLeaves.slice(0, 5),
      dailyUpdates: userUpdates
    };

    res.json({ success: true, data: plainUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function create(req, res) {
  const payload = buildUserPayload(req.body);
  return createUserRecord(req, res, payload);
}

async function listManagers(req, res) {
  const items = await User.find({ role: "MANAGER" }).sort({ createdAt: -1 });
  res.json({ success: true, data: items.map((item) => item.toJSON()) });
}

async function createManager(req, res) {
  const payload = buildUserPayload(req.body, {
    role: "MANAGER",
    title: req.body.title || req.body.designation || "Delivery Manager",
    designation: req.body.designation || req.body.title || "Delivery Manager",
    permissions: req.body.permissions,
  });

  return createUserRecord(req, res, payload, { createdMessage: "manager created" });
}

async function update(req, res) {
  return base.update(req, res);
}

async function remove(req, res) {
  return base.remove(req, res);
}

async function toggleStatus(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User record not found" });
    }

    user.status = user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    await user.save();

    res.json({
      success: true,
      message: `User status toggled to ${user.status}`,
      data: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  list,
  listManagers,
  getById,
  create,
  createManager,
  update,
  remove,
  toggleStatus,
};
