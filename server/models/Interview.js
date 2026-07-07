const mongoose = require("mongoose");

const panelSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const interviewSchema = new mongoose.Schema(
  {
    candidateName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    position: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    stage: { type: String, trim: true, default: "Screening" },
    status: {
      type: String,
      enum: ["SCHEDULED", "RESCHEDULED", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 45 },
    meetingJoinUrl: { type: String, trim: true, default: "" },
    calendarEventId: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    panelMembers: { type: [panelSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Interview || mongoose.model("Interview", interviewSchema);
