const mongoose = require('mongoose');

const travelRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: String, required: true },
  purpose: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  estimatedCost: { type: Number },
  status: { type: String, enum: ['Pending', 'Manager Approved', 'HR Approved', 'Rejected'], default: 'Pending' },
  ticketsUrl: { type: String },
  remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('TravelRequest', travelRequestSchema);
