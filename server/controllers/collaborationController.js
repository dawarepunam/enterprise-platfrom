const multer = require("multer");
const Team = require("../models/Team");
const Channel = require("../models/Channel");
const Message = require("../models/Message");
const File = require("../models/File");
const Meeting = require("../models/Meeting");
const User = require("../models/User");
const Project = require("../models/Project");
const { getUploadConfig } = require("../config/multer");
const { ensureTeamRoom, assertTeamAccess, getAccessibleTeams } = require("../utils/teamAccess");
const { ensureCollaborationFolder, uploadCollaborationFile } = require("../services/oneDriveService");
const { provisionTeamWorkspace, postMicrosoftChannelMessage } = require("../services/teamsService");
const { scheduleChannelMeeting } = require("../services/meetingService");
const { getMicrosoftConnectionStatus, getMicrosoftConfig } = require("../services/microsoftGraphService");

const uploadMiddleware = multer(getUploadConfig()).single("file");

function normalizeObjectId(value) {
  return value ? String(value) : "";
}

function dedupeObjectIds(values = []) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

function normalizeTeamMembers(team, users = []) {
  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const memberIds = dedupeObjectIds([team.managerId, team.teamLeadId, ...(team.memberIds || [])]);

  return memberIds
    .map((id) => {
      const user = userMap.get(String(id));
      if (!user) return null;
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "",
      };
    })
    .filter(Boolean);
}

async function serializeTeam(team) {
  const room = await ensureTeamRoom(team, { _id: team.createdBy, role: "ADMIN" });
  const channels = await Channel.find({ teamId: team._id }).sort({ createdAt: 1 }).lean();
  const members = await User.find({
    _id: { $in: dedupeObjectIds([team.managerId, team.teamLeadId, ...(team.memberIds || [])]) },
  }).select("name email role department profilePhoto");
  const filesShared = await File.countDocuments({ teamId: team._id });
  const upcomingMeetings = await Meeting.countDocuments({ teamId: team._id, status: "SCHEDULED" });
  const unreadMessages = await Message.countDocuments({ teamId: team._id });

  return {
    _id: team._id,
    name: team.name,
    description: team.description || team.notes || "",
    projectId: team.projectId || null,
    projectName: team.projectName || "",
    department: team.department || "",
    roomId: room.roomId,
    members: normalizeTeamMembers(team, members),
    memberCount: members.length,
    channels,
    status: team.status,
    createdAt: team.createdAt,
    microsoftTeamId: team.collaboration?.microsoftTeamId || "",
    teamsWebUrl: team.collaboration?.teamsWebUrl || "",
    oneDriveFolder: team.collaboration?.oneDriveFolder || "",
    oneDriveShareUrl: team.collaboration?.oneDriveShareUrl || "",
    stats: {
      filesShared,
      upcomingMeetings,
      unreadMessages,
    },
  };
}

async function listTeams(req, res) {
  const teams = await getAccessibleTeams(req.user);
  const serialized = [];
  for (const team of teams) {
    serialized.push(await serializeTeam(team));
  }
  res.json({ success: true, data: serialized });
}

async function getTeamById(req, res) {
  const team = await assertTeamAccess(req.user, req.params.id);
  const payload = await serializeTeam(team);
  const files = await File.find({ teamId: team._id }).sort({ createdAt: -1 }).limit(20).lean();
  const meetings = await Meeting.find({ teamId: team._id }).sort({ startTime: 1, scheduledFor: 1 }).limit(10).lean();
  const recentMessages = await Message.find({ teamId: team._id }).sort({ createdAt: -1 }).limit(30).lean();

  res.json({
    success: true,
    data: {
      ...payload,
      files,
      meetings,
      recentMessages,
    },
  });
}

