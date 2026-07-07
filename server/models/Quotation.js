const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    projectName: { type: String, trim: true, default: "" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    client: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true, default: "" },
    clientCompany: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    items: {
      type: [
        {
          label: { type: String, trim: true, default: "" },
          quantity: { type: Number, default: 1 },
          unitPrice: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    subtotal: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    validityDays: { type: Number, default: 15 },
    validUntil: { type: Date, default: null },
    terms: { type: String, trim: true, default: "" },
    digitalSignature: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Viewed", "Under Discussion", "Approved", "Rejected", "Expired"],
      default: "Draft",
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    owner: { type: String, trim: true, default: "" },
    ownerEmail: { type: String, trim: true, default: "" },
    dueDate: { type: Date },
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Quotation || mongoose.model("Quotation", quotationSchema);
