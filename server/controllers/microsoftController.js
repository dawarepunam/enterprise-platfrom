const fs = require("fs");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const Team = require("../models/Team");
const User = require("../models/User");
const File = require("../models/File");
const Meeting = require("../models/Meeting");
const EmailRecord = require("../models/EmailRecord");
const WorkHistory = require("../models/WorkHistory");
const { createNotification } = require("../services/notificationService");
const {
  createTeamsMeeting,
  ensureOneDriveFolder,
  exchangeAuthorizationCode,
  getInboxMessages,
  getMessageById,
  getMicrosoftAuthUrl,
  getMicrosoftConnectionStatus,
  listCalendarEvents,
  listOneDriveFiles,
  sendMailViaMicrosoft,
  upsertMicrosoftAccount,
  uploadBufferToOneDrive,
} = require("../services/microsoftGraphService");
const { getUploadConfig } = require("../config/multer");

const uploadMiddleware = multer(getUploadConfig()).single("file");

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function rejectInvalidObjectId(res, label = "Id") {
  return res.status(400).json({ success: false, message: `${label} is invalid or unavailable. Please select a real saved record.` });
}

function sanitizeFileName(fileName = "") {
  const normalized = String(fileName || "").trim();
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned || `upload-${Date.now()}`;
}

function saveFileLocally(file = {}, projectId = "") {
  const safeName = sanitizeFileName(file.originalname || file.name || "");
  const targetDir = path.join(__dirname, "../uploads/manager", String(projectId || "general"));
  fs.mkdirSync(targetDir, { recursive: true });
  const savedName = `${Date.now()}-${safeName}`;
  const targetPath = path.join(targetDir, savedName);
  fs.writeFileSync(targetPath, file.buffer);

  return {
    provider: "local-storage",
    fileId: savedName,
    fileName: file.originalname || safeName,
    webUrl: `/uploads/manager/${encodeURIComponent(String(projectId || "general"))}/${encodeURIComponent(savedName)}`,
    shareUrl: `/uploads/manager/${encodeURIComponent(String(projectId || "general"))}/${encodeURIComponent(savedName)}`,
    folderPath: `uploads/manager/${String(projectId || "general")}`,
    size: file.size || 0,
    mimeType: file.mimetype || "application/octet-stream",
    raw: {},
  };
}

function normalizeEmailList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function resolveUsersFromContext(req) {
  const usersById = new Map();
  const pushUsers = (items = []) => items.forEach((user) => user?._id && usersById.set(String(user._id), user));

  if (Array.isArray(req.body.participantUserIds) && req.body.participantUserIds.length) {
    pushUsers(await User.find({ _id: { $in: req.body.participantUserIds } }));
  }

  if (req.body.targetUserId) {
    const targetUser = await User.findById(req.body.targetUserId);
    if (targetUser) pushUsers([targetUser]);
  }

  if (req.body.teamId) {
    const team = await Team.findById(req.body.teamId);
    if (team) {
      const ids = [team.managerId, team.teamLeadId, ...(team.memberIds || [])].filter(Boolean);
      if (ids.length) pushUsers(await User.find({ _id: { $in: ids } }));
    }
  }

  if (req.body.projectId && isObjectId(req.body.projectId)) {
    const project = await Project.findById(req.body.projectId);
    if (project) {
      const ids = [project.managerId, project.teamLeadId, project.marketingOwnerId, ...(project.teamMemberIds || [])].filter(Boolean);
      if (ids.length) pushUsers(await User.find({ _id: { $in: ids } }));
    }
  }

  return Array.from(usersById.values());
}

async function getStatus(req, res) {
  const status = await getMicrosoftConnectionStatus(req.user?._id);
  res.json({ success: status.connected, data: status });
}

async function login(req, res) {
  const loginUrl = getMicrosoftAuthUrl({
    userId: String(req.user?._id || ""),
    projectId: String(req.query.projectId || ""),
    redirectPath: String(req.query.redirectPath || "/modules/manager/settings/settings.html"),
  });

  if (!loginUrl) {
    return res.status(400).json({ success: false, message: "Microsoft configuration is incomplete." });
  }

  res.json({ success: true, data: { loginUrl } });
}

