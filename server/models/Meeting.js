const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "MEMBER" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const meetingSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", default: null, index: true },
    roomId: { type: String, trim: true, default: "", index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    module: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    joinUrl: { type: String, trim: true, default: "" },
    meetingType: { type: String, enum: ["VIDEO", "AUDIO"], default: "VIDEO" },
    status: { type: String, enum: ["SCHEDULED", "LIVE", "ENDED"], default: "LIVE" },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedByName: { type: String, trim: true, default: "" },
    participants: [participantSchema],
    scheduledFor: { type: Date, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    microsoft: {
      provider: { type: String, trim: true, default: "" },
      joinUrl: { type: String, trim: true, default: "" },
      eventId: { type: String, trim: true, default: "" },
      webLink: { type: String, trim: true, default: "" },
      organizerEmail: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);
