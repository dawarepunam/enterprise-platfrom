const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  department: { type: String },
  totalSalary: { type: Number, required: true },
  status: { type: String, enum: ['Generated', 'Pending Email'], default: 'Generated' },
  filePath: { type: String },
  isPasswordProtected: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Payslip', payslipSchema);
