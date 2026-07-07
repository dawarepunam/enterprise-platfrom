// server/models/Document.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DocumentSchema = new Schema({
  title:       { type: String, required: true },
  description: { type: String },
  filePath:    { type: String, required: true },
  fileType:    { type: String },
  fileSize:    { type: Number },
  projectId:   { type: Schema.Types.ObjectId, ref: 'Project' },
  uploadedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  tags:        [{ type: String }],
  archived:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
