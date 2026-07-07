const mongoose = require("mongoose");

const routingHistorySchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketingLead", required: true, index: true },
    leadName: { type: String, trim: true, default: "" },
    action: { type: String, trim: true, default: "Lead Routed" },
    oldDepartment: { type: String, trim: true, default: "" },
    newDepartment: { type: String, trim: true, default: "" },
    oldPriority: { type: String, trim: true, default: "" },
    newPriority: { type: String, trim: true, default: "" },
    oldProductManager: { type: String, trim: true, default: "" },
    newProductManager: { type: String, trim: true, default: "" },
    oldDeadline: { type: Date, default: null },
    newDeadline: { type: Date, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true, collection: "routingHistory" },
);

module.exports = mongoose.models.RoutingHistory || mongoose.model("RoutingHistory", routingHistorySchema);
