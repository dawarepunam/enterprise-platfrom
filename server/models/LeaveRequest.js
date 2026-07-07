const mongoose = require("mongoose");

const approvalActionSchema = new mongoose.Schema(
  {
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actionByName: { type: String, trim: true, default: "" },
    actionAt: { type: Date, default: null },
    status: { type: String, enum: ["Approved", "Rejected", ""], default: "" },
    remarks: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const leaveRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    employee: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "earned", "maternity", "paternity", "unpaid", "other", "Casual Leave", "Sick Leave", "Earned Leave", "Comp Off", "Maternity Leave", "Paternity Leave"],
      required: true,
    },
    fromDate: { type: String, required: true, trim: true }, // YYYY-MM-DD
    toDate: { type: String, required: true, trim: true },
    totalDays: { type: Number, default: 1 },
    reason: { type: String, trim: true, default: "" },
    attachment: { type: String, trim: true, default: "" }, // File URL
    isEmergency: { type: Boolean, default: false },
    emergencyContact: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Pending PM", "Pending HR", "Approved", "Rejected", "Cancelled"],
      default: "Pending PM",
    },
    pmAction: { type: approvalActionSchema, default: () => ({}) },
    hrAction: { type: approvalActionSchema, default: () => ({}) },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: "" },
    // Legacy compatibility
    category: { type: String, trim: true, default: "" },
    name: { type: String, trim: true, default: "" },
  },
  { timestamps: true, strict: false }
);

module.exports =
  mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", leaveRequestSchema);
