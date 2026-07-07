const Call = require("../models/Call");
const Message = require("../models/Message");
const User = require("../models/User");
const { assertRoomAccess } = require("../utils/teamAccess");

const activeCallSessions = new Map(); // Track active calls by room

function roomForUser(userId) {
    return `user:${String(userId)}`;
}

function serializeUser(user) {
    return {
        userId: String(user.userId || user._id || ""),
        name: user.name || "",
        role: user.role || "MEMBER",
    };
}

function buildParticipantsForRoom(room) {
    return (room.participants || []).map((participantId) => String(participantId));
}

async function createCallSummaryMessage(callRecord, endedByName = "") {
    const existingMessage = await Message.findOne({
        "callData.callId": callRecord._id,
    }).lean();
    if (existingMessage) {
        return existingMessage;
    }

    const participantNames = [callRecord.callerName, ...(callRecord.participantNames || [])]
        .filter(Boolean)
        .filter((value, index, array) => array.indexOf(value) === index);

    return Message.create({
        roomId: callRecord.roomId,
        teamId: callRecord.teamId || null,
        senderId: callRecord.callerId,
        senderName: callRecord.callerName,
        senderRole: callRecord.callerRole,
        messageType: "SYSTEM",
        text: `${callRecord.callType === "GROUP" ? "Group" : "Voice"} call ${String(callRecord.status || "").toLowerCase()}.`,
        callData: {
            type: "VOICE_CALL",
            callId: callRecord._id,
            callMode: "audio",
            status: callRecord.status,
            startedAt: callRecord.startedAt,
            endedAt: callRecord.endedAt,
            duration: callRecord.duration || 0,
            participantNames,
            endedByName,
        },
    });
}

async function initiateCall(socket, payload) {
    try {
        const { roomId, targetUserId, participantIds = [] } = payload;
        const caller = socket.user;

        // Verify room access
        const room = await assertRoomAccess(caller, roomId);
        const roomParticipantIds = buildParticipantsForRoom(room)
            .filter((userId) => userId !== String(caller._id));
        const requestedParticipantIds = [targetUserId, ...(participantIds || [])]
            .filter(Boolean)
            .map((value) => String(value));
        const recipientIds = Array.from(new Set((requestedParticipantIds.length ? requestedParticipantIds : roomParticipantIds)
            .filter((userId) => roomParticipantIds.includes(userId))));

        if (!recipientIds.length) {
            socket.emit("call:error", { message: "No recipients are available for this room" });
            return;
        }

        const targetUsers = await User.find({ _id: { $in: recipientIds } });
        if (!targetUsers.length) {
            socket.emit("call:error", { message: "Target user not found" });
            return;
        }

        // Create call record
        const callRecord = await Call.create({
            projectId: room.projectId || room.teamId,
            teamId: room.teamId || null,
            roomId: room.roomId,
            callerId: caller._id,
            callerName: caller.name,
            callerRole: caller.role,
            participantIds: recipientIds,
            participantNames: targetUsers.map((user) => user.name),
            callType: recipientIds.length > 1 ? "GROUP" : "ONE_TO_ONE",
            status: "RINGING",
        });

        // Track active session
        activeCallSessions.set(callRecord._id.toString(), {
            callId: callRecord._id,
            roomId,
            callerId: caller._id,
            participants: new Set([String(caller._id), ...recipientIds]),
        });

        // Emit incoming call to target user(s)
        const io = socket.nsp.server;
        const incomingPayload = {
            callId: callRecord._id,
            roomId: callRecord.roomId,
            projectId: callRecord.projectId,
            callerId: String(caller._id),
            callerName: caller.name,
            callerRole: caller.role,
            participantIds: recipientIds,
            participantNames: targetUsers.map((user) => user.name),
            callType: callRecord.callType,
            mode: "audio",
            timestamp: new Date(),
        };
        recipientIds.forEach((userId) => {
            io.to(roomForUser(userId)).emit("call:incoming", incomingPayload);
        });

        // Send confirmation to caller
        socket.emit("call:initiated", {
            callId: callRecord._id,
            roomId: callRecord.roomId,
            participantIds: recipientIds,
            participantNames: targetUsers.map((user) => user.name),
            message: `Call initiated with ${targetUsers.map((user) => user.name).join(", ")}`,
        });
    } catch (error) {
        console.error("Initiate call error:", error);
        socket.emit("call:error", { message: error.message });
    }
}

