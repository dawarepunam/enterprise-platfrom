const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    projectName: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: "" },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    manager: { type: String, trim: true, default: "" },
    managerEmail: { type: String, trim: true, default: "" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lead: { type: String, trim: true, default: "" },
    leadEmail: { type: String, trim: true, default: "" },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignee: { type: String, trim: true, default: "" },
    assigneeEmail: { type: String, trim: true, default: "" },
    assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    assignees: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String, trim: true },
        email: { type: String, trim: true },
        profilePhoto: { type: String, trim: true }
      }
    ],
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: String, trim: true, default: "" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    status: {
      type: String,
      enum: [
        "Planning",
        "Pending",
        "Assigned",
        "Accepted",
        "Active",
        "In Progress",
        "Paused",
        "Submitted for Review",
        "In Review",
        "Completed",
        "Approved",
        "Rejected",
        "On Hold",
        "Archived",
        "To Do",
        "Review",
        "Done",
        "Blocked",
        "Reopened"
      ],
      default: "Planning",
    },
    deadline: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    description: { type: String, trim: true, default: "" },
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    milestone: { type: String, trim: true, default: "" },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    checklist: [
      {
        text: { type: String, trim: true, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date, default: null },
      },
    ],
    attachments: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        uploadedBy: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastReminderSentAt: { type: Date, default: null },
    lastDelayAlertSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.pre("save", async function () {
  if (this.isModified("status") && ["In Progress", "Active", "Done", "Completed", "Approved"].includes(this.status)) {
    if (this.dependencies && this.dependencies.length > 0) {
      const TaskModel = mongoose.models.Task || mongoose.model("Task");
      const incompleteDeps = await TaskModel.find({
        _id: { $in: this.dependencies },
        status: { $nin: ["Done", "Completed", "Approved"] }
      });
      if (incompleteDeps.length > 0) {
        throw new Error(`Blocked by incomplete dependent tasks: ${incompleteDeps.map(d => d.title).join(", ")}`);
      }
    }
  }
});

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);
