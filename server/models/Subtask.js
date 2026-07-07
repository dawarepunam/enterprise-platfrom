const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignee: { type: String, trim: true, default: "" },
    assigneeEmail: { type: String, trim: true, default: "" },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewer: { type: String, trim: true, default: "" },
    reviewerEmail: { type: String, trim: true, default: "" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    status: {
      type: String,
      enum: ["Pending", "Assigned", "Accepted", "Active", "In Review", "Approved", "Rejected", "Completed", "Paused"],
      default: "Pending",
    },
    deadline: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    estimatedHours: { type: Number, min: 0, default: 0 },
    instructions: { type: String, trim: true, default: "" },
    attachments: [{ type: String, trim: true }],
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    roomId: { type: String, trim: true, default: "" },
    submittedAssets: [{ type: String, trim: true }],
    submittedNote: { type: String, trim: true, default: "" },
    timeSpentHours: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Subtask || mongoose.model("Subtask", subtaskSchema);
