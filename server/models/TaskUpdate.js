const mongoose = require("mongoose");

const taskUpdateSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    subtaskId: { type: mongoose.Schema.Types.ObjectId, ref: "Subtask" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    clientTaskId: { type: String, trim: true, default: "" },
    clientSubtaskId: { type: String, trim: true, default: "" },
    clientProjectId: { type: String, trim: true, default: "" },
    author: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "MEMBER" },
    updateType: {
      type: String,
      enum: ["Progress", "Submission", "Review", "Comment", "Manager Report", "Blocker", "Note"],
      default: "Progress",
    },
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Reviewed", "Approved", "Rejected", "Reported", "Risk Reported"],
      default: "Submitted",
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    summary: { type: String, required: true, trim: true },
    attachments: [{ type: String, trim: true }],
    feedback: { type: String, trim: true, default: "" },
    resourceNeed: { type: String, trim: true, default: "" },
  },
  { timestamps: true, strict: false },
);

module.exports = mongoose.models.TaskUpdate || mongoose.model("TaskUpdate", taskUpdateSchema);
