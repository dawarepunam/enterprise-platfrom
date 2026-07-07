const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    projectName: { type: String, trim: true, default: "" },
    roomId: { type: String, trim: true, unique: true, sparse: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    manager: { type: String, trim: true, default: "" },
    teamLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    teamLead: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    status: { type: String, enum: ["Planning", "Active", "On Hold", "Completed"], default: "Planning" },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // UI theming fields
    color: { type: String, trim: true, default: "#2196F3" },
    icon: { type: String, trim: true, default: "fa-users" },
    collaboration: {
      microsoftTeamId: { type: String, trim: true, default: "" },
      groupId: { type: String, trim: true, default: "" },
      teamsWebUrl: { type: String, trim: true, default: "" },
      oneDriveFolder: { type: String, trim: true, default: "" },
      oneDriveFolderId: { type: String, trim: true, default: "" },
      oneDriveShareUrl: { type: String, trim: true, default: "" },
      lastWelcomeMessageAt: { type: Date, default: null },
      defaultChannelIds: [{ type: String, trim: true }],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Team || mongoose.model("Team", teamSchema);