async function createTeam(req, res) {
  const memberIds = dedupeObjectIds(req.body.memberIds || req.body.members || []);
  const users = memberIds.length
    ? await User.find({ _id: { $in: memberIds } }).select("name email role department")
    : [];
  const project = req.body.projectId ? await Project.findById(req.body.projectId) : null;

  const manager = users.find((user) => String(user.role) === "MANAGER") || null;
  const teamLead = users.find((user) => String(user.role) === "TEAM_LEAD") || null;
  const members = users.filter((user) => !["MANAGER", "TEAM_LEAD"].includes(String(user.role)));

  const teamName = (req.body.name || (project?.projectName ? project.projectName + ' Team' : '') || 'New Team').trim();
  const team = await Team.create({
    name: teamName,
    description: req.body.description || "",
    projectId: project?._id || req.body.projectId || null,
    projectName: project?.projectName || req.body.projectName || teamName,
    department: req.body.department || project?.department || "",
    managerId: req.body.managerId || manager?._id || req.user._id || null,
    manager: req.body.manager || manager?.name || req.user.name || "",
    teamLeadId: req.body.teamLeadId || teamLead?._id || null,
    teamLead: req.body.teamLead || teamLead?.name || "",
    memberIds: dedupeObjectIds([
      ...(req.body.memberIds || []),
    ]),
    members: users.map((user) => user.name),
    createdBy: req.user._id,
    notes: req.body.notes || "",
    status: req.body.status || "Active",
  });

  const room = await ensureTeamRoom(team, req.user);
  let workspace = { folderPath: "", folderId: "", shareUrl: "", webUrl: "" };
  try {
    workspace = await ensureCollaborationFolder({
      projectId: team.projectId,
      teamId: team._id,
      clientName: req.body.clientName || project?.clientName,
      projectName: team.projectName || team.name,
    });
  } catch(error) {
    console.error("OneDrive setup failed:", error.message);
  }

  team.collaboration = {
    ...(team.collaboration?.toObject?.() || team.collaboration || {}),
    oneDriveFolder: workspace.folderPath || "",
    oneDriveFolderId: workspace.folderId || "",
    oneDriveShareUrl: workspace.shareUrl || workspace.webUrl || "",
  };
  await team.save();

  let channels = [];
  try {
    const provisionResult = await provisionTeamWorkspace(team, req.user);
    channels = provisionResult.channels || [];
  } catch (error) {
    console.error("Teams setup failed:", error.message);
  }
  const generalChannel = channels.find((channel) => channel.name === "General") || channels[0];
  const welcomeText =
    req.body.welcomeMessage ||
    "Welcome to the project team.\nAll project files are available in OneDrive.\nKickoff meeting has been scheduled.";

  let welcomeMessage;
  try {
    welcomeMessage = await Message.create({
      roomId: room.roomId,
      teamId: team._id,
      channelId: generalChannel?._id || null,
      senderId: req.user._id,
      senderName: req.user.name || 'Manager',
      senderRole: req.user.role || 'MANAGER',
      messageType: "SYSTEM",
      text: welcomeText,
      readBy: [req.user._id],
      participants: dedupeObjectIds([team.managerId, team.teamLeadId, ...(team.memberIds || [])]),
    });
  } catch(msgErr) {
    // Non-critical - continue without welcome message
    welcomeMessage = null;
  }

  let microsoftMessageId = "";
  try {
    const graphPost = await postMicrosoftChannelMessage(team, generalChannel, welcomeText);
    microsoftMessageId = graphPost.messageId || "";
  } catch (error) {
    microsoftMessageId = "";
  }

  if (microsoftMessageId && welcomeMessage) {
    welcomeMessage.metadata = {
      ...(welcomeMessage.metadata || {}),
      microsoftMessageId,
    };
    await welcomeMessage.save();
  }

  const data = await serializeTeam(team);
  res.status(201).json({
    success: true,
    message: "Team collaboration workspace created successfully.",
    data,
  });
}

async function updateTeam(req, res) {
  const team = await assertTeamAccess(req.user, req.params.id);
  const memberIds = req.body.memberIds ? dedupeObjectIds(req.body.memberIds) : null;

  if (typeof req.body.name === "string") team.name = req.body.name.trim();
  if (typeof req.body.description === "string") team.description = req.body.description.trim();
  if (typeof req.body.department === "string") team.department = req.body.department.trim();
  if (typeof req.body.status === "string") team.status = req.body.status;
  if (typeof req.body.notes === "string") team.notes = req.body.notes.trim();
  if (req.body.projectId !== undefined) team.projectId = req.body.projectId || null;
  if (typeof req.body.projectName === "string") team.projectName = req.body.projectName.trim();
  if (req.body.managerId !== undefined) team.managerId = req.body.managerId || null;
  if (typeof req.body.manager === "string") team.manager = req.body.manager.trim();
  if (req.body.teamLeadId !== undefined) team.teamLeadId = req.body.teamLeadId || null;
  if (typeof req.body.teamLead === "string") team.teamLead = req.body.teamLead.trim();

  if (memberIds) {
    const users = await User.find({ _id: { $in: memberIds } }).select("name");
    team.memberIds = memberIds;
    team.members = users.map((user) => user.name);
  }

  await team.save();
  await ensureTeamRoom(team, req.user);
  await provisionTeamWorkspace(team, req.user);

  res.json({
    success: true,
    message: "Team updated successfully.",
    data: await serializeTeam(team),
  });
}

async function deleteTeam(req, res) {
  const team = await assertTeamAccess(req.user, req.params.id);
  await Channel.deleteMany({ teamId: team._id });
  await Message.deleteMany({ teamId: team._id });
  await File.deleteMany({ teamId: team._id });
  await Meeting.deleteMany({ teamId: team._id });
  await Team.deleteOne({ _id: team._id });
  res.json({ success: true, message: "Team deleted successfully." });
}

