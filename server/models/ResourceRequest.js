const mongoose = require("mongoose");

const resourceRequestSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    projectName: { type: String, trim: true, default: "" },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    managerName: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, required: true },
    skill: { type: String, trim: true, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    neededBy: { type: Date, default: null },
    reason: { type: String, trim: true, required: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "FULFILLED"], default: "PENDING" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.models.ResourceRequest || mongoose.model("ResourceRequest", resourceRequestSchema);
