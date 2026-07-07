const mongoose = require("mongoose");

const leadAssignmentSchema = new mongoose.Schema(
  {
    leadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MarketingLead", required: true }],
    assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedToName: { type: String, trim: true, default: "" },
    assignedToEmail: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    priority: { type: String, trim: true, default: "Medium" },
    followUpDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    assignedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedBy: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "Assigned" },
  },
  { timestamps: true, collection: "leadAssignments" },
);

module.exports = mongoose.models.LeadAssignment || mongoose.model("LeadAssignment", leadAssignmentSchema);
