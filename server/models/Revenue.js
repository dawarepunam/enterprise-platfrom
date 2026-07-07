const mongoose = require("mongoose");

const revenueSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesDeal", required: true, index: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", default: null },
    salesExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    salesExecutiveName: { type: String, trim: true, default: "" },
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    netRevenue: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["Pending", "Partially Paid", "Paid", "Overdue"], default: "Pending" },
    expectedPaymentDate: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Revenue || mongoose.model("Revenue", revenueSchema);
