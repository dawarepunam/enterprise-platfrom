const mongoose = require("mongoose");

const taskTimelineSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userName: { type: String, trim: true, default: "System" },
    action: {
      type: String,
      enum: [
        "CREATED",
        "ASSIGNED",
        "STARTED",
        "PAUSED",
        "RESUMED",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "COMPLETED",
        "CHECKLIST_UPDATED",
        "COMMENT_ADDED",
        "FILE_UPLOADED",
        "STATUS_CHANGED",
        "PRIORITY_CHANGED",
        "DEADLINE_CHANGED",
        "DEPENDENCY_ADDED",
        "DEPENDENCY_REMOVED",
        "SUBTASK_ADDED",
        "SUBTASK_COMPLETED",
        "TIME_LOGGED",
        "REOPENED",
      ],
      required: true,
    },
    details: { type: String, trim: true, default: "" },
    previousValue: { type: String, trim: true, default: "" },
    newValue: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Index for efficient timeline queries
taskTimelineSchema.index({ taskId: 1, createdAt: -1 });

module.exports =
  mongoose.models.TaskTimeline ||
  mongoose.model("TaskTimeline", taskTimelineSchema);
