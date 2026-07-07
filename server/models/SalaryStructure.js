const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema({
  grade: { type: String, required: true },
  basic: { type: Number, required: true },
  hra: { type: Number, required: true },
  allowances: { type: Number, required: true },
  pf: { type: Number, required: true },
  tax: { type: Number, required: true },
  grossSalary: { type: Number, required: true },
  contractType: { type: String, enum: ['Permanent', 'Contract', 'Intern'], default: 'Permanent' },
  averageCtc: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
