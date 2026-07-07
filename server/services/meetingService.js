const Meeting = require("../models/Meeting");
const User = require("../models/User");
const { createTeamsMeeting } = require("./microsoftGraphService");

async function scheduleChannelMeeting({
  team,
  channel,
  createdBy,
  title,
  description,
  startTime,
  endTime,
  participantIds = [],
}) {
  const users = await User.find({ _id: { $in: participantIds } }).select("name email role");
  const graphMeeting = await createTeamsMeeting({
    title,
    description,
    startDateTime: startTime,
    endDateTime: endTime,
    attendees: users.map((user) => ({ email: user.email, name: user.name })),
  });

  const meeting = await Meeting.create({
    teamId: team?._id || null,
    channelId: channel?._id || null,
    roomId: team?.roomId || "",
    title,
    meetingType: "VIDEO",
    status: "SCHEDULED",
    startedBy: createdBy._id,
    startedByName: createdBy.name,
    participants: users.map((user) => ({
      userId: user._id,
      name: user.name,
      role: user.role,
    })),
    scheduledFor: new Date(startTime),
    startedAt: new Date(startTime),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    joinUrl: graphMeeting.joinUrl,
    notes: description || "",
    microsoft: {
      provider: graphMeeting.provider,
      joinUrl: graphMeeting.joinUrl,
      eventId: graphMeeting.eventId,
      webLink: graphMeeting.webLink,
      organizerEmail: graphMeeting.organizer,
    },
  });

  return { meeting, graphMeeting };
}

module.exports = {
  scheduleChannelMeeting,
};
