const mongoose = require("mongoose");

const salesDealSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    company: { type: String, required: true, trim: true },
    contact: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    owner: { type: String, trim: true, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    stage: {
      type: String,
      enum: ["New", "Called", "Interested", "Follow-Up Scheduled", "Requirement Discussed", "Quotation Sent", "Negotiation", "Converted", "Lost"],
      default: "New",
    },
    expectedValue: { type: Number, default: 0 },
    closedValue: { type: Number, default: 0 },
    nextFollowUp: { type: Date },
    notes: { type: String, trim: true, default: "" },
    probability: { type: Number, default: 0 },
    discountRequested: { type: Number, default: 0 },
    revisedAmount: { type: Number, default: 0 },
    finalAgreedPrice: { type: Number, default: 0 },
    paymentTerms: { type: String, trim: true, default: "" },
    paymentStatus: { type: String, enum: ["Pending", "Partially Paid", "Paid", "Overdue"], default: "Pending" },
    expectedPaymentDate: { type: Date, default: null },
    convertedAt: { type: Date, default: null },
    lostReason: { type: String, trim: true, default: "" },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", default: null },
    quotationStatus: { type: String, enum: ["Draft", "Sent", "Viewed", "Under Discussion", "Approved", "Rejected", "Expired", "Not Required"], default: "Draft" },
    stageEnteredAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: null },
    decisionMakerRole: { type: String, trim: true, default: "" },
    decisionMakerName: { type: String, trim: true, default: "" },
    contacts: {
      type: [
        {
          name: { type: String, trim: true, default: "" },
          role: { type: String, trim: true, default: "" },
          email: { type: String, trim: true, default: "" },
          phone: { type: String, trim: true, default: "" },
          influence: { type: String, trim: true, default: "Medium" },
        },
      ],
      default: [],
    },
    stakeholders: {
      type: [
        {
          name: { type: String, trim: true, default: "" },
          role: { type: String, trim: true, default: "" },
          reportsTo: { type: String, trim: true, default: "" },
        },
      ],
      default: [],
    },
    riskReasons: [{ type: String, trim: true }],
    lostCategory: { type: String, trim: true, default: "" },
    approvalStatus: { type: String, enum: ["Not Required", "Pending", "Approved", "Rejected"], default: "Not Required" },
    proposalVersions: {
      type: [
        {
          version: { type: String, trim: true, default: "" },
          amount: { type: Number, default: 0 },
          status: { type: String, trim: true, default: "Draft" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

salesDealSchema.pre("save", function trackStageChange(next) {
  if (this.isModified("stage")) {
    this.stageEnteredAt = new Date();
  }
  if (this.isModified("notes") || this.isModified("stage") || this.isModified("nextFollowUp") || this.isModified("quotationStatus")) {
    this.lastActivityAt = new Date();
  }
  if (Number(this.discountRequested || 0) >= 20 && this.approvalStatus === "Not Required") {
    this.approvalStatus = "Pending";
  }
  next();
});

module.exports = mongoose.models.SalesDeal || mongoose.model("SalesDeal", salesDealSchema);
