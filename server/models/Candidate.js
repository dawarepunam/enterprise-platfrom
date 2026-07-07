const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  resumeUrl: { type: String },
  jobApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting' },
  stage: { type: String, enum: ['Sourced', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Hired', 'Rejected'], default: 'Applied' },
  rating: { type: Number, default: 0 },
  feedback: { type: String },
  bgvStatus: { type: String, enum: ['Pending', 'In Progress', 'Cleared', 'Failed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
