const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  month: { type: String, required: true },
  netSalary: { type: Number, required: true },
  pf: { type: Number, required: true },
  tax: { type: Number, required: true },
  status: { type: String, enum: ['Processed', 'Pending', 'Failed'], default: 'Pending' },
  processDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
