const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  department: { type: String, required: true },
  managerName: { type: String, required: true },
  rating: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  reviewPeriod: { type: String, default: 'Apr 2026 - Mar 2027' },
  technicalSkills: { type: Number, default: 0 },
  communication: { type: Number, default: 0 },
  leadership: { type: Number, default: 0 },
  innovation: { type: Number, default: 0 },
  teamWork: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
