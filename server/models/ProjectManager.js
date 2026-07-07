const mongoose = require('mongoose');

const ProjectManagerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  department: { type: String },
  phone: { type: String },
  role: { type: String, default: 'PROJECT_MANAGER' },
  settings: {
    theme: { type: String, enum: ['dark', 'light'], default: 'light' },
    notifications: { type: Boolean, default: true },
    privacy: { type: String, enum: ['public', 'private'], default: 'private' }
  }
}, { timestamps: true });

module.exports = mongoose.model('ProjectManager', ProjectManagerSchema);
