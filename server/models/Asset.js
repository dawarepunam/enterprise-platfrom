const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['Laptop', 'Mobile', 'Monitor', 'Other'], required: true },
  serialNumber: { type: String, unique: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Available', 'Assigned', 'In Repair', 'Retired'], default: 'Available' },
  condition: { type: String, default: 'Good' },
  assignedDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
