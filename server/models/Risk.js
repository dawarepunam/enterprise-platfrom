// server/models/Risk.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const RiskSchema = new Schema({
  title:       { type: String, required: true },
  description: { type: String },
  projectId:   { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  probability: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  impact:      { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  status:      { type: String, enum: ['OPEN', 'MITIGATED', 'CLOSED'], default: 'OPEN' },
  mitigation:  { type: String },
  owner:       { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Risk', RiskSchema);
