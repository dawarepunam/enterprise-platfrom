const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const CommunicationLog = require("../models/CommunicationLog");
const {
  getAccessibleTeams,
  getAccessibleDirectRooms,
  buildTeamRoomPayload,
  ensureTeamRoom,
  assertRoomAccess,
} = require("../utils/teamAccess");

const onlineUsers = new Map();

async function resolveSocketUser(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    throw new Error("Authentication token missing");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

function toMessagePayload(message) {
  return {
    _id: message._id,
    roomId: message.roomId,
    teamId: message.teamId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    messageType: message.messageType,
    text: message.text,
    fileName: message.fileName,
    fileUrl: message.fileUrl,
    fileSize: message.fileSize,
    mimeType: message.mimeType,
    location: message.location || null,
    metadata: message.metadata || null,
    readBy: message.readBy || [],
    callData: message.callData || null,
    createdAt: message.createdAt,
  };
}

function buildRoomParticipants(team) {
  return buildTeamRoomPayload(team, {
    roomId: team.roomId || `team_${team._id}`,
    projectId: team.projectId || null,
    projectName: team.projectName || "",
  }).participants;
}

function buildOnlineSnapshot() {
  return Array.from(onlineUsers.values()).map((user) => ({
    userId: user.userId,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    status: "ONLINE",
  }));
}

async function joinAccessibleRooms(socket, user) {
  const teams = await getAccessibleTeams(user);
  const rooms = [];

  for (const team of teams) {
    const room = await ensureTeamRoom(team, user);
    socket.join(room.roomId);
    rooms.push(buildTeamRoomPayload(team, room, user));
  }

  const directRooms = await getAccessibleDirectRooms(user);
  directRooms.forEach((room) => {
    socket.join(room.roomId);
    rooms.push(room);
  });

  socket.join(`user_${user._id}`);
  return rooms;
}

function registerChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      socket.user = await resolveSocketUser(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.user;
    const joinedRooms = await joinAccessibleRooms(socket, user);

    onlineUsers.set(String(user._id), {
      userId: String(user._id),
      name: user.name,
      role: user.role,
      teamId: user.teamId ? String(user.teamId) : "",
      status: "ONLINE",
    });

    socket.emit("connected", {
      message: "Realtime channel ready",
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        teamName: user.teamName,
      },
      rooms: joinedRooms,
      onlineUsers: buildOnlineSnapshot(),
    });

    socket.broadcast.emit("presence:changed", {
      userId: user._id,
      name: user.name,
      status: "ONLINE",
    });

    io.emit("attendance:status:changed", {
      userId: user._id,
      name: user.name,
      status: "ONLINE",
    });

    socket.on("attendance:status:change", (payload = {}) => {
      const newStatus = String(payload.status || "ONLINE").toUpperCase();
      const existing = onlineUsers.get(String(user._id));
      if (existing) {
        existing.status = newStatus;
        io.emit("attendance:status:changed", {
          userId: user._id,
          name: user.name,
          status: newStatus,
        });
      }
    });

    socket.on("chat:typing", async (payload = {}) => {
      if (!payload.roomId) return;

      try {
        await assertRoomAccess(user, payload.roomId);
        socket.to(payload.roomId).emit("chat:typing", {
          roomId: payload.roomId,
          userId: user._id,
          name: user.name,
        });
      } catch (error) {
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on("chat:rooms:refresh", async () => {
      try {
        const rooms = await joinAccessibleRooms(socket, user);
        socket.emit("chat:rooms:sync", { rooms });
      } catch (error) {
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on("chat:typing:stop", async (payload = {}) => {
      if (!payload.roomId) return;

      try {
        await assertRoomAccess(user, payload.roomId);
        socket.to(payload.roomId).emit("chat:typing:stop", {
          roomId: payload.roomId,
          userId: user._id,
          name: user.name,
        });
      } catch (error) {
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on("chat:message:send", async (payload = {}) => {
      try {
        const room = await assertRoomAccess(user, payload.roomId);
        const messageType = String(payload.messageType || "TEXT").trim().toUpperCase();
        const text = String(payload.text || "").trim();
        const fileUrl = String(payload.fileUrl || "").trim();
        const location = payload.location || {};
        const hasLocation = Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));

        if (!text && !fileUrl && !hasLocation && messageType !== "SYSTEM") {
          socket.emit("chat:error", { message: "Message content is required" });
          return;
        }

        const message = await Message.create({
          roomId: room.roomId,
          teamId: room.teamId,
          senderId: user._id,
          senderName: user.name,
          senderRole: user.role,
          messageType,
          text,
          fileName: String(payload.fileName || "").trim(),
          fileUrl,
          fileSize: Number(payload.fileSize || 0),
          mimeType: String(payload.mimeType || "").trim(),
          readBy: [user._id],
          location: {
            latitude: hasLocation ? Number(location.latitude) : null,
            longitude: hasLocation ? Number(location.longitude) : null,
            label: String(location.label || "").trim(),
          },
          metadata: {
            fileCategory: String(payload.fileCategory || "").trim(),
            codeLanguage: String(payload.codeLanguage || "").trim(),
            voiceDurationSeconds: Number(payload.voiceDurationSeconds || 0),
          },
          participants: Array.isArray(room.participants)
            ? room.participants.map((participant) => participant.userId || participant)
            : [],
        });

        io.to(room.roomId).emit("chat:message", toMessagePayload(message));
      } catch (error) {
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on("call:respond", async (payload = {}) => {
      try {
        const call = await CommunicationLog.findById(payload.callId);
        if (!call) {
          socket.emit("chat:error", { message: "Call log not found" });
          return;
        }

        await assertRoomAccess(user, call.roomId);
        call.status = payload.status || call.status;
        if (["REJECTED", "MISSED", "COMPLETED"].includes(call.status) && !call.endedAt) {
          call.endedAt = new Date();
        }

        await call.save();

        io.to(call.roomId).emit("call:updated", {
          callId: call._id,
          status: call.status,
          respondedBy: { userId: user._id, name: user.name },
          endedAt: call.endedAt,
        });
      } catch (error) {
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(String(user._id));
      socket.broadcast.emit("presence:changed", {
        userId: user._id,
        name: user.name,
        status: "OFFLINE",
      });
      io.emit("attendance:status:changed", {
        userId: user._id,
        name: user.name,
        status: "OFFLINE",
      });
    });
  });
}

module.exports = registerChatSocket;