async function callback(req, res) {
  const code = String(req.query.code || "");
  if (!code) {
    return res.status(400).json({ success: false, message: "Authorization code is required." });
  }

  let state = {};
  try {
    state = JSON.parse(Buffer.from(String(req.query.state || ""), "base64url").toString("utf8"));
  } catch (error) {
    state = {};
  }

  const tokenResult = await exchangeAuthorizationCode(code);
  const account = await upsertMicrosoftAccount(state.userId, tokenResult);
  const redirectPath = state.redirectPath || "/modules/manager/settings/settings.html";
  res.redirect(`${redirectPath}?microsoft=connected&email=${encodeURIComponent(account.email || "")}`);
}

async function sendMail(req, res) {
  if (req.body.projectId && !isObjectId(req.body.projectId)) {
    return rejectInvalidObjectId(res, "Project");
  }
  const to = [];
  const resolvedUsers = await resolveUsersFromContext(req);
  resolvedUsers.forEach((user) => user?.email && to.push(user.email));
  to.push(...normalizeEmailList(req.body.to));

  if (!to.length) {
    return res.status(400).json({ success: false, message: "Recipient email is required." });
  }

  const result = await sendMailViaMicrosoft(
    {
      to,
      cc: normalizeEmailList(req.body.cc),
      bcc: normalizeEmailList(req.body.bcc),
      subject: req.body.subject || "Smart Enterprise Update",
      html: req.body.html || req.body.bodyHtml || `<p>${String(req.body.body || "").replace(/\n/g, "<br />")}</p>`,
      text: req.body.body || "",
    },
    req.user?._id,
  );

  if (req.body.projectId) {
    await EmailRecord.create({
      projectId: req.body.projectId,
      subject: req.body.subject || "Smart Enterprise Update",
      from: req.user?.email || "",
      to,
      cc: normalizeEmailList(req.body.cc),
      preview: String(req.body.body || "").slice(0, 180),
      sentAt: new Date(),
      folder: "sent",
      createdBy: req.user?._id || null,
      metadata: result,
    });
  }

  res.json({
    success: true,
    message: "Microsoft Outlook mail sent successfully.",
    data: result,
  });
}

async function getInbox(req, res) {
  const messages = await getInboxMessages({ userId: req.user?._id, top: Number(req.query.top || 25) });
  res.json({ success: true, data: messages });
}

async function getMessage(req, res) {
  const message = await getMessageById({ userId: req.user?._id, messageId: req.params.id });
  res.json({ success: true, data: message });
}

async function getCalendarEvents(req, res) {
  const events = await listCalendarEvents({
    userId: req.user?._id,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    top: Number(req.query.top || 30),
  });
  res.json({ success: true, data: events });
}

