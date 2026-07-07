const mongoose = require("mongoose");

const communicationEntrySchema = new mongoose.Schema(
  {
    clientId: { type: String, trim: true, index: true },
    type: { type: String, trim: true, default: "Call" },
    communicationType: { type: String, trim: true, default: "CALL" },
    title: { type: String, trim: true, default: "" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    clientProjectId: { type: String, trim: true, default: "" },
    projectName: { type: String, trim: true, default: "" },
    owner: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "Pending" },
    time: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    strict: false,
  },
);

module.exports = mongoose.models.CommunicationEntry || mongoose.model("CommunicationEntry", communicationEntrySchema);
