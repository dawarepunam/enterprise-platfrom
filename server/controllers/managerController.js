const mongoose = require("mongoose");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Team = require("../models/Team");
const User = require("../models/User");
const File = require("../models/File");
const Meeting = require("../models/Meeting");
const Notification = require("../models/Notification");
const WorkHistory = require("../models/WorkHistory");
const EmailRecord = require("../models/EmailRecord");
const Report = require("../models/Report");
const DailyUpdate = require("../models/DailyUpdate");
const Attendance = require("../models/Attendance");
const AttendanceRecord = require("../models/AttendanceRecord");
const Leave = require("../models/Leave");
const LeaveRequest = require("../models/LeaveRequest");
const Document = require("../models/Document");
const { createNotification } = require("../services/notificationService");
const { ensureOneDriveFolder, listOneDriveFiles } = require("../services/microsoftGraphService");
const { sendEmail } = require("../services/emailService");
const { normalizeActionUrl } = require("../services/workflowService");

function isManagerScope(user) {
  const role = String(user?.role || "").toUpperCase();
  return role === "MANAGER" || role === "PROJECT_MANAGER";
}

function managerProjectFilter(user) {
  if (!isManagerScope(user)) return {};
  return {
    $or: [{ assignedManager: user._id }, { managerId: user._id }, { managerEmail: user.email }, { manager: user.name }, { projectManagerId: user._id }, { assignedTo: user._id }],
  };
}

