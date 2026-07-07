const mongoose = require("mongoose");

const technologyStackSchema = new mongoose.Schema(
  {
    requirementId: { type: mongoose.Schema.Types.ObjectId, ref: "Requirement", default: null },
    frontend: { type: String, trim: true, required: true },
    backend: { type: String, trim: true, required: true },
    database: { type: String, trim: true, required: true },
    rationale: { type: String, trim: true, default: "" },
    isRecommended: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.TechnologyStack || mongoose.model("TechnologyStack", technologyStackSchema);
