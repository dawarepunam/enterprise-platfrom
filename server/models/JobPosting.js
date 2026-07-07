const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract'], default: 'Full-time' },
  description: { type: String },
  requirements: [{ type: String }],
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('JobPosting', jobPostingSchema);
