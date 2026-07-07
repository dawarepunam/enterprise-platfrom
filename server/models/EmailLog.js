const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "" },
    templateName: { type: String, trim: true, default: "" },
    relatedModule: { type: String, trim: true, default: "" },
    relatedEntityType: { type: String, trim: true, default: "" },
    relatedEntityId: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
    transportMessageId: { type: String, trim: true, default: "" },
    sentAt: { type: Date, default: null },
    errorMessage: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);
