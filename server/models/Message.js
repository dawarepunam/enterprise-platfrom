const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, trim: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", default: null, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, trim: true, default: "MEMBER" },
    messageType: { type: String, enum: ["TEXT", "FILE", "SYSTEM", "LOCATION", "VOICE", "CODE", "IMAGE", "VIDEO", "AUDIO"], default: "TEXT" },
    text: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    fileUrl: { type: String, trim: true, default: "" },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, trim: true, default: "" },
    oneDriveShareUrl: { type: String, trim: true, default: "" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      label: { type: String, trim: true, default: "" },
    },
    metadata: {
      fileCategory: { type: String, trim: true, default: "" },
      codeLanguage: { type: String, trim: true, default: "" },
      voiceDurationSeconds: { type: Number, default: 0 },
      googleMapsUrl: { type: String, trim: true, default: "" },
      microsoftMessageId: { type: String, trim: true, default: "" },
    },
    module: { type: String, trim: true, default: "" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    callData: {
      type: {
        type: String,
        trim: true,
        default: "",
      },
      callId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Call",
        default: null,
      },
      callMode: {
        type: String,
        trim: true,
        default: "",
      },
      status: {
        type: String,
        trim: true,
        default: "",
      },
      startedAt: {
        type: Date,
        default: null,
      },
      endedAt: {
        type: Date,
        default: null,
      },
      duration: {
        type: Number,
        default: 0,
      },
      participantNames: [{ type: String, trim: true }],
      endedByName: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);
