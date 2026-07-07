const Message = require("../models/Message");
const File = require("../models/File");
const User = require("../models/User");
const {
    getAccessibleTeams,
    getAccessibleDirectRooms,
    buildTeamRoomPayload,
    ensureTeamRoom,
    ensureDirectRoom,
    assertRoomAccess,
    isAdmin,
} = require("../utils/teamAccess");

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

function toDirectRoomPayload(room, viewer, otherUser) {
    return {
        ...room,
        teamName: otherUser.name,
        projectName: `Direct chat with ${otherUser.role}`,
        directMeta: {
            otherUserId: String(otherUser._id),
            otherUserName: otherUser.name,
            otherUserRole: otherUser.role,
            otherUserDepartment: otherUser.department || "",
        },
        monitorMode: isAdmin(viewer),
    };
}

async function getMyRooms(req, res) {
    const teams = await getAccessibleTeams(req.user);
    const rooms = [];

    for (const team of teams) {
        const room = await ensureTeamRoom(team, req.user);
        rooms.push(buildTeamRoomPayload(team, room, req.user));
    }

    const directRooms = await getAccessibleDirectRooms(req.user);
    res.json({ success: true, data: rooms.concat(directRooms) });
}

async function getRoomMessages(req, res) {
    const room = await assertRoomAccess(req.user, req.params.roomId);
    const unreadMessages = await Message.find({
        roomId: room.roomId,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
    }).select("_id");

    if (unreadMessages.length) {
        await Message.updateMany({
            _id: { $in: unreadMessages.map((message) => message._id) },
        }, {
            $addToSet: { readBy: req.user._id },
        });
    }

    const messages = await Message.find({ roomId: room.roomId })
        .sort({ createdAt: 1 })
        .lean();
    const files = await File.find({ roomId: room.roomId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

    if (unreadMessages.length) {
        const io = req.app.get("io");
        if (io) {
            io.to(room.roomId).emit("chat:messages:read", {
                roomId: room.roomId,
                messageIds: unreadMessages.map((message) => String(message._id)),
                readByUserId: String(req.user._id),
                readByName: req.user.name,
            });
        }
    }

    res.json({
        success: true,
        data: {
            roomId: room.roomId,
            teamId: room.teamId,
            messages: messages.map(toMessagePayload),
            files,
        },
    });
}

async function sendRoomMessage(req, res) {
    const room = await assertRoomAccess(req.user, req.params.roomId);
    const messageType = String(req.body.messageType || "TEXT").trim().toUpperCase();
    const text = String(req.body.text || "").trim();
    const fileUrl = String(req.body.fileUrl || req.body.url || "").trim();
    const fileName = String(req.body.fileName || req.body.name || "").trim();
    const location = req.body.location || {};
    const hasLocation = Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));

    if (!text && !fileUrl && !hasLocation && messageType !== "SYSTEM") {
        return res.status(400).json({ success: false, message: "Message content is required" });
    }

    const message = await Message.create({
        roomId: room.roomId,
        teamId: room.teamId,
        senderId: req.user._id,
        senderName: req.user.name,
        senderRole: req.user.role,
        messageType,
        text,
        fileName,
        fileUrl,
        fileSize: Number(req.body.fileSize || req.body.size || 0),
        mimeType: String(req.body.mimeType || "").trim(),
        readBy: [req.user._id],
        location: {
            latitude: hasLocation ? Number(location.latitude) : null,
            longitude: hasLocation ? Number(location.longitude) : null,
            label: String(location.label || "").trim(),
        },
        metadata: {
            fileCategory: String(req.body.fileCategory || "").trim(),
            codeLanguage: String(req.body.codeLanguage || "").trim(),
            voiceDurationSeconds: Number(req.body.voiceDurationSeconds || 0),
        },
        participants: Array.isArray(room.participants)
            ? room.participants.map((participant) => participant.userId || participant)
            : [],
    });

    const payload = toMessagePayload(message);
    const io = req.app.get("io");
    if (io) {
        io.to(room.roomId).emit("chat:message", payload);
    }

    res.status(201).json({ success: true, data: payload });
}

