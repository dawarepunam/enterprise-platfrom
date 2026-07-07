// server/controllers/projectController.js
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const Team = require('../models/Team');
const Notification = require('../models/Notification');
const emailService = require('../utils/emailService');

// List all projects (with pagination & search)
exports.getAllProjects = async (req, res) => {
  try {
    const { page = 1, size = 20, search = '' } = req.query;
    const query = search ? { projectName: { $regex: search, $options: 'i' } } : {};
    const projects = await Project.find(query)
      .skip((page - 1) * size)
      .limit(Number(size))
      .lean();
    const total = await Project.countDocuments(query);
    res.json({ success: true, data: projects, total, page: Number(page), size: Number(size) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMemberProjects = async (req, res) => {
  try {
    const user = req.user || {};
    const userId = String(user._id || "");
    const userName = String(user.name || "").trim();
    const userEmail = String(user.email || "").trim();

    const assignedTasks = await Task.find({
      $or: [
        { assigneeId: user._id },
        { assigneeId: userId },
        { assigneeIds: user._id },
        { assigneeIds: userId },
        { "assignees.userId": user._id },
        { "assignees.userId": userId },
        ...(userEmail ? [{ assigneeEmail: userEmail }, { "assignees.email": userEmail }] : []),
        ...(userName ? [{ assignee: userName }, { "assignees.name": userName }] : []),
      ],
    }).select("projectId projectName").lean();

    const assignedTeams = await Team.find({
      $or: [
        { managerId: user._id },
        { managerId: userId },
        { teamLeadId: user._id },
        { teamLeadId: userId },
        { memberIds: user._id },
        { memberIds: userId },
        ...(userName ? [{ manager: userName }, { teamLead: userName }, { members: userName }] : []),
      ],
    }).select("projectId projectName").lean();

    const projectIds = assignedTasks.map((task) => task.projectId).filter(Boolean);
    const projectNames = assignedTasks.map((task) => task.projectName).filter(Boolean);
    assignedTeams.forEach((team) => {
      if (team.projectId) projectIds.push(team.projectId);
      if (team.projectName) projectNames.push(team.projectName);
    });

    const query = {
      $or: [
        { teamMemberIds: user._id },
        { teamMemberIds: userId },
        { "allocatedTeam.userId": user._id },
        { "allocatedTeam.userId": userId },
        ...(userName ? [{ teamMembers: userName }, { "allocatedTeam.name": userName }] : []),
        ...(projectIds.length ? [{ _id: { $in: projectIds } }] : []),
        ...(projectNames.length ? [{ projectName: { $in: projectNames } }] : []),
      ],
    };

    const projects = await Project.find(query).sort({ updatedAt: -1, createdAt: -1 }).lean();
    res.json({ success: true, data: projects });
  } catch (err) {
    console.error("getMemberProjects:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single project by id
exports.get = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new project
exports.create = async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.stack });
  }
};

// Update existing project
exports.update = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (Array.isArray(payload.allocatedTeam)) {
      payload.teamMemberIds = payload.allocatedTeam.map((item) => item.userId).filter(Boolean);
      payload.teamMembers = payload.allocatedTeam.map((item) => item.name).filter(Boolean);
    }
    const project = await Project.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete project
exports.delete = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Assign a Project Manager to a project
exports.assignPM = async (req, res) => {
  try {
    const { pmId } = req.body; // User ID of the PM
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const pm = await User.findById(pmId);
    if (!pm || pm.role !== 'PROJECT_MANAGER') return res.status(400).json({ success: false, message: 'Invalid Project Manager' });
    project.assignedManager = pmId;
    await project.save();
    // notification & email
    const notif = await Notification.create({ userId: pmId, type: 'PROJECT_ASSIGNED', message: `You have been assigned to project ${project.projectName}` });
    await emailService.send(pm.email, 'Project Assigned', `You have been assigned to project ${project.projectName}`);
    // emit socket (assumes io is exported from server/config/socket.js)
    const io = require('../config/socket');
    io.to(`user_${pmId}`).emit('projectAssigned', { projectId: project._id, projectName: project.projectName });
    res.json({ success: true, data: project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
