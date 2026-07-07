const mongoose = require("mongoose");

const taskCommentSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, trim: true, default: "" },
    userAvatar: { type: String, trim: true, default: "" },
    userRole: { type: String, trim: true, default: "" },
    content: { type: String, required: true, trim: true },
    mentions: [{ type: String, trim: true }], // @mentioned usernames
    attachments: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        type: { type: String, trim: true, default: "file" },
      },
    ],
    seenBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        seenAt: { type: Date, default: Date.now },
      },
    ],
    isSystemMessage: { type: Boolean, default: false },
    // Legacy compat
    title: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "ACTIVE" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, strict: false }
);

module.exports =
  mongoose.models.TaskComment ||
  mongoose.model("TaskComment", taskCommentSchema);
