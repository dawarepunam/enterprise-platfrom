const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    clientName: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    industry: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    budget: { type: Number, default: 0 },
    deadline: { type: Date, default: null },
    projectType: { type: String, trim: true, default: "Website Projects" },
    requirement: { type: String, trim: true, default: "" },
    projectOverview: { type: String, trim: true, default: "" },
    keyFeatures: [{ type: String, trim: true }],
    painPoints: [{ type: String, trim: true }],
    businessGoals: [{ type: String, trim: true }],
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    assignedTeam: { type: String, trim: true, default: "Product Team" },
    status: {
      type: String,
      enum: ["Pending", "In Review", "Approved", "Rejected", "Changes Requested"],
      default: "Pending",
    },
    source: { type: String, trim: true, default: "Lead Routing" },
    documents: [
      {
        name: { type: String, trim: true, default: "" },
        url: { type: String, trim: true, default: "" },
      },
    ],
    suggestedModules: [{ type: String, trim: true }],
    recommendedStack: {
      frontend: { type: String, trim: true, default: "React.js" },
      backend: { type: String, trim: true, default: "Node.js" },
      database: { type: String, trim: true, default: "MongoDB" },
    },
    estimatedTimelineWeeks: { type: Number, default: 8 },
    estimatedBudget: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: "" },
    lastReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Requirement || mongoose.model("Requirement", requirementSchema);
