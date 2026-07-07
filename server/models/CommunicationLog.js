const mongoose = require("mongoose");

const communicationLogSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    roomId: { type: String, required: true, trim: true },
    communicationType: { type: String, enum: ["CALL", "MEETING"], required: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    initiatedByName: { type: String, trim: true, default: "" },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    targetUserName: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["RINGING", "ACCEPTED", "REJECTED", "MISSED", "COMPLETED", "LIVE"], default: "RINGING" },
    durationSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.CommunicationLog || mongoose.model("CommunicationLog", communicationLogSchema);