function toObjectIdStrings(list = []) {
  return Array.from(new Set(list.filter(Boolean).map((item) => String(item))));
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function rejectInvalidObjectId(res, label = "Id") {
  return res.status(400).json({ success: false, message: `${label} is invalid or unavailable. Please select a real saved record.` });
}

function assertObjectId(value, res, label = "Id") {
  if (isObjectId(value)) return true;
  rejectInvalidObjectId(res, label);
  return false;
}

function normalizeProjectStatus(status = "") {
  const value = String(status || "").trim().toLowerCase();
  if (value === "on hold" || value === "hold") return "On Hold";
  if (value === "assigned") return "Assigned";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  if (value === "active") return "Active";
  return "Planning";
}

function scoreTeamRecord(team = {}) {
  const memberIdsCount = Array.isArray(team.memberIds) ? team.memberIds.filter(Boolean).length : 0;
  const membersCount = Array.isArray(team.members) ? team.members.filter(Boolean).length : 0;
  const statusBoost = team.status === "Active" ? 4 : team.status === "Planning" ? 2 : 0;
  const collaborationBoost = team.collaboration?.oneDriveFolder || team.collaboration?.teamsWebUrl ? 3 : 0;
  const updatedAtScore = new Date(team.updatedAt || team.createdAt || 0).getTime() || 0;
  return memberIdsCount * 100 + membersCount * 10 + statusBoost + collaborationBoost + updatedAtScore / 1e13;
}

async function getCanonicalTeamsForProjects(projectIds = []) {
  if (!projectIds.length) return [];

  const rawTeams = await Team.find({ projectId: { $in: projectIds } }).sort({ updatedAt: -1, createdAt: -1 }).lean();
  if (!rawTeams.length) return [];

  const grouped = new Map();
  rawTeams.forEach((team) => {
    const key = String(team.projectId || team._id);
    const current = grouped.get(key);
    if (!current || scoreTeamRecord(team) > scoreTeamRecord(current)) {
      grouped.set(key, team);
    }
  });

  const canonicalTeams = Array.from(grouped.values());
  const memberNames = Array.from(
    new Set(
      canonicalTeams
        .flatMap((team) => team.members || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );

  const usersByName = memberNames.length
    ? await User.find({ name: { $in: memberNames } }).select("_id name").lean()
    : [];
  const userIdByName = new Map(usersByName.map((user) => [String(user.name || "").trim().toLowerCase(), String(user._id)]));

  return canonicalTeams.map((team) => {
    const resolvedMemberIds = toObjectIdStrings([
      ...(team.memberIds || []),
      ...(team.members || []).map((memberName) => userIdByName.get(String(memberName || "").trim().toLowerCase()) || null),
    ]);

    return {
      ...team,
      memberIds: resolvedMemberIds,
      members: Array.from(new Set((team.members || []).filter(Boolean))),
    };
  });
}

async function getManagerProjectsWithCounts(user) {
  const projects = await Project.find(managerProjectFilter(user)).sort({ createdAt: -1 }).lean();
  if (!projects.length) return [];

  const projectIds = projects.map((project) => project._id);
  const [tasks, teams, files] = await Promise.all([
    Task.find({ projectId: { $in: projectIds } }).lean(),
    getCanonicalTeamsForProjects(projectIds),
    File.find({ projectId: { $in: projectIds } }).lean(),
  ]);
  const meetings = teams.length
    ? await Meeting.find({
        $or: [{ teamId: { $in: teams.map((team) => team._id) } }, { roomId: { $in: teams.map((team) => team.roomId).filter(Boolean) } }],
      }).lean()
    : [];

  return projects.map((project) => {
    const relatedTeams = teams.filter((team) => String(team.projectId || "") === String(project._id));
    const relatedTasks = tasks.filter((task) => String(task.projectId || "") === String(project._id));
    const relatedFiles = files.filter((file) => String(file.projectId || "") === String(project._id));
    const relatedMeetings = meetings.filter((meeting) => relatedTeams.some((team) => String(team._id) === String(meeting.teamId || "")));
    const memberIds = new Set(relatedTeams.flatMap((team) => team.memberIds || []));

    return {
      ...project,
      name: project.projectName,
      dueDate: project.deadline,
      completion: Number(project.progress || 0),
      teamSize: memberIds.size,
      tasksCount: relatedTasks.length,
      openTasks: relatedTasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length,
      completedTasks: relatedTasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length,
      overdueTasks: relatedTasks.filter((task) => !["Completed", "Approved"].includes(task.status) && task.deadline && new Date(task.deadline) < new Date()).length,
      meetingsCount: relatedMeetings.length,
      filesCount: relatedFiles.length,
    };
  });
}

function buildMemberProjectBuckets(projects = []) {
  return {
    currentProjects: projects.filter((project) => !["Completed", "Cancelled"].includes(project.status)),
    previousProjects: projects.filter((project) => ["Completed", "Cancelled"].includes(project.status)),
    holdProjects: projects.filter((project) => project.status === "On Hold"),
    completedProjects: projects.filter((project) => project.status === "Completed"),
    activeProjects: projects.filter((project) => ["Assigned", "Active"].includes(project.status)),
  };
}

function buildProductivityTrend(history = []) {
  const buckets = new Map();
  history.forEach((item) => {
    const date = new Date(item.createdAt || item.updatedAt || Date.now());
    const key = date.toISOString().slice(0, 10);
    const current = buckets.get(key) || { date: key, hours: 0, updates: 0 };
    current.hours += Number(item.hoursWorked || 0);
    current.updates += 1;
    buckets.set(key, current);
  });

  return Array.from(buckets.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map((item) => ({
      date: item.date,
      hours: Math.round(item.hours * 100) / 100,
      updates: item.updates,
      productivity: Math.min(100, Math.round(item.hours * 12 + item.updates * 8)),
    }));
}

function buildMemberAutoReport(member, assignedProjects = [], tasks = [], dailyUpdates = [], files = [], history = []) {
  const completedTasks = tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length;
  const pendingTasks = tasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length;
  const totalHours = history.reduce((sum, item) => sum + Number(item.hoursWorked || 0), 0);
  const averageCompletion = dailyUpdates.length
    ? Math.round(dailyUpdates.reduce((sum, item) => sum + Number(item.completion || 0), 0) / dailyUpdates.length)
    : 0;
  const uploadedImages = files.filter((file) => String(file.mimeType || "").toLowerCase().startsWith("image/")).length;

  return {
    generatedAt: new Date().toISOString(),
    memberId: String(member?._id || ""),
    memberName: member?.name || "",
    assignedProjects: assignedProjects.length,
    completedTasks,
    pendingTasks,
    totalDailyUpdates: dailyUpdates.length,
    totalUploadedFiles: files.length,
    uploadedImages,
    totalWorkingHours: Math.round(totalHours * 100) / 100,
    averageCompletion,
    productivityScore: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : averageCompletion,
    managerSummary: tasks.length
      ? `${member?.name || "Member"} completed ${completedTasks}/${tasks.length} tasks with ${dailyUpdates.length} daily updates and ${files.length} uploaded files.`
      : `${member?.name || "Member"} has no task records yet, but update and file history is available.`,
  };
}

function buildDailyUpdateScope(projects = [], tasks = []) {
  const projectIds = toObjectIdStrings(projects.map((project) => project._id));
  const projectNames = Array.from(
    new Set(
      projects
        .map((project) => String(project.projectName || "").trim())
        .filter(Boolean),
    ),
  );
  const taskIds = toObjectIdStrings(tasks.map((task) => task._id));
  const filters = [];

  if (projectIds.length) {
    filters.push({ projectId: { $in: projectIds } });
  }
  if (projectNames.length) {
    filters.push({ projectName: { $in: projectNames } });
  }
  if (taskIds.length) {
    filters.push({ taskId: { $in: taskIds } });
  }

  return filters.length ? { $or: filters } : null;
}

function normalizeNameKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getProjectMemberIds(projects = []) {
  return toObjectIdStrings(
    projects.flatMap((project) => [
      ...(project.teamMemberIds || []),
      ...(project.allocatedTeam || []).map((member) => member?.userId),
      ...(project.milestones || []).flatMap((milestone) => milestone?.assignedTeamMemberIds || []),
    ]),
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function buildProjectDetail(project, user) {
  const [teams, tasks, projectFiles, documents, notifications, history, reports, emails] = await Promise.all([
    getCanonicalTeamsForProjects([project._id]),
    Task.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
    File.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
    Document.find({ projectId: project._id, archived: { $ne: true } })
      .populate("uploadedBy", "name email role profilePhoto department designation")
      .sort({ createdAt: -1 })
      .lean(),
    Notification.find({
      $or: [{ userId: user._id }, { role: user.role }],
      entityId: String(project._id),
    }).sort({ createdAt: -1 }).limit(20).lean(),
    WorkHistory.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Report.find({ projectId: String(project._id) }).sort({ createdAt: -1 }).lean(),
    EmailRecord.find({ projectId: project._id }).sort({ receivedAt: -1, createdAt: -1 }).limit(50).lean(),
  ]);

  const teamIds = teams.map((team) => team._id);
  const teamFiles = teamIds.length
    ? await File.find({ teamId: { $in: teamIds } }).sort({ createdAt: -1 }).lean()
    : [];
  const files = [...projectFiles, ...teamFiles].filter(
    (file, index, list) => list.findIndex((item) => String(item._id) === String(file._id)) === index,
  );
  const meetings = await Meeting.find({ teamId: { $in: teamIds } }).sort({ scheduledFor: 1, createdAt: -1 }).lean();
  const memberIds = Array.from(
    new Set(
      [
        ...(project.teamMemberIds || []),
        ...teams.flatMap((team) => [team.managerId, team.teamLeadId, ...(team.memberIds || [])]),
      ]
        .filter(Boolean)
        .map(String),
    ),
  );
  const members = memberIds.length
    ? await User.find({ _id: { $in: memberIds } }).select("name email role profilePhoto department designation status").lean()
    : [];
  const memberNames = Array.from(new Set(members.map((member) => member.name).filter(Boolean)));

  const activityQuery = memberIds.length || memberNames.length
    ? {
        $or: [
          ...(memberIds.length ? [{ userId: { $in: memberIds } }] : []),
          ...(memberNames.length
            ? [
                { userName: { $in: memberNames } },
                { employee: { $in: memberNames } },
                { author: { $in: memberNames } },
              ]
            : []),
        ],
      }
    : null;

  const dailyUpdateScope = buildDailyUpdateScope([project], tasks);
  const [attendanceRecords, legacyAttendance, leaveRequests, legacyLeaves, dailyUpdates] = await Promise.all([
    activityQuery ? AttendanceRecord.find(activityQuery).sort({ date: -1, createdAt: -1 }).limit(100).lean() : [],
    activityQuery ? Attendance.find(activityQuery).sort({ date: -1, createdAt: -1 }).limit(100).lean() : [],
    activityQuery ? LeaveRequest.find(activityQuery).sort({ createdAt: -1 }).limit(100).lean() : [],
    activityQuery ? Leave.find(activityQuery).sort({ createdAt: -1 }).limit(100).lean() : [],
    dailyUpdateScope && activityQuery
      ? DailyUpdate.find({ $and: [dailyUpdateScope, activityQuery] }).sort({ createdAt: -1 }).limit(100).lean()
      : [],
  ]);

  const taskMapByMember = new Map();
  tasks.forEach((task) => {
    const key = String(task.assigneeId || "");
    if (!key) return;
    const current = taskMapByMember.get(key) || { assignedTasks: 0, completedTasks: 0 };
    current.assignedTasks += 1;
    if (["Completed", "Approved"].includes(task.status)) current.completedTasks += 1;
    taskMapByMember.set(key, current);
  });

  const fileUploadsByMember = new Map();
  files.forEach((file) => {
    const key = String(file.uploadedBy || "");
    if (!key) return;
    fileUploadsByMember.set(key, (fileUploadsByMember.get(key) || 0) + 1);
  });

  const meetingsByMember = new Map();
  meetings.forEach((meeting) => {
    (meeting.participants || []).forEach((participant) => {
      const key = String(participant.userId || "");
      if (!key) return;
      meetingsByMember.set(key, (meetingsByMember.get(key) || 0) + 1);
    });
  });

  const teamMembers = members.map((member) => {
    const metrics = taskMapByMember.get(String(member._id)) || { assignedTasks: 0, completedTasks: 0 };
    const memberHistory = history.filter((item) => String(item.userId) === String(member._id));
    const hoursWorked = memberHistory.reduce((sum, item) => sum + Number(item.hoursWorked || 0), 0);
    const performanceScore = metrics.assignedTasks
      ? Math.round((metrics.completedTasks / metrics.assignedTasks) * 100)
      : 0;

    return {
      ...member,
      assignedTasks: metrics.assignedTasks,
      completedTasks: metrics.completedTasks,
      hoursWorked,
      performanceScore,
      filesUploaded: fileUploadsByMember.get(String(member._id)) || 0,
      meetingsAttended: meetingsByMember.get(String(member._id)) || 0,
      onlineStatus: String(member.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "Online" : "Offline",
    };
  });

  const statistics = {
    totalMembers: teamMembers.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length,
    pendingTasks: tasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length,
    filesUploaded: files.length + documents.length,
    meetingsConducted: meetings.length,
    attendanceRecords: attendanceRecords.length + legacyAttendance.length,
    leaveRequests: leaveRequests.length + legacyLeaves.length,
    dailyUpdates: dailyUpdates.length,
  };

  return {
    ...project,
    name: project.projectName,
    dueDate: project.deadline,
    completion: Number(project.progress || 0),
    teams,
    teamMembers,
    tasks,
    files,
    documents,
    attendance: [...attendanceRecords, ...legacyAttendance],
    leaves: [...leaveRequests, ...legacyLeaves],
    dailyUpdates,
    meetings,
    notifications,
    workHistory: history,
    reports,
    emails,
    statistics,
    timeline: buildTimeline(project, teams, tasks, files, meetings, history, emails),
  };
}

async function syncProjectTeamMembers(project, memberIds = []) {
  const memberUsers = memberIds.length
    ? await User.find({ _id: { $in: memberIds } }).select("name email role").lean()
    : [];
  const memberNames = memberUsers.map((user) => user.name);
  project.teamMemberIds = memberUsers.map((user) => user._id);
  project.teamMembers = memberNames;
  await project.save();

  let team = await Team.findOne({ projectId: project._id }).sort({ updatedAt: -1, createdAt: -1 });
  if (!team) {
    team = await Team.create({
      name: `${project.projectName} Delivery Workspace`,
      projectId: project._id,
      projectName: project.projectName,
      managerId: project.managerId || project.assignedManager || null,
      manager: project.manager || "",
      teamLeadId: project.teamLeadId || null,
      teamLead: project.teamLead || "",
      department: project.department || "",
      memberIds: memberUsers.map((user) => user._id),
      members: memberNames,
      status: project.status === "Completed" ? "Completed" : "Active",
      notes: `Workspace synced for ${project.projectName}.`,
    });
  } else {
    team.memberIds = memberUsers.map((user) => user._id);
    team.members = memberNames;
    team.managerId = project.managerId || project.assignedManager || null;
    team.manager = project.manager || "";
    team.teamLeadId = project.teamLeadId || null;
    team.teamLead = project.teamLead || "";
    team.projectName = project.projectName || "";
    team.department = project.department || "";
    team.status = project.status === "Completed" ? "Completed" : team.status || "Active";
    await team.save();
  }

  await User.updateMany(
    { _id: { $in: memberUsers.map((user) => user._id) } },
    { $set: { teamId: team._id, teamName: team.name, status: "ACTIVE" } },
  );

  await User.updateMany(
    {
      _id: { $nin: memberUsers.map((user) => user._id) },
      teamId: team._id,
    },
    { $set: { teamId: null, teamName: "" } },
  );

  return { team, memberUsers, memberNames };
}

function buildTimeline(project, teams, tasks, files, meetings, history, emails) {
  const baseItems = [];

  teams.forEach((team) => baseItems.push({ type: "Team Created", title: team.name, createdAt: team.createdAt, meta: team.status }));
  tasks.forEach((task) => baseItems.push({ type: "Task Assigned", title: task.title, createdAt: task.createdAt, meta: task.status }));
  files.forEach((file) => baseItems.push({ type: "File Uploaded", title: file.name, createdAt: file.createdAt, meta: file.oneDriveFolder || file.provider }));
  meetings.forEach((meeting) => baseItems.push({ type: "Meeting Scheduled", title: meeting.title, createdAt: meeting.createdAt, meta: meeting.joinUrl || meeting.microsoft?.joinUrl || "" }));
  emails.forEach((email) => baseItems.push({ type: "Email Sent", title: email.subject, createdAt: email.sentAt || email.receivedAt || email.createdAt, meta: email.from }));
  history.forEach((item) => baseItems.push({ type: item.actionType, title: item.title || project.projectName, createdAt: item.createdAt, meta: item.details }));

  return baseItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getWorkspaceActionUrlForRole(role = "", projectId = "") {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "TEAM_LEAD") {
    return `/modules/teamlead/dashboard/dashboard.html?projectId=${encodeURIComponent(String(projectId || ""))}`;
  }
  if (normalizedRole === "MEMBER") {
    return `/employee/projects?projectId=${encodeURIComponent(String(projectId || ""))}`;
  }
  return `/modules/manager/project-details/project-details.html?projectId=${encodeURIComponent(String(projectId || ""))}`;
}

async function addWorkHistory(payload) {
  if (!payload?.userId || !payload?.projectId) return null;
  return WorkHistory.create(payload);
}

async function dashboard(req, res) {
  const projects = await getManagerProjectsWithCounts(req.user);
  const projectIds = projects.map((project) => project._id);
  const teams = await getCanonicalTeamsForProjects(projectIds);
  const teamIds = teams.map((team) => team._id);
  const [tasks, files, meetings, notifications, emails] = await Promise.all([
    Task.find({ projectId: { $in: projectIds } }).lean(),
    File.find({ projectId: { $in: projectIds } }).lean(),
    Meeting.find({ teamId: { $in: teamIds } }).lean(),
    Notification.find({ $or: [{ userId: req.user._id }, { role: req.user.role }] }).sort({ createdAt: -1 }).limit(12).lean(),
    EmailRecord.find({ projectId: { $in: projectIds }, folder: "inbox" }).lean(),
  ]);

  const summary = {
    totalAssignedProjects: projects.length,
    activeProjects: projects.filter((project) => ["Assigned", "Active"].includes(project.status)).length,
    holdProjects: projects.filter((project) => project.status === "On Hold").length,
    completedProjects: projects.filter((project) => project.status === "Completed").length,
    teamMembers: Array.from(new Set(teams.flatMap((team) => team.memberIds || []).map(String))).length,
    pendingTasks: tasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length,
    completedTasks: tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length,
    upcomingMeetings: meetings.filter((meeting) => new Date(meeting.scheduledFor || meeting.startTime || 0) >= new Date()).length,
    filesUploaded: files.length,
    notifications: notifications.length,
    unreadEmails: emails.filter((email) => !email.metadata?.isRead).length,
    productivityPercentage: projects.length ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length) : 0,
    completionPercent: projects.length ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length) : 0,
  };

  res.json({
    success: true,
    data: {
      summary,
      recentActivity: notifications,
      deadlines: tasks
        .filter((task) => task.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 8),
      projects: projects.slice(0, 8),
      charts: {
        projectProgress: projects.map((project) => ({ label: project.projectName, value: Number(project.progress || 0) })),
        productivity: buildProductivityChart(tasks, teams),
      },
    },
  });
}

async function dashboardSummary(req, res) {
  const projects = await getManagerProjectsWithCounts(req.user);
  const projectIds = projects.map((project) => project._id);
  const teams = await getCanonicalTeamsForProjects(projectIds);
  const teamIds = teams.map((team) => team._id);
  const [tasks, files, meetings, emails] = await Promise.all([
    Task.find({ projectId: { $in: projectIds } }).lean(),
    File.find({ projectId: { $in: projectIds } }).lean(),
    Meeting.find({ teamId: { $in: teamIds } }).lean(),
    EmailRecord.find({ projectId: { $in: projectIds }, folder: "inbox" }).lean(),
  ]);

  res.json({
    success: true,
    data: {
      totalAssignedProjects: projects.length,
      activeProjects: projects.filter((project) => ["Assigned", "Active"].includes(project.status)).length,
      holdProjects: projects.filter((project) => project.status === "On Hold").length,
      completedProjects: projects.filter((project) => project.status === "Completed").length,
      teamMembers: Array.from(new Set(teams.flatMap((team) => team.memberIds || []).map(String))).length,
      pendingTasks: tasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length,
      completedTasks: tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length,
      upcomingMeetings: meetings.filter((meeting) => new Date(meeting.scheduledFor || meeting.startTime || 0) >= new Date()).length,
      filesUploaded: files.length,
      unreadEmails: emails.filter((email) => !email.metadata?.isRead).length,
      productivityPercentage: projects.length ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length) : 0,
      completionPercentage: projects.length ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length) : 0,
    },
  });
}

async function listNotifications(req, res) {
  const projectIds = (await Project.find(managerProjectFilter(req.user)).select("_id").lean()).map((item) => String(item._id));
  const filters = [{ userId: req.user._id }, { role: req.user.role }];

  if (projectIds.length) {
    filters.push({ entityType: "project", entityId: { $in: projectIds } });
  }

  const documents = await Notification.find({ $or: filters }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: documents });
}

async function listDailyUpdates(req, res) {
  const projects = await getManagerProjectsWithCounts(req.user);
  const projectIds = projects.map((project) => project._id);
  const tasks = await Task.find({ projectId: { $in: projectIds } })
    .select("_id title projectId projectName assigneeId assignee")
    .lean();
  const taskAssigneeIds = toObjectIdStrings(tasks.flatMap((task) => [task.assigneeId, ...(task.assigneeIds || []), ...(task.assignees || []).map((assignee) => assignee?.userId)]));
  const dailyUpdateScope = buildDailyUpdateScope(projects, tasks);

  const teams = await getCanonicalTeamsForProjects(projectIds);
  const memberIds = toObjectIdStrings(
    [
      ...getProjectMemberIds(projects),
      ...taskAssigneeIds,
      ...teams.flatMap((team) => [team.managerId, team.teamLeadId, ...(team.memberIds || [])]),
    ],
  ).filter((id) => id !== String(req.user._id));

  const memberUsers = memberIds.length
    ? await User.find({ _id: { $in: memberIds } }).select("name email role profilePhoto status department designation").lean()
    : [];
  const memberNames = memberUsers.map((member) => member.name).filter(Boolean);
  const memberActivityScope = memberIds.length || memberNames.length
    ? {
        $or: [
          ...(memberIds.length ? [{ userId: { $in: memberIds } }] : []),
          ...(memberNames.length ? [{ author: { $in: memberNames } }, { employee: { $in: memberNames } }, { userName: { $in: memberNames } }] : []),
        ],
      }
    : null;

  const updateQuery =
    dailyUpdateScope && memberActivityScope
      ? { $or: [dailyUpdateScope, memberActivityScope] }
      : dailyUpdateScope || memberActivityScope;

  if (!updateQuery) {
    return res.json({ success: true, data: [] });
  }

  const [updates, members] = await Promise.all([
    DailyUpdate.find(updateQuery).sort({ createdAt: -1 }).lean(),
    Promise.resolve(memberUsers),
  ]);

  const taskMap = new Map(tasks.map((task) => [String(task._id), task]));
  const projectMap = new Map(projects.map((project) => [String(project._id), project]));
  const memberById = new Map(members.map((member) => [String(member._id), member]));
  const memberByName = new Map(members.map((member) => [normalizeNameKey(member.name), member]));

  const data = updates.map((update) => {
    const task = taskMap.get(String(update.taskId || "")) || null;
    const member =
      memberById.get(String(update.userId || "")) ||
      memberByName.get(normalizeNameKey(update.author || update.employee || update.userName)) ||
      null;
    const resolvedProjectId = String(update.projectId || task?.projectId || "");
    const project = projectMap.get(resolvedProjectId) || null;

    return {
      ...update,
      memberId: String(member?._id || update.userId || ""),
      memberName: member?.name || update.author || update.employee || update.userName || "Unknown user",
      memberEmail: member?.email || "",
      memberRole: member?.role || update.role || "",
      memberDepartment: member?.department || "",
      memberDesignation: member?.designation || "",
      memberStatus: String(member?.status || "").toUpperCase() === "ON_HOLD" ? "On Hold" : "Active",
      profilePhoto: member?.profilePhoto || "",
      projectId: resolvedProjectId,
      projectName: update.projectName || task?.projectName || project?.projectName || "",
      taskTitle: update.taskTitle || task?.title || "",
      completion: Number(update.completion || 0),
      hoursWorked: Number(update.hoursWorked || update.hours || 0),
    };
  });

  res.json({ success: true, data });
}

async function listAttendance(req, res) {
  const projects = await getManagerProjectsWithCounts(req.user);
  const projectIds = projects.map((project) => project._id);
  const [teams, tasks] = await Promise.all([
    getCanonicalTeamsForProjects(projectIds),
    Task.find({ projectId: { $in: projectIds } }).select("assigneeId assigneeIds assignees projectId").lean(),
  ]);
  const taskAssigneeIds = toObjectIdStrings(tasks.flatMap((task) => [task.assigneeId, ...(task.assigneeIds || []), ...(task.assignees || []).map((assignee) => assignee?.userId)]));
  const memberIds = toObjectIdStrings(
    [
      ...getProjectMemberIds(projects),
      ...taskAssigneeIds,
      ...teams.flatMap((team) => [team.managerId, team.teamLeadId, ...(team.memberIds || [])]),
    ],
  ).filter((id) => id !== String(req.user._id));

  if (!memberIds.length) {
    return res.json({ success: true, data: [] });
  }

  const [records, legacyRecords, members] = await Promise.all([
    AttendanceRecord.find({ userId: { $in: memberIds } }).sort({ date: -1, createdAt: -1 }).limit(250).lean(),
    Attendance.find({ userId: { $in: memberIds } }).sort({ date: -1, createdAt: -1 }).limit(250).lean(),
    User.find({ _id: { $in: memberIds } }).select("name email role department designation profilePhoto status").lean(),
  ]);

  const projectByMemberId = new Map();
  projects.forEach((project) => {
    (project.teamMemberIds || []).forEach((memberId) => {
      const key = String(memberId);
      if (!projectByMemberId.has(key)) projectByMemberId.set(key, project);
    });
    (project.allocatedTeam || []).forEach((member) => {
      const key = String(member?.userId || "");
      if (key && !projectByMemberId.has(key)) projectByMemberId.set(key, project);
    });
  });
  tasks.forEach((task) => {
    const project = projects.find((item) => String(item._id) === String(task.projectId));
    [task.assigneeId, ...(task.assigneeIds || []), ...(task.assignees || []).map((assignee) => assignee?.userId)].filter(Boolean).forEach((memberId) => {
      const key = String(memberId);
      if (project && !projectByMemberId.has(key)) projectByMemberId.set(key, project);
    });
  });

  const memberById = new Map(members.map((member) => [String(member._id), member]));
  const seen = new Set();
  const data = [...records, ...legacyRecords]
    .filter((record) => {
      const key = String(record._id || `${record.userId}-${record.date}-${record.createdAt}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((record) => {
      const member = memberById.get(String(record.userId || "")) || {};
      const project = projectByMemberId.get(String(record.userId || "")) || {};
      return {
        ...record,
        memberId: String(member._id || record.userId || ""),
        userName: member.name || record.userName || record.employee || "Unknown user",
        employee: member.name || record.employee || record.userName || "Unknown user",
        memberEmail: member.email || "",
        department: member.department || record.department || project.department || "",
        designation: member.designation || record.role || member.role || "",
        profilePhoto: member.profilePhoto || "",
        projectId: String(project._id || record.projectId || ""),
        projectName: record.projectName || project.projectName || "Assigned project",
        checkInFormatted: formatTime(record.punchInAt || record.checkInAt),
        checkOutFormatted: formatTime(record.punchOutAt || record.checkOutAt),
        hours: Number(record.totalHours || record.effectiveHours || record.hours || 0),
      };
    });

  res.json({ success: true, data });
}

async function listHistory(req, res) {
  const projects = await Project.find(managerProjectFilter(req.user)).select("_id projectName clientName").lean();
  const projectIds = projects.map((item) => item._id);
  const projectMap = new Map(projects.map((project) => [String(project._id), project]));

  const history = await WorkHistory.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).limit(200).lean();
  const enriched = history.map((item) => ({
    ...item,
    projectName: projectMap.get(String(item.projectId))?.projectName || "",
    clientName: projectMap.get(String(item.projectId))?.clientName || "",
  }));

  res.json({ success: true, data: enriched });
}

async function addProjectMember(req, res) {
  if (!assertObjectId(req.params.id, res, "Project")) return;
  if (!assertObjectId(req.body.userId, res, "User")) return;
  const project = await Project.findOne({ _id: req.params.id, ...managerProjectFilter(req.user) });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const user = await User.findById(req.body.userId).select("name email role");
  if (!user) {
    return res.status(404).json({ success: false, message: "Selected user not found." });
  }

  const memberIds = Array.from(new Set([...(project.teamMemberIds || []).map(String), String(user._id)])).filter(Boolean);
  const { team } = await syncProjectTeamMembers(project, memberIds);

  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: "Member Added",
    title: user.name,
    details: `${user.name} added as ${req.body.role || user.role || "MEMBER"}.`,
  });

  await createNotification(
    {
      userId: user._id,
      title: "Added to project team",
      message: `${project.projectName} is now visible in your workspace.`,
      type: "PROJECT_MEMBER_ADDED",
      module: "manager",
      actionUrl: `/employee/projects?projectId=${encodeURIComponent(String(project._id))}`,
      entityType: "project",
      entityId: String(project._id),
    },
    req.app.get("io"),
  );

  res.status(201).json({ success: true, data: { projectId: project._id, member: user, teamId: team._id } });
}

async function removeProjectMember(req, res) {
  if (!assertObjectId(req.params.id, res, "Project")) return;
  if (!assertObjectId(req.params.userId, res, "User")) return;
  const project = await Project.findOne({ _id: req.params.id, ...managerProjectFilter(req.user) });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const memberId = String(req.params.userId || "");
  const user = await User.findById(memberId).select("name email role");
  const memberIds = (project.teamMemberIds || []).map(String).filter((id) => id !== memberId);
  await syncProjectTeamMembers(project, memberIds);

  await User.updateOne(
    { _id: memberId },
    {
      $set: {
        teamId: null,
        teamName: "",
        status: "ACTIVE",
      },
    },
  );

  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: "Member Removed",
    title: user?.name || "Member removed",
    details: `${user?.name || "Member"} removed from project delivery team.`,
    metadata: { memberId },
  });

  if (user?._id) {
    await createNotification(
      {
        userId: user._id,
        title: "Project access removed",
        message: `${project.projectName} access has been removed. Your history remains saved.`,
        type: "PROJECT_MEMBER_REMOVED",
        module: "manager",
        entityType: "project",
        entityId: String(project._id),
      },
      req.app.get("io"),
    );
  }

  res.json({ success: true, message: "Member removed successfully." });
}

async function replaceProjectMember(req, res) {
  if (!assertObjectId(req.params.id, res, "Project")) return;
  if (!assertObjectId(req.body.previousUserId, res, "Current member")) return;
  if (!assertObjectId(req.body.newUserId, res, "Replacement user")) return;
  const project = await Project.findOne({ _id: req.params.id, ...managerProjectFilter(req.user) });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const previousMemberId = String(req.body.previousUserId || "");
  const nextUser = await User.findById(req.body.newUserId).select("name email role");
  if (!nextUser) {
    return res.status(404).json({ success: false, message: "Replacement user not found." });
  }

  const memberIds = (project.teamMemberIds || []).map(String).filter((id) => id && id !== previousMemberId);
  memberIds.push(String(nextUser._id));
  await syncProjectTeamMembers(project, Array.from(new Set(memberIds)));

  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: "Member Replaced",
    title: nextUser.name,
    details: `${nextUser.name} replaced the previous project member.`,
  });

  await createNotification(
    {
      userId: nextUser._id,
      title: "You were added as a replacement member",
      message: `${project.projectName} collaboration history and files are now available to you.`,
      type: "PROJECT_MEMBER_REPLACED",
      module: "manager",
      actionUrl: `/employee/projects?projectId=${encodeURIComponent(String(project._id))}`,
      entityType: "project",
      entityId: String(project._id),
    },
    req.app.get("io"),
  );

  res.json({ success: true, data: { projectId: project._id, member: nextUser } });
}

async function moveProjectMember(req, res) {
  if (!assertObjectId(req.params.memberId, res, "Member")) return;
  if (!assertObjectId(req.body.sourceProjectId, res, "Source project")) return;
  if (!assertObjectId(req.body.targetProjectId, res, "Target project")) return;
  const sourceProject = await Project.findOne({ _id: req.body.sourceProjectId, ...managerProjectFilter(req.user) });
  const targetProject = await Project.findOne({ _id: req.body.targetProjectId, ...managerProjectFilter(req.user) });
  const member = await User.findById(req.params.memberId).select("name email role status");

  if (!sourceProject || !targetProject || !member) {
    return res.status(404).json({ success: false, message: "Source project, target project, or member was not found." });
  }

  const sourceMemberIds = (sourceProject.teamMemberIds || []).map(String).filter((id) => id !== String(member._id));
  const targetMemberIds = Array.from(new Set([...(targetProject.teamMemberIds || []).map(String), String(member._id)]));

  await syncProjectTeamMembers(sourceProject, sourceMemberIds);
  const { team: targetTeam } = await syncProjectTeamMembers(targetProject, targetMemberIds);

  await Task.updateMany(
    { projectId: sourceProject._id, assigneeId: member._id, status: { $nin: ["Completed", "Approved"] } },
    {
      $set: {
        assigneeId: null,
        assignee: "",
        assigneeEmail: "",
        status: "Pending",
      },
    },
  );

  await User.updateOne(
    { _id: member._id },
    {
      $set: {
        teamId: targetTeam?._id || null,
        teamName: targetTeam?.name || "",
        status: "ACTIVE",
      },
    },
  );

  await Promise.all([
    addWorkHistory({
      userId: req.user._id,
      projectId: sourceProject._id,
      actionType: "Member Shifted",
      title: member.name,
      details: `${member.name} moved from ${sourceProject.projectName} to ${targetProject.projectName}.`,
      metadata: { memberId: String(member._id), targetProjectId: String(targetProject._id) },
    }),
    addWorkHistory({
      userId: req.user._id,
      projectId: targetProject._id,
      actionType: "Member Shifted",
      title: member.name,
      details: `${member.name} joined ${targetProject.projectName} from ${sourceProject.projectName}.`,
      metadata: { memberId: String(member._id), sourceProjectId: String(sourceProject._id) },
    }),
  ]);

  await createNotification(
    {
      userId: member._id,
      title: "Project assignment updated",
      message: `You have been moved to ${targetProject.projectName}.`,
      type: "PROJECT_MEMBER_SHIFTED",
      module: "manager",
      actionUrl: `/modules/manager/member-profile/member-profile.html?memberId=${encodeURIComponent(String(member._id))}`,
      entityType: "project",
      entityId: String(targetProject._id),
    },
    req.app.get("io"),
  );

  res.json({
    success: true,
    message: "Member moved successfully.",
    data: {
      memberId: member._id,
      sourceProjectId: sourceProject._id,
      targetProjectId: targetProject._id,
    },
  });
}

async function holdProjectMember(req, res) {
  if (!assertObjectId(req.params.memberId, res, "Member")) return;
  if (!assertObjectId(req.body.projectId, res, "Project")) return;
  const member = await User.findById(req.params.memberId);
  const project = await Project.findOne({ _id: req.body.projectId, ...managerProjectFilter(req.user) });
  if (!member || !project) {
    return res.status(404).json({ success: false, message: "Member or project not found." });
  }

  member.status = "ON_HOLD";
  await member.save();

  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: "Member On Hold",
    title: member.name,
    details: req.body.reason || `${member.name} was placed on hold.`,
    metadata: { memberId: String(member._id), reason: req.body.reason || "" },
  });

  await createNotification(
    {
      userId: member._id,
      title: "Your project access is on hold",
      message: req.body.reason || `Your access for ${project.projectName} is temporarily limited.`,
      type: "PROJECT_MEMBER_ON_HOLD",
      module: "manager",
      actionUrl: `/modules/manager/member-profile/member-profile.html?memberId=${encodeURIComponent(String(member._id))}`,
      entityType: "project",
      entityId: String(project._id),
      metadata: { reason: req.body.reason || "" },
    },
    req.app.get("io"),
  );

  res.json({ success: true, message: "Member placed on hold successfully." });
}

function buildProductivityChart(tasks, teams) {
  const teamMemberNames = new Map();
  teams.forEach((team) => {
    (team.members || []).forEach((member) => {
      if (!teamMemberNames.has(member)) teamMemberNames.set(member, { label: member, assigned: 0, completed: 0 });
    });
  });
  tasks.forEach((task) => {
    const label = task.assignee || "Unassigned";
    const current = teamMemberNames.get(label) || { label, assigned: 0, completed: 0 };
    current.assigned += 1;
    if (["Completed", "Approved"].includes(task.status)) current.completed += 1;
    teamMemberNames.set(label, current);
  });
  return Array.from(teamMemberNames.values()).map((item) => ({
    label: item.label,
    value: item.assigned ? Math.round((item.completed / item.assigned) * 100) : 0,
  }));
}

async function listProjects(req, res) {
  const projects = await getManagerProjectsWithCounts(req.user);
  res.json({ success: true, data: projects });
}

async function getProject(req, res) {
  if (!assertObjectId(req.params.id, res, "Project")) return;
  const project = await Project.findOne({ _id: req.params.id, ...managerProjectFilter(req.user) }).lean();
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const detail = await buildProjectDetail(project, req.user);
  res.json({ success: true, data: detail });
}

async function listTeams(req, res) {
  const projects = await Project.find(managerProjectFilter(req.user)).select("_id").lean();
  const teams = await getCanonicalTeamsForProjects(projects.map((item) => item._id));
  res.json({ success: true, data: teams });
}

async function listMembers(req, res) {
  const projects = await getManagerProjectsWithCounts(req.user);
  const projectIds = projects.map((project) => project._id);
  const teams = await getCanonicalTeamsForProjects(projectIds);
  const memberIds = toObjectIdStrings(
    teams.flatMap((team) => [team.managerId, team.teamLeadId, ...(team.memberIds || [])]),
  ).filter((id) => id !== String(req.user._id));
  const tasks = await Task.find({ projectId: { $in: projectIds } }).lean();
  const dailyUpdateScope = buildDailyUpdateScope(projects, tasks);

  const [members, history, dailyUpdates, files] = await Promise.all([
    memberIds.length
      ? User.find({ _id: { $in: memberIds } }).select("name email role profilePhoto department designation phone status skills joiningDate").lean()
      : [],
    WorkHistory.find({ projectId: { $in: projectIds } }).lean(),
    dailyUpdateScope ? DailyUpdate.find(dailyUpdateScope).lean() : [],
    File.find({ projectId: { $in: projectIds } }).lean(),
  ]);

  const data = members.map((member) => {
    const assignedProjects = projects.filter((project) => (project.teamMemberIds || []).map(String).includes(String(member._id)));
    const taskMetrics = tasks.filter((task) => String(task.assigneeId || "") === String(member._id));
    const completedTasks = taskMetrics.filter((task) => ["Completed", "Approved"].includes(task.status)).length;
    const memberHistory = history.filter((item) => String(item.userId) === String(member._id));
    const memberUpdates = dailyUpdates.filter((item) => String(item.userId || "") === String(member._id) || String(item.author || item.employee || "") === String(member.name || ""));
    const memberFiles = files.filter((item) => String(item.uploadedBy || "") === String(member._id));
    const totalWorkingHours = memberHistory.reduce((sum, item) => sum + Number(item.hoursWorked || 0), 0);
    const productivityScore = taskMetrics.length ? Math.round((completedTasks / taskMetrics.length) * 100) : 0;
    const projectBuckets = buildMemberProjectBuckets(assignedProjects);

    return {
      ...member,
      assignedProjects: assignedProjects.map((project) => ({
        _id: project._id,
        projectName: project.projectName,
        clientName: project.clientName,
        status: project.status,
        priority: project.priority,
      })),
      assignedProjectsCount: assignedProjects.length,
      completedProjectsCount: projectBuckets.completedProjects.length,
      activeProjectsCount: projectBuckets.activeProjects.length,
      holdProjectsCount: projectBuckets.holdProjects.length,
      taskCompletionPercentage: productivityScore,
      productivityScore,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      lastDailyUpdateAt: memberUpdates[0]?.createdAt || null,
      totalDailyUpdates: memberUpdates.length,
      uploadedFilesCount: memberFiles.length,
      uploadedPhotosCount: memberFiles.filter((file) => String(file.mimeType || "").toLowerCase().startsWith("image/")).length,
      currentStatus: String(member.status || "").toUpperCase() === "ON_HOLD" ? "On Hold" : "Active",
    };
  });

  res.json({ success: true, data });
}

async function getMemberProfile(req, res) {
  if (!assertObjectId(req.params.memberId, res, "Member")) return;
  const member = await User.findById(req.params.memberId)
    .select("name email role profilePhoto department designation phone status skills joiningDate")
    .lean();
  if (!member) {
    return res.status(404).json({ success: false, message: "Member not found." });
  }

  const projects = await getManagerProjectsWithCounts(req.user);
  const assignedProjects = projects.filter((project) => (project.teamMemberIds || []).map(String).includes(String(member._id)));
  if (!assignedProjects.length) {
    return res.status(404).json({ success: false, message: "Member is not assigned to your managed projects." });
  }

  const projectIds = assignedProjects.map((project) => project._id);
  const tasks = await Task.find({ projectId: { $in: projectIds }, assigneeId: member._id }).sort({ createdAt: -1 }).lean();
  const dailyUpdateScope = buildDailyUpdateScope(assignedProjects, tasks);
  const [history, dailyUpdates, files] = await Promise.all([
    WorkHistory.find({ projectId: { $in: projectIds }, $or: [{ userId: member._id }, { "metadata.memberId": String(member._id) }] })
      .sort({ createdAt: -1 })
      .lean(),
    dailyUpdateScope
      ? DailyUpdate.find({
          $and: [
            dailyUpdateScope,
            { $or: [{ userId: member._id }, { author: member.name }, { employee: member.name }] },
          ],
        })
          .sort({ createdAt: -1 })
          .lean()
      : [],
    File.find({ projectId: { $in: projectIds }, uploadedBy: member._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const taskCompletionPercentage = tasks.length
    ? Math.round((tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length / tasks.length) * 100)
    : 0;
  const projectBuckets = buildMemberProjectBuckets(assignedProjects);
  const totalWorkingHours = history.reduce((sum, item) => sum + Number(item.hoursWorked || 0), 0);
  const autoReport = buildMemberAutoReport(member, assignedProjects, tasks, dailyUpdates, files, history);

  res.json({
    success: true,
    data: {
      ...member,
      currentStatus: String(member.status || "").toUpperCase() === "ON_HOLD" ? "On Hold" : "Active",
      assignedProjects: assignedProjects.map((project) => ({
        _id: project._id,
        projectName: project.projectName,
        clientName: project.clientName,
        status: project.status,
        priority: project.priority,
        progress: Number(project.progress || 0),
      })),
      projectHistory: projectBuckets,
      taskCompletionPercentage,
      productivityScore: taskCompletionPercentage,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      completedTasks: tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length,
      pendingTasks: tasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length,
      productivityTrend: buildProductivityTrend(history),
      dailyUpdates,
      uploadedFiles: files,
      uploadedPhotos: files.filter((file) => String(file.mimeType || "").toLowerCase().startsWith("image/")),
      autoReport,
      workHistory: history.slice(0, 50),
    },
  });
}

async function saveTeam(req, res) {
  if (!assertObjectId(req.body.projectId, res, "Project")) return;
  if (req.params.id && !assertObjectId(req.params.id, res, "Team")) return;
  const members = normalizeArray(req.body.memberIds);
  const invalidMemberIds = members.filter((id) => !isObjectId(id));
  if (invalidMemberIds.length) {
    return rejectInvalidObjectId(res, "Team member");
  }
  const project = await Project.findOne({ _id: req.body.projectId, ...managerProjectFilter(req.user) });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found for this manager." });
  }

  const hadExistingTeam = Boolean(
    req.params.id
      ? await Team.exists({ _id: req.params.id })
      : await Team.exists({ projectId: project._id }),
  );
  let team = req.params.id
    ? await Team.findById(req.params.id)
    : await Team.findOne({ projectId: project._id }).sort({ updatedAt: -1, createdAt: -1 });
  if (team && String(team.projectId || "") !== String(project._id)) {
    return res.status(400).json({ success: false, message: "Team does not belong to the selected project." });
  }

  const { team: syncedTeam, memberUsers } = await syncProjectTeamMembers(project, members);
  team = syncedTeam;
  const selectedTeamLead = memberUsers.find((user) => String(user.role || "").toUpperCase() === "TEAM_LEAD") || null;
  team.name = req.body.name || team.name || `${project.projectName} Team`;
  team.description = req.body.description || "";
  team.projectId = project._id;
  team.projectName = project.projectName;
  team.managerId = req.user._id;
  team.manager = req.user.name;
  team.teamLeadId = selectedTeamLead?._id || null;
  team.teamLead = selectedTeamLead?.name || "";
  team.department = req.body.department || project.department || "";
  team.memberIds = memberUsers.map((user) => user._id);
  team.members = memberUsers.map((user) => user.name);
  team.status = req.body.status || team.status || "Active";
  team.notes = req.body.notes || "";
  if (!team.createdBy) {
    team.createdBy = req.user._id;
  }

  if (!team.collaboration?.oneDriveFolder) {
    try {
      const workspace = await ensureOneDriveFolder(project.microsoft?.oneDriveFolder || `${project.clientName || "Client"}/${project.projectName}`);
      team.collaboration = {
        ...(team.collaboration || {}),
        oneDriveFolder: workspace.folderPath,
        oneDriveFolderId: workspace.folderId,
        oneDriveShareUrl: workspace.shareUrl,
        teamsWebUrl: project.teamsWebUrl || team.collaboration?.teamsWebUrl || "",
      };
    } catch (error) {
      team.collaboration = {
        ...(team.collaboration || {}),
        teamsWebUrl: project.teamsWebUrl || team.collaboration?.teamsWebUrl || "",
      };
      project.microsoft = project.microsoft || {};
      project.microsoft.graphSyncStatus = "Warning";
      project.workspaceStatus = "Assigned workspace pending sync";
    }
  }

  await team.save();
  project.projectTeamName = team.name;
  project.teamLeadId = selectedTeamLead?._id || null;
  project.teamLead = selectedTeamLead?.name || "";
  project.teamLeadEmail = selectedTeamLead?.email || "";
  project.teamMemberIds = memberUsers.map((user) => user._id);
  project.teamMembers = memberUsers.map((user) => user.name);
  await project.save();
  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: hadExistingTeam ? "Members Updated" : "Team Created",
    title: team.name,
    details: `${memberUsers.length} members configured by manager.`,
  });

  const io = req.app.get("io");
  const emailJobs = [];
  await Promise.all(memberUsers.map(async (user) => {
    const actionUrl = getWorkspaceActionUrlForRole(user.role, project._id);
    await createNotification(
      {
        userId: user._id,
        title: hadExistingTeam ? "Team assignment updated" : "You were added to a team",
        message: `Manager ${req.user.name} assigned you to ${team.name} for project ${project.projectName}.`,
        type: hadExistingTeam ? "TEAM_UPDATED" : "TEAM_ASSIGNED",
        module: "manager",
        priority: "medium",
        actionUrl,
        entityType: "project",
        entityId: String(project._id),
        metadata: {
          teamId: String(team._id),
          teamName: team.name,
          projectName: project.projectName,
          managerName: req.user.name,
        },
      },
      io,
    );

    if (user.email) {
      emailJobs.push(
        sendEmail({
          to: user.email,
          subject: hadExistingTeam ? `Team updated: ${team.name}` : `New team assigned: ${team.name}`,
          template: "generic",
          variables: {
            title: hadExistingTeam ? "Your team assignment was updated" : "You have been assigned to a new team",
            name: user.name,
            teamName: team.name,
            projectName: project.projectName,
            managerName: req.user.name,
            memberRole: user.role,
            actionLabel: "Open Workspace",
            actionUrl: normalizeActionUrl(actionUrl),
          },
          relatedModule: "manager",
          relatedEntityType: "project",
          relatedEntityId: project._id,
          metadata: {
            teamId: String(team._id),
            teamName: team.name,
            projectName: project.projectName,
            recipientUserId: String(user._id),
          },
        }),
      );
    }
  }));

  if (emailJobs.length) {
    Promise.allSettled(emailJobs).catch(() => {});
  }

  await createNotification(
    {
      userId: req.user._id,
      title: hadExistingTeam ? "Team updated successfully" : "Team created successfully",
      message: `${team.name} is now linked to ${project.projectName} with ${memberUsers.length} members.`,
      type: hadExistingTeam ? "TEAM_UPDATED" : "TEAM_CREATED",
      module: "manager",
      priority: "medium",
      actionUrl: `/modules/manager/project-details/project-details.html?projectId=${encodeURIComponent(String(project._id))}`,
      entityType: "project",
      entityId: String(project._id),
      metadata: {
        teamId: String(team._id),
        teamName: team.name,
      },
    },
    io,
  );

  res.status(hadExistingTeam ? 200 : 201).json({
    success: true,
    message: hadExistingTeam ? "Team updated successfully." : "Team created successfully.",
    data: team,
  });
}

async function listTasks(req, res) {
  const projects = await Project.find(managerProjectFilter(req.user)).select("_id").lean();
  const query = { projectId: { $in: projects.map((item) => item._id) } };
  if (req.query.projectId && !assertObjectId(req.query.projectId, res, "Project")) return;
  if (req.query.projectId) query.projectId = req.query.projectId;
  const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: tasks });
}

async function saveTask(req, res) {
  if (!assertObjectId(req.body.projectId, res, "Project")) return;
  if (req.params.id && !assertObjectId(req.params.id, res, "Task")) return;
  if (req.body.assigneeId && !assertObjectId(req.body.assigneeId, res, "Assignee")) return;
  if (req.body.assigneeIds && Array.isArray(req.body.assigneeIds)) {
    for (const id of req.body.assigneeIds) {
      if (id && !assertObjectId(id, res, "Assignee List User")) return;
    }
  }
  const project = await Project.findOne({ _id: req.body.projectId, ...managerProjectFilter(req.user) });
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found for this manager." });
  }

  let task = req.params.id ? await Task.findById(req.params.id) : null;

  // Resolve multiple assignees details
  let assigneeIds = [];
  if (Array.isArray(req.body.assigneeIds)) {
    assigneeIds = req.body.assigneeIds.map(id => String(id)).filter(Boolean);
  } else if (req.body.assigneeId) {
    assigneeIds = [String(req.body.assigneeId)];
  }

  let assigneesData = [];
  if (assigneeIds.length > 0) {
    const users = await User.find({ _id: { $in: assigneeIds } }).select("name email profilePhoto");
    assigneesData = users.map(u => ({
      userId: u._id,
      name: u.name,
      email: u.email,
      profilePhoto: u.profilePhoto || ""
    }));
  }

  const primaryAssignee = assigneesData[0] || null;

  // Start & End Date logic
  const statusVal = req.body.status || "Pending";
  let startDate = req.body.startDate ? new Date(req.body.startDate) : (task?.startDate || null);
  if (["In Progress", "Active"].includes(statusVal) && !startDate) {
    startDate = new Date();
  }
  let endDate = req.body.endDate ? new Date(req.body.endDate) : (task?.endDate || null);
  if (["Done", "Completed", "Approved"].includes(statusVal) && !endDate) {
    endDate = new Date();
  }

  const payload = {
    projectId: project._id,
    projectName: project.projectName,
    title: req.body.title,
    description: req.body.description || "",
    priority: req.body.priority || "Medium",
    status: statusVal,
    deadline: req.body.dueDate || req.body.deadline || null,
    progress: Number(req.body.progress || 0),
    department: project.department || "",
    managerId: req.user._id,
    manager: req.user.name,
    managerEmail: req.user.email,
    assigneeId: primaryAssignee?.userId || null,
    assignee: primaryAssignee?.name || req.body.assignee || "",
    assigneeEmail: primaryAssignee?.email || "",
    assigneeIds: assigneeIds,
    assignees: assigneesData,
    createdById: task ? (task.createdById || req.user._id) : req.user._id,
    createdBy: task ? (task.createdBy || req.user.name) : req.user.name,
    estimatedHours: Number(req.body.estimatedHours || 0),
    actualHours: Number(req.body.actualHours || 0),
    startDate: startDate,
    endDate: endDate,
    milestone: req.body.milestone || "",
    dependencies: Array.isArray(req.body.dependencies) ? req.body.dependencies.filter(Boolean) : [],
    attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
    metadata: {
      startDate: startDate,
      estimatedHours: Number(req.body.estimatedHours || 0),
      actualHours: Number(req.body.actualHours || 0),
      comments: normalizeArray(req.body.comments),
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
    },
  };

  try {
    if (task) {
      Object.assign(task, payload);
      await task.save();
    } else {
      task = await Task.create(payload);
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: task.status === "Completed" || task.status === "Done" ? "Task Completed" : "Task Assigned",
    title: task.title,
    details: `${task.assignee || "Unassigned"} • ${task.status}`,
    hoursWorked: Number(req.body.actualHours || 0),
  });

  await createNotification(
    {
      userId: req.user._id,
      title: req.params.id ? "Task updated" : "New task assigned",
      message: `${task.title} is ${task.status}.`,
      type: "TASK_EVENT",
      module: "manager",
      actionUrl: `/modules/manager/project-details/project-details.html?projectId=${project._id}`,
      entityType: "project",
      entityId: String(project._id),
    },
    req.app.get("io"),
  );

  if (assigneesData.length) {
    const io = req.app.get("io");
    await Promise.all(
      assigneesData.map((assignee) =>
        createNotification(
          {
            userId: assignee.userId,
            title: req.params.id ? "Task updated" : "New task assigned",
            message: `${task.title} is assigned to you in ${project.projectName}.`,
            type: "TASK_ASSIGNED",
            module: "employee",
            priority: task.priority === "Critical" || task.priority === "High" ? "high" : "medium",
            actionUrl: `/employee/task-detail?id=${encodeURIComponent(String(task._id))}`,
            entityType: "task",
            entityId: String(task._id),
            metadata: {
              projectId: String(project._id),
              projectName: project.projectName,
              taskTitle: task.title,
              managerName: req.user.name,
            },
          },
          io,
        ),
      ),
    );
    if (io) {
      assigneesData.forEach((assignee) => {
        io.to(`user_${assignee.userId}`).emit(req.params.id ? "task_updated" : "task_assigned", task.toObject ? task.toObject() : task);
      });
    }
  }

  res.status(req.params.id ? 200 : 201).json({ success: true, data: task });
}

async function deleteTask(req, res) {
  if (!assertObjectId(req.params.id, res, "Task")) return;
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found." });
  }

  const project = await Project.findOne({ _id: task.projectId, ...managerProjectFilter(req.user) });
  if (!project) {
    return res.status(403).json({ success: false, message: "You cannot delete this task." });
  }

  await Task.deleteOne({ _id: task._id });
  res.json({ success: true, message: "Task deleted successfully." });
}

async function listFiles(req, res) {
  if (!assertObjectId(req.params.projectId, res, "Project")) return;
  const project = await Project.findOne({ _id: req.params.projectId, ...managerProjectFilter(req.user) }).lean();
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const teams = await getCanonicalTeamsForProjects([project._id]);
  const teamIds = teams.map((team) => team._id);
  const files = await File.find({
    $or: [
      { projectId: project._id },
      ...(teamIds.length ? [{ teamId: { $in: teamIds } }] : []),
    ],
  }).sort({ createdAt: -1 }).lean();
  const cloudFiles = await listOneDriveFiles(project.microsoft?.oneDriveFolder || `${project.clientName || "Client"}/${project.projectName}`);
  res.json({ success: true, data: { files, cloudFiles, folderPath: project.microsoft?.oneDriveFolder || "" } });
}

async function listMeetings(req, res) {
  if (!assertObjectId(req.params.projectId, res, "Project")) return;
  const project = await Project.findOne({ _id: req.params.projectId, ...managerProjectFilter(req.user) }).lean();
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const teams = await getCanonicalTeamsForProjects([project._id]);
  const meetings = await Meeting.find({ teamId: { $in: teams.map((team) => team._id) } }).sort({ scheduledFor: 1 }).lean();
  res.json({ success: true, data: meetings });
}

async function listReports(req, res) {
  if (!assertObjectId(req.params.projectId, res, "Project")) return;
  const project = await Project.findOne({ _id: req.params.projectId, ...managerProjectFilter(req.user) }).lean();
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const detail = await buildProjectDetail(project, req.user);
  const summary = {
    projectName: project.projectName,
    projectProgress: Number(project.progress || 0),
    taskCompletionReport: {
      total: detail.tasks.length,
      completed: detail.tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length,
      pending: detail.tasks.filter((task) => !["Completed", "Approved"].includes(task.status)).length,
    },
    teamProductivityReport: detail.teamMembers.map((member) => ({
      memberName: member.name,
      performanceScore: member.performanceScore,
      hoursWorked: member.hoursWorked,
      completedTasks: member.completedTasks,
    })),
    meetingAttendanceReport: detail.meetings.map((meeting) => ({
      title: meeting.title,
      participants: meeting.participants?.length || 0,
      scheduledFor: meeting.scheduledFor || meeting.startTime,
    })),
    fileActivityReport: {
      totalFiles: detail.files.length,
      latestUploads: detail.files.slice(0, 5),
    },
  };

  const report = await Report.create({
    title: `${project.projectName} progress report`,
    projectId: String(project._id),
    projectName: project.projectName,
    owner: req.user.name,
    createdByRole: req.user.role,
    metadata: summary,
    status: "GENERATED",
  });

  res.json({ success: true, data: { reportId: report._id, ...summary } });
}

async function deleteFile(req, res) {
  if (!assertObjectId(req.params.fileId, res, "File")) return;
  const file = await File.findById(req.params.fileId);
  if (!file) {
    return res.status(404).json({ success: false, message: "File not found." });
  }

  const project = await Project.findOne({ _id: file.projectId, ...managerProjectFilter(req.user) });
  if (!project) {
    return res.status(403).json({ success: false, message: "You cannot delete this file." });
  }

  await File.deleteOne({ _id: file._id });
  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: "File Deleted",
    title: file.name,
    details: "File removed from CRM metadata list.",
  });

  res.json({ success: true, message: "File deleted successfully." });
}

async function cancelMeeting(req, res) {
  if (!assertObjectId(req.params.meetingId, res, "Meeting")) return;
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) {
    return res.status(404).json({ success: false, message: "Meeting not found." });
  }

  const team = meeting.teamId ? await Team.findById(meeting.teamId).lean() : null;
  const projectId = team?.projectId || req.body.projectId || null;
  if (projectId && !assertObjectId(projectId, res, "Project")) return;
  const project = projectId ? await Project.findOne({ _id: projectId, ...managerProjectFilter(req.user) }) : null;
  if (!project) {
    return res.status(403).json({ success: false, message: "You cannot cancel this meeting." });
  }

  meeting.status = "ENDED";
  meeting.notes = `${meeting.notes || ""}\nMeeting cancelled by manager.`.trim();
  meeting.endedAt = new Date();
  await meeting.save();

  await addWorkHistory({
    userId: req.user._id,
    projectId: project._id,
    actionType: "Meeting Cancelled",
    title: meeting.title,
    details: "Meeting status changed to ended/cancelled.",
  });

  res.json({ success: true, message: "Meeting cancelled successfully.", data: meeting });
}

module.exports = {
  addProjectMember,
  cancelMeeting,
  dashboard,
  dashboardSummary,
  deleteTask,
  deleteFile,
  getProject,
  getMemberProfile,
  listDailyUpdates,
  listAttendance,
  listHistory,
  listFiles,
  listMembers,
  listMeetings,
  listNotifications,
  listProjects,
  listReports,
  listTasks,
  listTeams,
  holdProjectMember,
  moveProjectMember,
  removeProjectMember,
  replaceProjectMember,
  saveTask,
  saveTeam,
};
