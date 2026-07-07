const mongoose = require("mongoose");

const offerLetterSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "CandidateApplication", required: true },
    candidateName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    manager: { type: String, trim: true, default: "" },
    salary: { type: String, trim: true, default: "" },
    joiningDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Declined"],
      default: "Draft",
    },
    sentAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.OfferLetter || mongoose.model("OfferLetter", offerLetterSchema);