async function acceptCall(socket, payload) {
    try {
        const { callId } = payload;
        const accepter = socket.user;

        const callRecord = await Call.findById(callId);
        if (!callRecord) {
            socket.emit("call:error", { message: "Call not found" });
            return;
        }

        if (callRecord.status !== "INITIATED" && callRecord.status !== "RINGING") {
            socket.emit("call:error", { message: "Call is no longer available" });
            return;
        }

        // Update call status
        callRecord.status = "ACTIVE";
        callRecord.startedAt = new Date();
        await callRecord.save();

        // Update active session
        const session = activeCallSessions.get(callId);
        if (session) {
            session.participants.add(accepter._id.toString());
            session.startedAt = new Date();
        }

        // Notify all participants in room
        const io = socket.nsp.server;
        const acceptedPayload = {
            callId,
            roomId: callRecord.roomId,
            acceptedBy: String(accepter._id),
            acceptedByName: accepter.name,
            status: "ACTIVE",
            startTime: callRecord.startedAt,
        };
        io.to(roomForUser(callRecord.callerId)).emit("call:accepted", acceptedPayload);
        callRecord.participantIds.forEach((participantId) => {
            io.to(roomForUser(participantId)).emit("call:accepted", acceptedPayload);
        });
        io.to(callRecord.roomId).emit("call:accepted", acceptedPayload);

        // Send to both participants for WebRTC connection
        socket.emit("call:ready", {
            callId,
            isInitiator: false,
            roomId: callRecord.roomId,
            peerUserId: String(callRecord.callerId),
        });
    } catch (error) {
        console.error("Accept call error:", error);
        socket.emit("call:error", { message: error.message });
    }
}

async function rejectCall(socket, payload) {
    try {
        const { callId } = payload;
        const rejecter = socket.user;

        const callRecord = await Call.findById(callId);
        if (!callRecord) return;

        callRecord.status = "REJECTED";
        callRecord.endedAt = new Date();
        await callRecord.save();

        // Notify all participants
        const io = socket.nsp.server;
        const rejectedPayload = {
            callId,
            roomId: callRecord.roomId,
            rejectedBy: String(rejecter._id),
            rejectedByName: rejecter.name,
            message: `${rejecter.name} rejected the call`,
        };
        io.to(roomForUser(callRecord.callerId)).emit("call:rejected", rejectedPayload);
        callRecord.participantIds.forEach((participantId) => {
            io.to(roomForUser(participantId)).emit("call:rejected", rejectedPayload);
        });
        io.to(callRecord.roomId).emit("call:rejected", rejectedPayload);

        const summary = await createCallSummaryMessage(callRecord, rejecter.name);
        io.to(callRecord.roomId).emit("chat:message", {
            _id: summary._id,
            roomId: summary.roomId,
            teamId: summary.teamId,
            senderId: summary.senderId,
            senderName: summary.senderName,
            senderRole: summary.senderRole,
            messageType: summary.messageType,
            text: summary.text,
            fileName: summary.fileName,
            fileUrl: summary.fileUrl,
            fileSize: summary.fileSize,
            mimeType: summary.mimeType,
            callData: summary.callData,
            createdAt: summary.createdAt,
        });

        // Clean up session
        activeCallSessions.delete(callId);
    } catch (error) {
        console.error("Reject call error:", error);
        socket.emit("call:error", { message: error.message });
    }
}

