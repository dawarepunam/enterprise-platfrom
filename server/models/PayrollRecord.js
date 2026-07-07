const mongoose = require("mongoose");

const payrollRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    employeeName: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    monthKey: { type: String, trim: true, required: true, index: true },
    baseSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    reimbursements: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: { type: String, enum: ["DRAFT", "PROCESSED", "PAID", "HOLD"], default: "DRAFT" },
    paidAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    payslipUrl: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

payrollRecordSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

module.exports = mongoose.models.PayrollRecord || mongoose.model("PayrollRecord", payrollRecordSchema);