async function createMeeting(req, res) {
  if (req.body.projectId && !isObjectId(req.body.projectId)) {
    return rejectInvalidObjectId(res, "Project");
  }
  const participantUsers = await resolveUsersFromContext(req);
  const project = req.body.projectId ? await Project.findById(req.body.projectId) : null;

  const participantSet = new Map();
  participantUsers.forEach((user) => user?.email && participantSet.set(user.email.toLowerCase(), { email: user.email, name: user.name }));
  normalizeEmailList(req.body.participantEmails).forEach((email) => participantSet.set(email, { email, name: email }));

  if (!participantSet.size) {
    return res.status(400).json({ success: false, message: "At least one participant is required." });
  }

  const startsAt = req.body.startsAt || req.body.startDateTime || new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const endsAt = req.body.endsAt || req.body.endDateTime || new Date(Date.now() + 40 * 60 * 1000).toISOString();
  const title = req.body.title || project?.projectName || "Smart Enterprise Teams Meeting";
  const description = req.body.description || req.body.notes || `Meeting created by ${req.user.name}.`;

  const graphMeeting = await createTeamsMeeting(
    {
      title,
      description,
      startDateTime: startsAt,
      endDateTime: endsAt,
      attendees: Array.from(participantSet.values()),
      location: req.body.location || "",
      recurrence: req.body.recurrence || undefined,
    },
    req.user?._id,
  );

  const team = req.body.teamId ? await Team.findById(req.body.teamId) : null;
  const meeting = await Meeting.create({
    teamId: req.body.teamId || null,
    roomId: team?.roomId || `msft_${Date.now()}`,
    module: req.body.module || "microsoft",
    title,
    meetingType: "VIDEO",
    status: "SCHEDULED",
    startedBy: req.user._id,
    startedByName: req.user.name,
    participants: participantUsers.map((user) => ({
      userId: user._id,
      name: user.name,
      role: user.role,
    })),
    scheduledFor: new Date(startsAt),
    startedAt: new Date(startsAt),
    startTime: new Date(startsAt),
    endTime: new Date(endsAt),
    notes: description,
    joinUrl: graphMeeting.joinUrl,
    microsoft: {
      provider: graphMeeting.provider,
      joinUrl: graphMeeting.joinUrl,
      eventId: graphMeeting.eventId,
      webLink: graphMeeting.webLink,
      organizerEmail: graphMeeting.organizer,
    },
  });

  if (project) {
    project.meetingLink = graphMeeting.joinUrl || project.meetingLink;
    await project.save();
    await WorkHistory.create({
      userId: req.user._id,
      projectId: project._id,
      actionType: "Meeting Scheduled",
      title,
      details: description,
    });
  }

  res.status(201).json({
    success: true,
    message: "Microsoft Teams meeting created successfully.",
    data: {
      meeting,
      joinUrl: graphMeeting.joinUrl,
      webLink: graphMeeting.webLink,
      eventId: graphMeeting.eventId,
    },
  });
}

