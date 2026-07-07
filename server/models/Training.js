const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Enrolled', 'In Progress', 'Completed'], default: 'Enrolled' },
  completionDate: { type: Date },
  score: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Training', trainingSchema);
