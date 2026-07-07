// server/models/Discussion.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReplySchema = new Schema({
  author:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
}, { timestamps: true });

const DiscussionSchema = new Schema({
  title:     { type: String, required: true },
  content:   { type: String, required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  taskId:    { type: Schema.Types.ObjectId, ref: 'Task' },
  author:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  replies:   [ReplySchema],
  status:    { type: String, enum: ['OPEN', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
  pinned:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Discussion', DiscussionSchema);
