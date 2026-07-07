const mongoose = require("mongoose");

const emailRecordSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    outlookMessageId: { type: String, trim: true, default: "", index: true },
    conversationId: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "" },
    from: { type: String, trim: true, default: "" },
    to: [{ type: String, trim: true }],
    cc: [{ type: String, trim: true }],
    preview: { type: String, trim: true, default: "" },
    receivedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    folder: { type: String, trim: true, default: "inbox" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.EmailRecord || mongoose.model("EmailRecord", emailRecordSchema);