async function endCall(socket, payload) {
    try {
        const { callId } = payload;

        const callRecord = await Call.findById(callId);
        if (!callRecord) return;

        callRecord.status = "ENDED";
        callRecord.endedAt = new Date();
        await callRecord.save();

        // Notify all participants
        const io = socket.nsp.server;
        const endedPayload = {
            callId,
            roomId: callRecord.roomId,
            endedBy: String(socket.user._id),
            endedByName: socket.user.name,
            duration: callRecord.duration,
            timestamp: callRecord.endedAt,
        };
        io.to(roomForUser(callRecord.callerId)).emit("call:ended", endedPayload);
        callRecord.participantIds.forEach((participantId) => {
            io.to(roomForUser(participantId)).emit("call:ended", endedPayload);
        });
        io.to(callRecord.roomId).emit("call:ended", endedPayload);

        const summary = await createCallSummaryMessage(callRecord, socket.user.name);
        io.to(callRecord.roomId).emit("chat:message", {
            _id: summary._id,
            roomId: summary.roomId,
            teamId: summary.teamId,
            senderId: summary.senderId,
            senderName: summary.senderName,
            senderRole: summary.senderRole,
            messageType: summary.messageType,
            text: summary.text,
            fileName: summary.fileName,
            fileUrl: summary.fileUrl,
            fileSize: summary.fileSize,
            mimeType: summary.mimeType,
            callData: summary.callData,
            createdAt: summary.createdAt,
        });

        // Clean up session
        activeCallSessions.delete(callId);
    } catch (error) {
        console.error("End call error:", error);
        socket.emit("call:error", { message: error.message });
    }
}

function handleWebRTCSignaling(socket, payload) {
    const { callId, targetUserId, type, data } = payload;

    const io = socket.nsp.server;

    if (!targetUserId) {
        socket.emit("call:error", { message: "Target user is required for signaling" });
        return;
    }

    io.to(roomForUser(targetUserId)).emit("call:webrtc:signal", {
        callId,
        roomId: payload.roomId,
        fromUserId: String(socket.user._id),
        type, // 'offer', 'answer', 'ice-candidate'
        data,
    });
}

function registerCallSocket(io) {
    io.use(async(socket, next) => {
        try {
            // Verify user authentication (JWT already verified in parent middleware)
            if (!socket.user) {
                return next(new Error("User not authenticated"));
            }
            next();
        } catch (error) {
            next(error);
        }
    });

    io.on("connection", (socket) => {
        console.log("User connected to call service:", socket.user.name);
        socket.join(roomForUser(socket.user._id));

        // Call initiation
        socket.on("call:initiate", (payload) => initiateCall(socket, payload));

        // Call acceptance
        socket.on("call:accept", (payload) => acceptCall(socket, payload));

        // Call rejection
        socket.on("call:reject", (payload) => rejectCall(socket, payload));

        // Call termination
        socket.on("call:end", (payload) => endCall(socket, payload));

        // WebRTC Signaling (SDP offers, answers, ICE candidates)
        socket.on("call:signal", (payload) =>
            handleWebRTCSignaling(socket, payload),
        );

        // Call timeout handling
        socket.on("call:timeout", async(payload) => {
            try {
                const { callId } = payload;
                const callRecord = await Call.findById(callId);

                if (callRecord && callRecord.status === "RINGING") {
                    callRecord.status = "MISSED";
                    callRecord.endedAt = new Date();
                    await callRecord.save();

                    const missedPayload = {
                        callId,
                        roomId: callRecord.roomId,
                        missedBy: String(socket.user._id),
                        message: `${socket.user.name} missed the call`,
                    };
                    io.to(roomForUser(callRecord.callerId)).emit("call:missed", missedPayload);
                    callRecord.participantIds.forEach((participantId) => {
                        io.to(roomForUser(participantId)).emit("call:missed", missedPayload);
                    });
                    io.to(callRecord.roomId).emit("call:missed", missedPayload);

                    const summary = await createCallSummaryMessage(callRecord, socket.user.name);
                    io.to(callRecord.roomId).emit("chat:message", {
                        _id: summary._id,
                        roomId: summary.roomId,
                        teamId: summary.teamId,
                        senderId: summary.senderId,
                        senderName: summary.senderName,
                        senderRole: summary.senderRole,
                        messageType: summary.messageType,
                        text: summary.text,
                        fileName: summary.fileName,
                        fileUrl: summary.fileUrl,
                        fileSize: summary.fileSize,
                        mimeType: summary.mimeType,
                        callData: summary.callData,
                        createdAt: summary.createdAt,
                    });

                    activeCallSessions.delete(callId);
                }
            } catch (error) {
                console.error("Call timeout error:", error);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected from call service:", socket.user.name);
        });
    });
}

module.exports = registerCallSocket;