async function addTeamMember(req, res) {
  const team = await assertTeamAccess(req.user, req.params.id);
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });
  
  const user = await User.findById(employeeId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const currentMemberIds = (team.memberIds || []).map(String);
  if (!currentMemberIds.includes(String(user._id))) {
    team.memberIds = [...currentMemberIds, user._id];
    team.members = [...(team.members || []), user.name];
    await team.save();
    await ensureTeamRoom(team, req.user);
    await provisionTeamWorkspace(team, req.user);
  }
  
  res.status(201).json({ success: true, message: "Member added successfully", data: await serializeTeam(team) });
}

async function createChannel(req, res) {
  const team = await assertTeamAccess(req.user, req.body.teamId);
  const existing = await Channel.findOne({ teamId: team._id, name: req.body.name });
  if (existing) {
    return res.status(400).json({ success: false, message: "Channel already exists in this team." });
  }

  const { createMicrosoftChannel } = require("../services/teamsService");
  const graphChannel = await createMicrosoftChannel(team.collaboration?.microsoftTeamId, req.body.name, req.body.description);
  const channel = await Channel.create({
    teamId: team._id,
    name: req.body.name,
    description: req.body.description || "",
    microsoftChannelId: graphChannel.microsoftChannelId,
    teamsWebUrl: graphChannel.teamsWebUrl,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: channel });
}

async function getChannelsByTeam(req, res) {
  await assertTeamAccess(req.user, req.params.teamId);
  const channels = await Channel.find({ teamId: req.params.teamId }).sort({ createdAt: 1 });
  res.json({ success: true, data: channels });
}

async function createMessage(req, res) {
  const team = await assertTeamAccess(req.user, req.body.teamId);
  const channel = req.body.channelId ? await Channel.findById(req.body.channelId) : null;
  const room = await ensureTeamRoom(team, req.user);
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const googleMapsUrl = hasLocation ? `https://maps.google.com/?q=${latitude},${longitude}` : "";

  const message = await Message.create({
    roomId: room.roomId,
    teamId: team._id,
    channelId: channel?._id || null,
    senderId: req.user._id,
    senderName: req.user.name,
    senderRole: req.user.role,
    messageType: req.body.messageType || (hasLocation ? "LOCATION" : "TEXT"),
    text: req.body.text || "",
    fileName: req.body.fileName || "",
    fileUrl: req.body.fileUrl || "",
    fileSize: Number(req.body.fileSize || 0),
    mimeType: req.body.fileType || req.body.mimeType || "",
    oneDriveShareUrl: req.body.oneDriveShareUrl || "",
    readBy: [req.user._id],
    location: {
      latitude: hasLocation ? latitude : null,
      longitude: hasLocation ? longitude : null,
      label: req.body.locationLabel || "",
    },
    metadata: {
      fileCategory: req.body.fileCategory || "",
      voiceDurationSeconds: Number(req.body.voiceDurationSeconds || 0),
      codeLanguage: req.body.codeLanguage || "",
      googleMapsUrl,
    },
    participants: dedupeObjectIds([team.managerId, team.teamLeadId, ...(team.memberIds || [])]),
  });

  const io = req.app.get("io");
  if (io) {
    io.to(room.roomId).emit("chat:message", {
      ...message.toObject(),
      createdAt: message.createdAt,
    });
  }

  res.status(201).json({ success: true, data: message });
}

async function getMessagesByChannel(req, res) {
  const channel = await Channel.findById(req.params.channelId);
  if (!channel) {
    return res.status(404).json({ success: false, message: "Channel not found." });
  }

  await assertTeamAccess(req.user, channel.teamId);
  const messages = await Message.find({ channelId: channel._id }).sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: messages });
}

