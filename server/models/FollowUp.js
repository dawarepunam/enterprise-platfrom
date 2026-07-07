const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    salesExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    salesExecutiveName: { type: String, trim: true, default: "" },
    date: { type: Date, required: true },
    status: { type: String, trim: true, default: "Scheduled" },
    reminderType: { type: String, trim: true, default: "Notification" },
    notes: { type: String, trim: true, default: "" },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.models.FollowUp || mongoose.model("FollowUp", followUpSchema);
