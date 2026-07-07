const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['Medical', 'Internet', 'Food', 'Travel', 'Other'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  receiptUrl: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Reimbursed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
