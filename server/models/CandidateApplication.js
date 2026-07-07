const mongoose = require("mongoose");

const candidateApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    position: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Applied", "Screening", "Interview", "Technical Round", "Offer Sent", "Hired", "Rejected"],
      default: "Applied",
    },
    experience: { type: Number, default: 0 },
    skills: [{ type: String, trim: true }],
    location: { type: String, trim: true, default: "" },
    education: { type: String, trim: true, default: "" },
    expectedSalary: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    resume: {
      fileName: { type: String, trim: true, default: "" },
      fileUrl: { type: String, trim: true, default: "" },
    },
    appliedDate: { type: Date, default: Date.now },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentJob", default: null },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", default: null },
    hiredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, trim: true, default: "HR Desk" },
  },
  { timestamps: true },
);

candidateApplicationSchema.index({ email: 1, position: 1 }, { unique: false });

module.exports = mongoose.models.CandidateApplication || mongoose.model("CandidateApplication", candidateApplicationSchema);
