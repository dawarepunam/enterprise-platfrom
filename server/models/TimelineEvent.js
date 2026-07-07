// server/models/TimelineEvent.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const TimelineEventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  // optional type (e.g., milestone, meeting, release)
  type: { type: String, default: 'MILESTONE' }
}, { timestamps: true });

module.exports = mongoose.model('TimelineEvent', TimelineEventSchema);
