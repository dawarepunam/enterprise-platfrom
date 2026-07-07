const mongoose = require('mongoose');

const benefitSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  healthInsurance: {
    provider: String,
    policyNumber: String,
    coverageAmount: Number,
    validUntil: Date
  },
  pfDetails: {
    uan: String,
    pfNumber: String
  },
  perks: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Benefit', benefitSchema);
