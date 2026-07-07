// server/models/Sprint.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SprintSchema = new Schema({
  name:      { type: String, required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  goal:      { type: String },
  status:    { type: String, enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
  tasks:     [{ type: Schema.Types.ObjectId, ref: 'Task' }],
}, { timestamps: true });

module.exports = mongoose.models.Sprint || mongoose.model('Sprint', SprintSchema);
