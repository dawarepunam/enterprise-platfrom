// server/models/Resource.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ResourceSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  projectId:   { type: Schema.Types.ObjectId, ref: 'Project' },
  role:        { type: String },
  allocation:  { type: Number, min: 0, max: 100, default: 100 }, // percentage
  startDate:   { type: Date },
  endDate:     { type: Date },
  status:      { type: String, enum: ['ACTIVE', 'ON_HOLD', 'RELEASED'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('Resource', ResourceSchema);
