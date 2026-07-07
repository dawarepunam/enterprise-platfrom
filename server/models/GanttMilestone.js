// server/models/GanttMilestone.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const GanttMilestoneSchema = new Schema({
  title: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
}, { timestamps: true });

module.exports = mongoose.model('GanttMilestone', GanttMilestoneSchema);
