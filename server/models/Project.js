const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true },
    clientName: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    manager: { type: String, trim: true, default: "" },
    managerEmail: { type: String, trim: true, default: "" },
    managerAssignedAt: { type: Date, default: null },
    teamLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    teamLead: { type: String, trim: true, default: "" },
    teamLeadEmail: { type: String, trim: true, default: "" },
    marketingOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    marketingOwner: { type: String, trim: true, default: "" },
    marketingOwnerEmail: { type: String, trim: true, default: "" },
    teamMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    teamMembers: [{ type: String, trim: true }],
    requirementDocs: [
      {
        name: { type: String, trim: true, default: "" },
        url: { type: String, trim: true, default: "" },
      },
    ],
    objective: { type: String, trim: true, default: "" },
    targetAudience: { type: String, trim: true, default: "" },
    targetLocations: [{ type: String, trim: true }],
    requiredLeads: { type: Number, default: 0 },
    marketingNotes: { type: String, trim: true, default: "" },
    budget: { type: Number, default: 0 },
    requiredTeamSize: { type: Number, default: 0 },

    holdReason: { type: String, default: "" },
    allocatedTeam: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String, trim: true },
        role: { type: String, enum: ["Developer", "Designer", "QA", "Support"], default: "Developer" }
      }
    ],
    milestones: [
      {
        name: { type: String, trim: true },
        status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
        assignedTeamMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        assignedTeamMembers: [{ type: String, trim: true }],
        deadline: { type: Date }
      }
    ],
    progress: { type: Number, min: 0, max: 100, default: 0 },
    documentsCount: { type: Number, default: 0 },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical", "LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "Medium" },
    status: { type: String, enum: ["Draft", "Active", "On Hold", "Completed", "Planning", "Assigned", "Cancelled", "IN_PROGRESS", "IN PROGRESS", "INPROGRESS"], default: "Draft" },
    workflowStage: { type: String, enum: ["Draft", "Assigned", "Completed", "Archived"], default: "Draft" },
    workspaceStatus: { type: String, trim: true, default: "Draft workspace" },
    startDate: { type: Date },
    deadline: { type: Date },
    dueDate: { type: Date, default: null },
    estimatedCompletionDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedByName: { type: String, trim: true, default: "" },
    assignedByRole: { type: String, trim: true, default: "" },
    isReadOnly: { type: Boolean, default: false },
    description: { type: String, trim: true, default: "" },
    projectTeamName: { type: String, trim: true, default: "" },
    teamsWebUrl: { type: String, trim: true, default: "" },
    oneDriveShareUrl: { type: String, trim: true, default: "" },
    meetingLink: { type: String, trim: true, default: "" },
    microsoft: {
      teamId: { type: String, trim: true, default: "" },
      groupId: { type: String, trim: true, default: "" },
      oneDriveFolder: { type: String, trim: true, default: "" },
      shareUrl: { type: String, trim: true, default: "" },
      reviewMeetingType: { type: String, trim: true, default: "Weekly Review Meeting" },
      teamsMeetingUrl: { type: String, trim: true, default: "" },
      defaultChannels: [{ type: String, trim: true }],
      graphSyncStatus: { type: String, trim: true, default: "Pending" },
      lastSyncedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

projectSchema.pre("save", async function () {
  if (this.allocatedTeam && this.allocatedTeam.length) {
    this.teamMemberIds = this.allocatedTeam.map(item => item.userId);
    this.teamMembers = this.allocatedTeam.map(item => item.name);
  }
});

module.exports = mongoose.models.Project || mongoose.model("Project", projectSchema);
