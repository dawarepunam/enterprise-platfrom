const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    type: { type: String, trim: true, default: "INFO" },
    module: { type: String, trim: true, default: "" },
    priority: { type: String, trim: true, default: "medium" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    role: { type: String, trim: true, default: "" },
    read: { type: Boolean, default: false },
    actionUrl: { type: String, trim: true, default: "" },
    entityType: { type: String, trim: true, default: "" },
    entityId: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