async function shareRoomFile(req, res) {
    const room = await assertRoomAccess(req.user, req.params.roomId);
    const name = String(req.body.name || "").trim();
    const url = String(req.body.url || "").trim();
    const mimeType = String(req.body.mimeType || "").trim();
    const messageType = String(req.body.messageType || (mimeType.startsWith("audio/") ? "VOICE" : "FILE")).trim().toUpperCase();

    if (!name || !url) {
        return res
            .status(400)
            .json({ success: false, message: "File name and URL are required" });
    }

    const file = await File.create({
        teamId: room.teamId,
        roomId: room.roomId,
        uploadedBy: req.user._id,
        uploadedByName: req.user.name,
        name,
        url,
        mimeType: req.body.mimeType || "",
        size: Number(req.body.size || 0),
    });

    const message = await Message.create({
        roomId: room.roomId,
        teamId: room.teamId,
        senderId: req.user._id,
        senderName: req.user.name,
        senderRole: req.user.role,
        messageType,
        text: req.body.caption || `${req.user.name} shared a file`,
        fileName: file.name,
        fileUrl: file.url,
        fileSize: file.size,
        mimeType: file.mimeType,
        readBy: [req.user._id],
        metadata: {
            fileCategory: String(req.body.fileCategory || "").trim(),
            voiceDurationSeconds: Number(req.body.voiceDurationSeconds || 0),
        },
        participants: Array.isArray(room.participants)
            ? room.participants.map((participant) => participant.userId || participant)
            : [],
    });

    file.messageId = message._id;
    await file.save();

    const payload = toMessagePayload(message);
    const io = req.app.get("io");
    if (io) {
        io.to(room.roomId).emit("chat:message", payload);
        io.to(room.roomId).emit("chat:file", { message: payload, file });
    }

    res.status(201).json({ success: true, data: { message: payload, file } });
}

async function markRoomMessagesRead(req, res) {
    const room = await assertRoomAccess(req.user, req.params.roomId);
    const messageIds = Array.isArray(req.body.messageIds)
        ? req.body.messageIds.map(String).filter(Boolean)
        : [];

    const query = {
        roomId: room.roomId,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
    };

    if (messageIds.length) {
        query._id = { $in: messageIds };
    }

    const unreadMessages = await Message.find(query).select("_id");

    if (!unreadMessages.length) {
        return res.json({ success: true, data: { roomId: room.roomId, messageIds: [] } });
    }

    await Message.updateMany({
        _id: { $in: unreadMessages.map((message) => message._id) },
    }, {
        $addToSet: { readBy: req.user._id },
    });

    const normalizedIds = unreadMessages.map((message) => String(message._id));
    const io = req.app.get("io");
    if (io) {
        io.to(room.roomId).emit("chat:messages:read", {
            roomId: room.roomId,
            messageIds: normalizedIds,
            readByUserId: String(req.user._id),
            readByName: req.user.name,
        });
    }

    res.json({
        success: true,
        data: {
            roomId: room.roomId,
            messageIds: normalizedIds,
        },
    });
}

async function getTeamDirectory(req, res) {
    const teams = await getAccessibleTeams(req.user);
    const items = teams.map((team) => ({
        _id: team._id,
        name: team.name,
        roomId: team.roomId || `team_${team._id}`,
        manager: team.manager,
        teamLead: team.teamLead,
        members: team.members || [],
        projectName: team.projectName || "",
        department: team.department || "",
    }));

    res.json({ success: true, data: items });
}

async function getPeopleDirectory(req, res) {
    const search = String(req.query.search || "").trim();
    const currentUserId = String(req.user?._id || "");
    const employeeRoles = ["MEMBER", "TEAM_LEAD", "MANAGER", "PROJECT_MANAGER", "HR"];
    const query = {
        _id: { $ne: req.user._id },
        role: { $in: employeeRoles },
        status: { $ne: "BLOCKED" },
    };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
            { designation: { $regex: search, $options: "i" } },
        ];
    }

    const users = await User.find(query)
        .select("name email role department designation status profilePhoto")
        .sort({ name: 1 })
        .limit(100)
        .lean();

    res.json({
        success: true,
        data: users
            .filter((user) => String(user._id) !== currentUserId)
            .map((user) => ({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department || "",
                designation: user.designation || "",
                status: user.status || "ACTIVE",
                profilePhoto: user.profilePhoto || "",
            })),
    });
}

async function openDirectRoom(req, res) {
    const targetUser = await User.findById(req.params.userId).select(
        "name role department status profilePhoto",
    );

    if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(targetUser._id) === String(req.user._id)) {
        return res
            .status(400)
            .json({ success: false, message: "You cannot open a direct chat with yourself" });
    }

    const room = await ensureDirectRoom(req.user, targetUser, req.user);
    const initiatorPayload = toDirectRoomPayload(room, req.user, targetUser);
    const targetPayload = toDirectRoomPayload(room, targetUser, req.user);

    const io = req.app.get("io");
    if (io) {
        io.to(`user_${req.user._id}`).emit("chat:room:created", initiatorPayload);
        io.to(`user_${targetUser._id}`).emit("chat:room:created", targetPayload);
    }

    res.json({ success: true, data: initiatorPayload });
}

module.exports = {
    getMyRooms,
    getRoomMessages,
    sendRoomMessage,
    shareRoomFile,
    markRoomMessagesRead,
    getTeamDirectory,
    getPeopleDirectory,
    openDirectRoom,
};
