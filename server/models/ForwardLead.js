const mongoose = require("mongoose");

const forwardLeadSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingLead", required: true, index: true },
    forwardedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    forwardedByName: { type: String, trim: true, default: "" },
    targetDepartment: { type: String, trim: true, required: true },
    priority: { type: String, trim: true, default: "Medium" },
    deadline: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "Forwarded" },
  },
  { timestamps: true, collection: "forwardedLeads" },
);

module.exports = mongoose.models.ForwardLead || mongoose.model("ForwardLead", forwardLeadSchema);
