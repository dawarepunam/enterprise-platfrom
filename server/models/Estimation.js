const mongoose = require("mongoose");

const estimationSchema = new mongoose.Schema(
  {
    requirementId: { type: mongoose.Schema.Types.ObjectId, ref: "Requirement", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    projectName: { type: String, trim: true, default: "" },
    modules: [{ type: String, trim: true }],
    developmentHours: { type: Number, default: 0 },
    testingHours: { type: Number, default: 0 },
    uiCost: { type: Number, default: 0 },
    serverCost: { type: Number, default: 0 },
    maintenanceCost: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    timelineWeeks: { type: Number, default: 0 },
    status: { type: String, enum: ["Draft", "Generated", "Approved"], default: "Generated" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Estimation || mongoose.model("Estimation", estimationSchema);
