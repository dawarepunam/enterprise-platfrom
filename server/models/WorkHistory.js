const mongoose = require("mongoose");

const workHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    actionType: { type: String, trim: true, required: true },
    title: { type: String, trim: true, default: "" },
    details: { type: String, trim: true, default: "" },
    hoursWorked: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.WorkHistory || mongoose.model("WorkHistory", workHistorySchema);
