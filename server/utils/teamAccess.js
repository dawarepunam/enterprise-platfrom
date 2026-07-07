const Team = require("../models/Team");
const ChatRoom = require("../models/ChatRoom");
const DirectChatRoom = require("../models/DirectChatRoom");
const User = require("../models/User");

function normalizeObjectId(value) {
  return value ? String(value) : "";
}

function isAdmin(user) {
  const role = String(user?.role || "").toUpperCase();
  return role === "ADMIN" || role === "PROJECT_MANAGER" || role === "MANAGER";
}

function buildDirectRoomId(userAId, userBId) {
  return `dm_${[String(userAId), String(userBId)].sort().join("_")}`;
}

function toParticipant(user) {
  return {
    userId: String(user._id),
    name: user.name,
    role: user.role,
    department: user.department || "",
  };
}

function buildTeamParticipantIds(team) {
  return [team.managerId, team.teamLeadId, ...(team.memberIds || [])]
    .filter(Boolean)
    .map((value) => String(value));
}

function buildTeamRoomParticipants(team) {
  const participants = [
    {
      userId: team.managerId || null,
      name: team.manager || "",
      role: "MANAGER",
      department: team.department || "",
    },
    {
      userId: team.teamLeadId || null,
      name: team.teamLead || "",
      role: "TEAM_LEAD",
      department: team.department || "",
    },
    ...((team.memberIds || []).map((userId, index) => ({
      userId,
      name: (team.members || [])[index] || "",
      role: "MEMBER",
      department: team.department || "",
    }))),
  ];

  return participants
    .filter((item) => item.userId && item.name)
    .map((item) => ({
      userId: String(item.userId),
      name: item.name,
      role: item.role,
      department: item.department || "",
    }));
}

function buildTeamRoomPayload(team, room, viewer = null) {
  return {
    roomType: "TEAM",
    teamId: team._id,
    teamName: team.name,
    roomId: room.roomId,
    projectId: room.projectId || team.projectId || null,
    projectName: room.projectName || team.projectName || "",
    department: team.department || "",
    manager: team.manager || "",
    teamLead: team.teamLead || "",
    members: team.members || [],
    participants: buildTeamRoomParticipants(team),
    monitorMode: isAdmin(viewer),
  };
}

async function getAccessibleTeams(user) {
  if (!user) return [];

  if (isAdmin(user)) {
    return Team.find().sort({ createdAt: -1 });
  }

  const userId = normalizeObjectId(user._id);
  const userTeamId = normalizeObjectId(user.teamId);
  const userName = String(user.name || "").trim();

  return Team.find({
    $or: [
      ...(userTeamId ? [{ _id: userTeamId }] : []),
      { managerId: userId || null },
      { teamLeadId: userId || null },
      { memberIds: userId || null },
      ...(userName ? [{ manager: userName }, { teamLead: userName }, { members: userName }] : []),
    ],
  }).sort({ createdAt: -1 });
}

async function ensureTeamRoom(team, user) {
  const roomId = team.roomId || `team_${team._id}`;
  const participantIds = buildTeamParticipantIds(team);

  if (!team.roomId) {
    team.roomId = roomId;
    await team.save();
  }

  let room = await ChatRoom.findOne({ teamId: team._id });
  if (!room) {
    room = await ChatRoom.create({
      teamId: team._id,
      roomId,
      name: `${team.name} Team Room`,
      projectId: team.projectId || null,
      projectName: team.projectName || "",
      participants: participantIds,
      createdBy: user?._id || null,
    });
  } else {
    room.roomId = roomId;
    room.name = `${team.name} Team Room`;
    room.projectId = team.projectId || null;
    room.projectName = team.projectName || "";
    room.participants = participantIds;
    room.isActive = true;
    await room.save();
  }

  return room;
}

async function ensureDirectRoom(currentUser, targetUser, creator = currentUser) {
  const roomId = buildDirectRoomId(currentUser._id, targetUser._id);
  let room = await DirectChatRoom.findOne({ roomId });

  if (!room) {
    room = await DirectChatRoom.create({
      roomId,
      participantIds: [currentUser._id, targetUser._id],
      createdBy: creator?._id || currentUser._id,
    });
  }

  return {
    _id: room._id,
    roomType: "DIRECT",
    roomId: room.roomId,
    teamId: null,
    name: `${currentUser.name}, ${targetUser.name}`,
    participants: [toParticipant(currentUser), toParticipant(targetUser)],
  };
}

