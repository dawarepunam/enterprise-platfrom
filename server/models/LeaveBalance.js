const mongoose = require("mongoose");

const balanceTypeSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
  },
  { _id: false }
);

const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    year: { type: Number, required: true },
    casual: { type: balanceTypeSchema, default: () => ({ total: 12, used: 0, pending: 0 }) },
    sick: { type: balanceTypeSchema, default: () => ({ total: 12, used: 0, pending: 0 }) },
    earned: { type: balanceTypeSchema, default: () => ({ total: 15, used: 0, pending: 0 }) },
    maternity: { type: balanceTypeSchema, default: () => ({ total: 84, used: 0, pending: 0 }) },
    paternity: { type: balanceTypeSchema, default: () => ({ total: 15, used: 0, pending: 0 }) },
    unpaid: { type: balanceTypeSchema, default: () => ({ total: 365, used: 0, pending: 0 }) },
    comp: { type: balanceTypeSchema, default: () => ({ total: 12, used: 0, pending: 0 }) },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

function mapType(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('casual')) return 'casual';
  if (t.includes('sick')) return 'sick';
  if (t.includes('earned')) return 'earned';
  if (t.includes('comp')) return 'comp';
  if (t.includes('maternity')) return 'maternity';
  if (t.includes('paternity')) return 'paternity';
  return 'unpaid';
}

// Get available balance for a leave type
leaveBalanceSchema.methods.getAvailable = function (type) {
  const bucket = this[mapType(type)];
  if (!bucket) return 0;
  return Math.max(0, bucket.total - bucket.used - bucket.pending);
};

// Add helper to get mapped key
leaveBalanceSchema.methods.getMappedKey = function (type) {
  return mapType(type);
};

module.exports =
  mongoose.models.LeaveBalance ||
  mongoose.model("LeaveBalance", leaveBalanceSchema);
