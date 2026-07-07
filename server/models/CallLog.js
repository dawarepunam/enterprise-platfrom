const mongoose = require("mongoose");

const proofSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null },
    name: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    provider: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const callLogSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    salesExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    salesExecutiveName: { type: String, trim: true, default: "" },
    salesExecutiveEmail: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: [
        "Interested",
        "Very Interested",
        "Not Interested",
        "Not Picked",
        "Busy",
        "Switched Off",
        "Wrong Number",
        "Call Back Later",
        "Follow-Up Required",
        "Quotation Sent",
        "Negotiation",
        "Deal Closed",
        "Lost",
      ],
      required: true,
    },
    notes: { type: String, trim: true, default: "" },
    customerRequirement: { type: String, trim: true, default: "" },
    expectedBudget: { type: Number, default: 0 },
    nextFollowUpAt: { type: Date, default: null },
    probability: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    proofs: { type: [proofSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.models.CallLog || mongoose.model("CallLog", callLogSchema);