async function getAccessibleDirectRooms(user) {
  if (!user?._id) return [];

  const directRooms = await DirectChatRoom.find({
    participantIds: user._id,
    isActive: true,
  }).sort({ updatedAt: -1 });

  if (!directRooms.length) return [];

  const participantIds = Array.from(
    new Set(
      directRooms.flatMap((room) =>
        (room.participantIds || []).map((participantId) => String(participantId)),
      ),
    ),
  );

  const users = await User.find({ _id: { $in: participantIds } }).select(
    "name role department status profilePhoto",
  );
  const userMap = new Map(users.map((item) => [String(item._id), item]));

  return directRooms
    .map((room) => {
      const participants = (room.participantIds || [])
        .map((participantId) => userMap.get(String(participantId)))
        .filter(Boolean)
        .map(toParticipant);

      if (!participants.length) return null;

      const otherParticipant =
        participants.find((participant) => participant.userId !== String(user._id)) ||
        participants[0];

      return {
        _id: room._id,
        roomType: "DIRECT",
        roomId: room.roomId,
        teamId: null,
        teamName: otherParticipant?.name || "Direct chat",
        projectName: `Direct chat with ${otherParticipant?.role || "USER"}`,
        participants,
        directMeta: {
          otherUserId: otherParticipant?.userId || "",
          otherUserName: otherParticipant?.name || "Direct chat",
          otherUserRole: otherParticipant?.role || "",
          otherUserDepartment: otherParticipant?.department || "",
        },
      };
    })
    .filter(Boolean);
}

async function assertTeamAccess(user, teamId) {
  const team = await Team.findById(teamId);
  if (!team) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }

  if (isAdmin(user)) {
    return team;
  }

  const userId = normalizeObjectId(user._id);
  const userName = String(user.name || "").trim().toLowerCase();
  const memberIds = (team.memberIds || []).map(normalizeObjectId);
  const memberNames = (team.members || []).map((item) => String(item || "").trim().toLowerCase());
  const hasAccess =
    normalizeObjectId(team._id) === normalizeObjectId(user.teamId) ||
    normalizeObjectId(team.managerId) === userId ||
    normalizeObjectId(team.teamLeadId) === userId ||
    memberIds.includes(userId) ||
    String(team.manager || "").trim().toLowerCase() === userName ||
    String(team.teamLead || "").trim().toLowerCase() === userName ||
    memberNames.includes(userName);

  if (!hasAccess) {
    const error = new Error("You do not have access to this team");
    error.statusCode = 403;
    throw error;
  }

  return team;
}

async function assertRoomAccess(user, roomId) {
  const room = await ChatRoom.findOne({ roomId });

  if (room) {
    await assertTeamAccess(user, room.teamId);
    return {
      ...room.toObject(),
      roomType: "TEAM",
    };
  }

  const directRoom = await DirectChatRoom.findOne({ roomId, isActive: true });
  if (!directRoom) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  const participantIds = (directRoom.participantIds || []).map(normalizeObjectId);
  if (!participantIds.includes(normalizeObjectId(user._id))) {
    const error = new Error("You do not have access to this direct chat");
    error.statusCode = 403;
    throw error;
  }

  const participants = await User.find({
    _id: { $in: directRoom.participantIds },
  }).select("name role department");

  const otherParticipant =
    participants.find((participant) => normalizeObjectId(participant._id) !== normalizeObjectId(user._id)) ||
    participants[0];

  return {
    _id: directRoom._id,
    roomType: "DIRECT",
    roomId: directRoom.roomId,
    teamId: null,
    participants: participants.map(toParticipant),
    directMeta: {
      otherUserId: normalizeObjectId(otherParticipant?._id),
      otherUserName: otherParticipant?.name || "Direct chat",
      otherUserRole: otherParticipant?.role || "",
      otherUserDepartment: otherParticipant?.department || "",
    },
  };
}

module.exports = {
  getAccessibleTeams,
  getAccessibleDirectRooms,
  buildDirectRoomId,
  buildTeamRoomParticipants,
  buildTeamRoomPayload,
  ensureTeamRoom,
  ensureDirectRoom,
  assertTeamAccess,
  assertRoomAccess,
  isAdmin,
};
