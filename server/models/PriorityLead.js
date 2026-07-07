const mongoose = require("mongoose");

const priorityLeadSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingLead", required: true, index: true },
    leadName: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    priority: { type: String, trim: true, default: "High" },
    deadline: { type: Date, default: null },
    assignedProductManagerName: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "Routed" },
  },
  { timestamps: true, collection: "priorityLeads" },
);

module.exports = mongoose.models.PriorityLead || mongoose.model("PriorityLead", priorityLeadSchema);
