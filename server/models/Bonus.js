const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['Bonus', 'Arrears', 'Loan'], required: true },
  amount: { type: Number, required: true },
  emi: { type: Number },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  remarks: { type: String },
  attachment: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Bonus', bonusSchema);
