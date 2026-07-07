const Meeting = require("../models/Meeting");
const CommunicationLog = require("../models/CommunicationLog");
const Team = require("../models/Team");
const { getAccessibleTeams, ensureTeamRoom, assertTeamAccess } = require("../utils/teamAccess");
const { dispatchWorkflow, findUsersByRefs } = require("../services/workflowService");
const { createTeamsMeeting } = require("../services/microsoftGraphService");

async function listMeetings(req, res) {
  const teams = await getAccessibleTeams(req.user);
  const teamIds = teams.map((team) => team._id);
  const meetings = await Meeting.find({ teamId: { $in: teamIds } }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: meetings });
}

async function startMeeting(req, res) {
  const team = await assertTeamAccess(req.user, req.body.teamId);
  const room = await ensureTeamRoom(team, req.user);
  const recipientRefs = [
    { userId: team.managerId },
    { userId: team.teamLeadId },
    ...(team.memberIds || []).map((userId) => ({ userId })),
  ];
  const attendees = [];
  const recipients = await findUsersByRefs(recipientRefs);
  for (const user of recipients) {
    if (user?.email && String(user._id) !== String(req.user._id)) {
      attendees.push({ email: user.email, name: user.name });
    }
  }

  const scheduledStart = req.body.startDateTime || req.body.scheduledFor || new Date().toISOString();
  const scheduledEnd = req.body.endDateTime || new Date(Date.now() + 30 * 60 * 1000).toISOString();
  let graphMeeting = null;
  try {
    graphMeeting = await createTeamsMeeting({
      title: req.body.title || `${team.name} Sync Meeting`,
      description: req.body.notes || `${team.name} collaboration meeting`,
      startDateTime: scheduledStart,
      endDateTime: scheduledEnd,
      attendees,
    });
  } catch (error) {
    graphMeeting = {
      provider: "internal-realtime",
      joinUrl: "",
      webLink: "",
      eventId: "",
      organizer: "",
      errorMessage: error.message,
    };
  }

  const meeting = await Meeting.create({
    teamId: team._id,
    roomId: room.roomId,
    title: req.body.title || `${team.name} Sync Meeting`,
    meetingType: req.body.meetingType || "VIDEO",
    status: "LIVE",
    startedBy: req.user._id,
    startedByName: req.user.name,
    participants: [{ userId: req.user._id, name: req.user.name, role: req.user.role }],
    notes: req.body.notes || "",
    scheduledFor: new Date(scheduledStart),
    microsoft: {
      provider: graphMeeting.provider || "",
      joinUrl: graphMeeting.joinUrl || "",
      eventId: graphMeeting.eventId || "",
      webLink: graphMeeting.webLink || "",
      organizerEmail: graphMeeting.organizer || "",
    },
  });

  await CommunicationLog.create({
    teamId: team._id,
    roomId: room.roomId,
    communicationType: "MEETING",
    initiatedBy: req.user._id,
    initiatedByName: req.user.name,
    status: "LIVE",
    metadata: { meetingId: meeting._id, meetingType: meeting.meetingType, title: meeting.title },
  });

  const io = req.app.get("io");
  if (io) {
    io.to(room.roomId).emit("meeting:started", meeting);
  }

  await dispatchWorkflow({
    req,
    module: "meetings",
    event: "MEETING_CREATED",
    title: "Meeting started",
    message: `${meeting.title} is now live for ${team.name}.`,
    priority: "high",
    actionUrl: `/modules/collaboration/meetings/meetings.html?meetingId=${meeting._id}`,
    entityType: "meeting",
    entityId: meeting._id,
    userRefs: recipientRefs,
    email: {
      subject: `Meeting live: ${meeting.title}`,
      template: "generic",
      variables: {
        title: "Meeting invitation",
        meetingTitle: meeting.title,
        teamName: team.name,
        meetingType: meeting.meetingType,
        startedBy: req.user.name,
        startedAt: new Date(meeting.startedAt).toLocaleString(),
        joinUrl: graphMeeting.joinUrl || `${process.env.CLIENT_URL || `http://127.0.0.1:${process.env.PORT || 5000}`}/modules/collaboration/meetings/meetings.html?meetingId=${meeting._id}`,
        actionLabel: "Join Meeting",
      },
    },
    metadata: {
      teamName: team.name,
      roomId: room.roomId,
      meetingTitle: meeting.title,
      joinUrl: graphMeeting.joinUrl || "",
      microsoftProvider: graphMeeting.provider || "",
      microsoftError: graphMeeting.errorMessage || "",
    },
  });

  res.status(201).json({
    success: true,
    data: {
      ...meeting.toObject(),
      microsoft: meeting.microsoft,
    },
  });
}

async function joinMeeting(req, res) {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    return res.status(404).json({ success: false, message: "Meeting not found" });
  }

  await assertTeamAccess(req.user, meeting.teamId);
  const alreadyJoined = meeting.participants.some((item) => String(item.userId) === String(req.user._id));

  if (!alreadyJoined) {
    meeting.participants.push({
      userId: req.user._id,
      name: req.user.name,
      role: req.user.role,
      joinedAt: new Date(),
    });
    await meeting.save();
  }

  const io = req.app.get("io");
  if (io) {
    io.to(meeting.roomId).emit("meeting:joined", {
      meetingId: meeting._id,
      userId: req.user._id,
      name: req.user.name,
      role: req.user.role,
    });
  }

  res.json({ success: true, data: meeting });
}

async function endMeeting(req, res) {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    return res.status(404).json({ success: false, message: "Meeting not found" });
  }

  await assertTeamAccess(req.user, meeting.teamId);
  meeting.status = "ENDED";
  meeting.endedAt = new Date();
  await meeting.save();

  await CommunicationLog.updateMany(
    { "metadata.meetingId": meeting._id, communicationType: "MEETING", endedAt: null },
    { status: "COMPLETED", endedAt: meeting.endedAt },
  );

  const io = req.app.get("io");
  if (io) {
    io.to(meeting.roomId).emit("meeting:ended", {
      meetingId: meeting._id,
      endedAt: meeting.endedAt,
    });
  }

  res.json({ success: true, data: meeting });
}

module.exports = {
  listMeetings,
  startMeeting,
  joinMeeting,
  endMeeting,
};
