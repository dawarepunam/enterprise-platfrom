const mongoose = require("mongoose");

const timelineEntrySchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: "activity" },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    actor: { type: String, trim: true, default: "" },
    channel: { type: String, trim: true, default: "" },
    at: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const marketingLeadSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    company: { type: String, trim: true, default: "" },
    requirement: { type: String, trim: true, default: "" },
    budget: { type: Number, default: 0 },
    source: { type: String, trim: true, default: "Manual" },
    status: { type: String, trim: true, default: "New" },
    priority: { type: String, trim: true, default: "Medium" },
    quality: { type: String, trim: true, default: "Cold" },
    aiScore: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", default: null },
    campaignName: { type: String, trim: true, default: "" },
    importId: { type: mongoose.Schema.Types.ObjectId, ref: "LeadImport", default: null },
    importedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    importedBy: { type: String, trim: true, default: "" },
    assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedToName: { type: String, trim: true, default: "" },
    assignedToEmail: { type: String, trim: true, default: "" },
    assignedDepartment: { type: String, trim: true, default: "" },
    assignmentStatus: { type: String, trim: true, default: "Pending" },
    routingStatus: { type: String, trim: true, default: "Pending" },
    routedDepartment: { type: String, trim: true, default: "" },
    routedDepartmentCode: { type: String, trim: true, default: "" },
    routedProductManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    routedProductManagerName: { type: String, trim: true, default: "" },
    routingPriority: { type: String, trim: true, default: "" },
    routingDeadline: { type: Date, default: null },
    routingNotes: { type: String, trim: true, default: "" },
    followUpDate: { type: Date, default: null },
    lastActivityAt: { type: Date, default: Date.now },
    timeline: { type: [timelineEntrySchema], default: [] },
  },
  { timestamps: true, collection: "marketingLeads" },
);

marketingLeadSchema.index({ name: "text", company: "text", phone: "text", email: "text", requirement: "text" });
marketingLeadSchema.index({ phone: 1 });
marketingLeadSchema.index({ email: 1 });

module.exports = mongoose.models.MarketingLead || mongoose.model("MarketingLead", marketingLeadSchema);
