const mongoose = require('mongoose');

const exitRecordSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resignationDate: { type: Date, required: true },
  lastWorkingDay: { type: Date, required: true },
  reason: { type: String },
  ktStatus: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  clearanceStatus: { type: String, enum: ['Pending', 'Cleared'], default: 'Pending' },
  status: { type: String, enum: ['Notice Period', 'Relieved'], default: 'Notice Period' }
}, { timestamps: true });

module.exports = mongoose.model('ExitRecord', exitRecordSchema);
