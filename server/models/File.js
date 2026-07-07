const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", default: null, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    roomId: { type: String, trim: true, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedByName: { type: String, trim: true, default: "" },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    module: { type: String, trim: true, default: "" },
    entityType: { type: String, trim: true, default: "" },
    entityId: { type: String, trim: true, default: "" },
    provider: { type: String, trim: true, default: "" },
    oneDriveFolder: { type: String, trim: true, default: "" },
    oneDriveItemId: { type: String, trim: true, default: "" },
    oneDriveShareUrl: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.File || mongoose.model("File", fileSchema);
