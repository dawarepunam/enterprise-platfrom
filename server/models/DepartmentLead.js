const mongoose = require("mongoose");

const departmentLeadSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingLead", required: true, index: true },
    leadName: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    requirement: { type: String, trim: true, default: "" },
    budget: { type: Number, default: 0 },
    department: { type: String, trim: true, required: true, index: true },
    departmentCode: { type: String, trim: true, default: "" },
    priority: { type: String, trim: true, default: "Medium" },
    assignedProductManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedProductManagerName: { type: String, trim: true, default: "" },
    deadline: { type: Date, default: null },
    status: { type: String, trim: true, default: "New" },
    routedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    routedByName: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true, collection: "departmentLeads" },
);

module.exports = mongoose.models.DepartmentLead || mongoose.model("DepartmentLead", departmentLeadSchema);