async function uploadToOneDrive(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please attach a file." });
  }

  if (req.body.projectId && !isObjectId(req.body.projectId)) {
    return rejectInvalidObjectId(res, "Project");
  }

  const project = req.body.projectId ? await Project.findById(req.body.projectId) : null;
  const folderPath =
    req.body.folderPath ||
    project?.microsoft?.oneDriveFolder ||
    [project?.clientName || "Client", project?.projectName || "Project"].filter(Boolean).join("/");

  let uploaded;
  let usedFallback = false;

  try {
    uploaded = await uploadBufferToOneDrive({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      folderPath,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    uploaded = {
      ...saveFileLocally(req.file, project?._id || "general"),
      raw: {
        fallbackReason: error.message,
      },
    };
    usedFallback = true;
  }

  const fileRecord = await File.create({
    teamId: req.body.teamId || null,
    projectId: project?._id || null,
    roomId: req.body.roomId || "",
    uploadedBy: req.user._id,
    uploadedByName: req.user.name,
    name: uploaded.fileName,
    url: uploaded.shareUrl || uploaded.webUrl,
    mimeType: req.file.mimetype,
    size: uploaded.size || req.file.size,
    module: req.body.module || "microsoft",
    entityType: req.body.entityType || (project ? "project" : "file"),
    entityId: req.body.entityId || (project ? String(project._id) : ""),
    provider: uploaded.provider,
    oneDriveFolder: uploaded.folderPath,
    oneDriveItemId: uploaded.fileId,
    oneDriveShareUrl: uploaded.shareUrl || uploaded.webUrl,
    metadata: {
      oneDriveFileId: uploaded.fileId,
      oneDriveWebUrl: uploaded.webUrl,
      oneDriveFolder: uploaded.folderPath,
    },
  });

  if (project) {
    project.requirementDocs = Array.isArray(project.requirementDocs) ? project.requirementDocs : [];
    project.requirementDocs.push({
      name: uploaded.fileName,
      url: uploaded.shareUrl || uploaded.webUrl,
    });
    project.documentsCount = project.requirementDocs.length;
    project.oneDriveShareUrl = uploaded.shareUrl || uploaded.webUrl;
    project.microsoft = project.microsoft || {};
    project.microsoft.oneDriveFolder = uploaded.folderPath;
    project.microsoft.shareUrl = uploaded.shareUrl || uploaded.webUrl;
    project.microsoft.graphSyncStatus = usedFallback ? "Warning" : "Synced";
    project.microsoft.lastSyncedAt = new Date();
    await project.save();

    await WorkHistory.create({
      userId: req.user._id,
      projectId: project._id,
      actionType: "File Uploaded",
      title: uploaded.fileName,
      details: uploaded.folderPath,
    });
  }

  await createNotification(
    {
      title: "OneDrive upload complete",
      message: usedFallback
        ? `${uploaded.fileName} was uploaded using fallback storage because Microsoft OneDrive is unavailable.`
        : `${uploaded.fileName} was uploaded to Microsoft OneDrive.`,
      type: "MICROSOFT_FILE_UPLOADED",
      module: "microsoft",
      priority: "medium",
      userId: req.user._id,
      actionUrl: uploaded.shareUrl || uploaded.webUrl,
      entityType: "file",
      entityId: String(fileRecord._id),
      metadata: {
        provider: uploaded.provider,
        fileId: uploaded.fileId,
        usedFallback,
      },
    },
    req.app.get("io"),
  );

  res.status(201).json({
    success: true,
    message: usedFallback
      ? "File uploaded successfully using fallback storage."
      : "File uploaded to Microsoft OneDrive successfully.",
    data: {
      file: fileRecord,
      shareUrl: uploaded.shareUrl,
      webUrl: uploaded.webUrl,
      fileId: uploaded.fileId,
      folderPath: uploaded.folderPath,
      provider: uploaded.provider,
      usedFallback,
    },
  });
}

async function getOneDriveFiles(req, res) {
  if (!isObjectId(req.params.projectId)) {
    return rejectInvalidObjectId(res, "Project");
  }
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const files = await listOneDriveFiles(project.microsoft?.oneDriveFolder || `${project.clientName || "Client"}/${project.projectName}`);
  res.json({ success: true, data: files });
}

async function ensureProjectWorkspace(req, res) {
  if (!isObjectId(req.params.projectId)) {
    return rejectInvalidObjectId(res, "Project");
  }
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found." });
  }

  const folderPath =
    req.body.folderPath ||
    project.microsoft?.oneDriveFolder ||
    [project.clientName || "Client", project.projectName || "Project"].filter(Boolean).join("/");

  const workspace = await ensureOneDriveFolder(folderPath);
  project.microsoft = project.microsoft || {};
  project.microsoft.oneDriveFolder = workspace.folderPath;
  project.microsoft.shareUrl = workspace.shareUrl || workspace.webUrl || "";
  project.oneDriveShareUrl = workspace.shareUrl || workspace.webUrl || "";
  project.microsoft.graphSyncStatus = "Synced";
  project.microsoft.lastSyncedAt = new Date();
  project.workspaceStatus = project.managerId || project.manager ? "Assigned workspace ready" : "Draft workspace ready";
  await project.save();

  res.json({
    success: true,
    message: "Project workspace prepared successfully.",
    data: {
      projectId: project._id,
      folderPath: workspace.folderPath,
      shareUrl: workspace.shareUrl,
      webUrl: workspace.webUrl,
      folderId: workspace.folderId,
    },
  });
}

async function openTeams(req, res) {
  if (req.query.projectId && !isObjectId(req.query.projectId)) {
    return res.json({ success: true, data: { teamsWebUrl: "https://teams.microsoft.com" } });
  }
  const project = req.query.projectId ? await Project.findById(req.query.projectId) : null;
  const teamsWebUrl = project?.teamsWebUrl || project?.microsoft?.teamsMeetingUrl || "https://teams.microsoft.com";
  res.json({ success: true, data: { teamsWebUrl } });
}

module.exports = {
  callback,
  createMeeting,
  ensureProjectWorkspace,
  getCalendarEvents,
  getInbox,
  getMessage,
  getOneDriveFiles,
  getStatus,
  login,
  openTeams,
  sendMail,
  uploadMiddleware,
  uploadToOneDrive,
};