async function uploadTeamFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please attach a file." });
  }

  const team = await assertTeamAccess(req.user, req.body.teamId);
  const channel = req.body.channelId ? await Channel.findById(req.body.channelId) : null;
  const upload = await uploadCollaborationFile({
    buffer: req.file.buffer,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    teamId: team._id,
    projectId: team.projectId,
    clientName: req.body.clientName,
    projectName: team.projectName || team.name,
  });

  const room = await ensureTeamRoom(team, req.user);
  const fileRecord = await File.create({
    teamId: team._id,
    channelId: channel?._id || null,
    projectId: team.projectId || null,
    roomId: room.roomId,
    uploadedBy: req.user._id,
    uploadedByName: req.user.name,
    name: upload.fileName || req.file.originalname,
    url: upload.shareUrl || upload.webUrl || "",
    mimeType: req.file.mimetype,
    size: upload.size || req.file.size,
    module: "teams-collaboration",
    entityType: "team",
    entityId: String(team._id),
    provider: upload.provider,
    oneDriveFolder: upload.folderPath || "",
    oneDriveItemId: upload.fileId || "",
    oneDriveShareUrl: upload.shareUrl || upload.webUrl || "",
    metadata: {
      originalName: req.file.originalname,
      connected: upload.connected,
    },
  });

  const message = await Message.create({
    roomId: room.roomId,
    teamId: team._id,
    channelId: channel?._id || null,
    senderId: req.user._id,
    senderName: req.user.name,
    senderRole: req.user.role,
    messageType: req.body.messageType || "FILE",
    text: req.body.caption || `${req.user.name} shared ${fileRecord.name}`,
    fileName: fileRecord.name,
    fileUrl: fileRecord.url,
    fileSize: fileRecord.size,
    mimeType: fileRecord.mimeType,
    oneDriveShareUrl: fileRecord.oneDriveShareUrl,
    readBy: [req.user._id],
    metadata: {
      fileCategory: req.body.fileCategory || "",
    },
    participants: dedupeObjectIds([team.managerId, team.teamLeadId, ...(team.memberIds || [])]),
  });

  fileRecord.messageId = message._id;
  await fileRecord.save();

  const io = req.app.get("io");
  if (io) {
    io.to(room.roomId).emit("chat:file", { message, file: fileRecord });
    io.to(room.roomId).emit("chat:message", message.toObject());
  }

  res.status(201).json({
    success: true,
    message: "File uploaded successfully.",
    data: {
      file: fileRecord,
      message,
    },
  });
}

async function createMeeting(req, res) {
  const team = await assertTeamAccess(req.user, req.body.teamId);
  const channel = req.body.channelId ? await Channel.findById(req.body.channelId) : null;
  const participantIds = dedupeObjectIds(req.body.participantIds || [team.managerId, team.teamLeadId, ...(team.memberIds || [])]);
  const startTime = req.body.startTime || new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const endTime = req.body.endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

  const { meeting, graphMeeting } = await scheduleChannelMeeting({
    team,
    channel,
    createdBy: req.user,
    title: req.body.title || `${team.name} Meeting`,
    description: req.body.description || "Scheduled from CRM collaboration module.",
    startTime,
    endTime,
    participantIds,
  });

  res.status(201).json({
    success: true,
    message: "Meeting scheduled successfully.",
    data: {
      meeting,
      joinUrl: graphMeeting.joinUrl,
    },
  });
}

async function getMeetingsByTeam(req, res) {
  await assertTeamAccess(req.user, req.params.teamId);
  const meetings = await Meeting.find({ teamId: req.params.teamId }).sort({ startTime: 1, scheduledFor: 1 });
  res.json({ success: true, data: meetings });
}

async function getWorkspaceSummary(req, res) {
  const teams = await getAccessibleTeams(req.user);
  const [filesShared, activeUsers, upcomingMeetings, unreadMessages, status] = await Promise.all([
    File.countDocuments({}),
    User.countDocuments({ status: "ACTIVE" }),
    Meeting.countDocuments({ status: "SCHEDULED" }),
    Message.countDocuments({}),
    getMicrosoftConnectionStatus(),
  ]);

  const payload = [];
  for (const team of teams.slice(0, 8)) {
    payload.push(await serializeTeam(team));
  }

  res.json({
    success: true,
    data: {
      cards: {
        totalTeams: teams.length,
        activeUsers,
        filesShared,
        upcomingMeetings,
        unreadMessages,
      },
      microsoft: status,
      teams: payload,
    },
  });
}

async function getMicrosoftLogin(req, res) {
  const config = getMicrosoftConfig();
  const status = await getMicrosoftConnectionStatus();
  res.json({
    success: true,
    data: {
      configured: status.configured,
      connected: status.connected,
      redirectUri: config.redirectUri,
      loginUrl: status.configured
        ? `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_mode=query&scope=${encodeURIComponent("https://graph.microsoft.com/.default")}`
        : "",
      message: status.connected ? "Microsoft Graph is ready." : status.reason || "Microsoft Graph is not configured.",
    },
  });
}

async function handleMicrosoftCallback(req, res) {
  res.json({
    success: true,
    message: "Microsoft callback received. This workspace uses server-side Graph credentials, so no extra token storage was required.",
    data: {
      code: req.query.code || "",
      state: req.query.state || "",
    },
  });
}

module.exports = {
  uploadMiddleware,
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  createChannel,
  getChannelsByTeam,
  createMessage,
  getMessagesByChannel,
  uploadTeamFile,
  createMeeting,
  getMeetingsByTeam,
  getWorkspaceSummary,
  getMicrosoftLogin,
  handleMicrosoftCallback,
};
