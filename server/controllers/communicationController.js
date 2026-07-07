const CommunicationLog = require("../models/CommunicationLog");
const { getAccessibleTeams, assertTeamAccess, ensureTeamRoom } = require("../utils/teamAccess");

async function listLogs(req, res) {
  const teams = await getAccessibleTeams(req.user);
  const teamIds = teams.map((team) => team._id);
  const logs = await CommunicationLog.find({ teamId: { $in: teamIds } }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: logs });
}

async function startCall(req, res) {
  const team = await assertTeamAccess(req.user, req.body.teamId);
  const room = await ensureTeamRoom(team, req.user);

  const call = await CommunicationLog.create({
    teamId: team._id,
    roomId: room.roomId,
    communicationType: "CALL",
    initiatedBy: req.user._id,
    initiatedByName: req.user.name,
    targetUserId: req.body.targetUserId || null,
    targetUserName: req.body.targetUserName || "",
    status: "RINGING",
    metadata: { mode: req.body.mode || "AUDIO" },
  });

  const io = req.app.get("io");
  if (io) {
    io.to(room.roomId).emit("call:incoming", {
      callId: call._id,
      teamId: team._id,
      roomId: room.roomId,
      from: { _id: req.user._id, name: req.user.name, role: req.user.role },
      targetUserId: req.body.targetUserId || null,
      mode: req.body.mode || "AUDIO",
      startedAt: call.startedAt,
    });
  }

  res.status(201).json({ success: true, data: call });
}

async function updateCall(req, res) {
  const call = await CommunicationLog.findById(req.params.id);
  if (!call) {
    return res.status(404).json({ success: false, message: "Call log not found" });
  }

  await assertTeamAccess(req.user, call.teamId);
  call.status = req.body.status || call.status;

  if (req.body.durationSeconds !== undefined) {
    call.durationSeconds = Number(req.body.durationSeconds || 0);
  }

  if (["COMPLETED", "REJECTED", "MISSED"].includes(call.status) && !call.endedAt) {
    call.endedAt = new Date();
  }

  await call.save();

  const io = req.app.get("io");
  if (io) {
    io.to(call.roomId).emit("call:updated", {
      callId: call._id,
      status: call.status,
      durationSeconds: call.durationSeconds,
      endedAt: call.endedAt,
    });
  }

  res.json({ success: true, data: call });
}

module.exports = {
  listLogs,
  startCall,
  updateCall,
};
