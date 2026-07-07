const mongoose = require("mongoose");

const clarificationSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, trim: true },
  message: { type: String, required: true },
  attachments: [{ name: String, url: String }],
  timestamp: { type: Date, default: Date.now }
});

const riskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  impact: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  probability: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  mitigation: { type: String },
  owner: { type: String },
  status: { type: String, enum: ["Open", "Mitigated", "Accepted"], default: "Open" }
});

const approvalSchema = new mongoose.Schema({
  role: { type: String, required: true }, // e.g., 'Executive', 'Manager', 'Department Head', 'Final Approval'
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedByName: { type: String },
  notes: { type: String },
  timestamp: { type: Date }
});

const departmentReviewSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingLead", index: true },
    departmentLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "DepartmentLead", index: true },
    
    // Extracted for easy access
    company: { type: String, trim: true, required: true },
    requirement: { type: String, trim: true, required: true },
    budget: { type: Number, default: 0 },
    client: { type: String, trim: true },
    timeline: { type: String, trim: true }, // e.g. "3-4 Months"
    
    department: { type: String, trim: true, required: true, index: true },
    
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    status: { 
      type: String, 
      enum: ["Pending", "Under Review", "Clarification", "Approved", "Rejected"], 
      default: "Pending",
      index: true
    },
    
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ownerName: { type: String, trim: true, default: "Unassigned" },
    watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    
    // Workspace Details
    checklist: [{
      label: { type: String, required: true },
      checked: { type: Boolean, default: false },
      checkedBy: { type: String }
    }],
    attachments: [{
      filename: { type: String, required: true },
      url: { type: String, required: true },
      uploadedBy: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    
    // Feasibility Center
    feasibility: {
      technicalScore: { type: Number, default: 0, min: 0, max: 100 },
      resourceScore: { type: Number, default: 0, min: 0, max: 100 },
      financialScore: { type: Number, default: 0, min: 0, max: 100 },
      overallRating: { type: Number, default: 0, min: 0, max: 100 },
      feasibilityStatus: { type: String, enum: ["Pending", "Feasible", "Risky", "Not Feasible"], default: "Pending" }
    },
    
    // Risk Assessment
    risks: [riskSchema],
    
    // Resource Planning
    resources: [{
      role: { type: String },
      allocationPercent: { type: Number, min: 0, max: 100 },
      startDate: { type: Date },
      endDate: { type: Date }
    }],
    
    // Clarification Hub
    clarifications: [clarificationSchema],
    
    // Approval Center
    approvals: [approvalSchema],
    
    // SLA & Timestamps
    lastActionAt: { type: Date, default: Date.now },
    slaBreached: { type: Boolean, default: false }
  },
  { timestamps: true, collection: "departmentReviews" }
);

// Pre-save middleware to auto-calculate feasibility status based on overallRating
departmentReviewSchema.pre("save", async function () {
  if (this.feasibility) {
    const { technicalScore, resourceScore, financialScore } = this.feasibility;
    // Auto calculate overall rating as average
    this.feasibility.overallRating = Math.round((technicalScore + resourceScore + financialScore) / 3);
    
    if (this.feasibility.overallRating >= 75) {
      this.feasibility.feasibilityStatus = "Feasible";
    } else if (this.feasibility.overallRating >= 50) {
      this.feasibility.feasibilityStatus = "Risky";
    } else if (this.feasibility.overallRating > 0) {
      this.feasibility.feasibilityStatus = "Not Feasible";
    } else {
      this.feasibility.feasibilityStatus = "Pending";
    }
  }
});

module.exports = mongoose.models.DepartmentReview || mongoose.model("DepartmentReview", departmentReviewSchema);
