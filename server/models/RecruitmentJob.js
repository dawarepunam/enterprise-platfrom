const mongoose = require("mongoose");

const recruitmentJobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Open", "Closed", "Paused"],
      default: "Open",
    },
    hiringManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    hiringManagerName: { type: String, trim: true, default: "" },
    openings: { type: Number, default: 1 },
    shortlistedCount: { type: Number, default: 0 },
    metadata: {
      source: { type: String, trim: true, default: "HR Desk" },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.RecruitmentJob || mongoose.model("RecruitmentJob", recruitmentJobSchema);
