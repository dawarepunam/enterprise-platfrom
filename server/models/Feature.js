const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema(
  {
    requirementId: { type: mongoose.Schema.Types.ObjectId, ref: "Requirement", required: true },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    estimatedHours: { type: Number, default: 0 },
    dependencies: [{ type: String, trim: true }],
    group: { type: String, trim: true, default: "Core Features" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Feature || mongoose.model("Feature", featureSchema);
