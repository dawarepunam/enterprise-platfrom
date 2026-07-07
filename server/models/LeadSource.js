const mongoose = require("mongoose");

const leadSourceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, unique: true },
    category: { type: String, trim: true, default: "Digital" },
    totalLeads: { type: Number, default: 0 },
    hotLeads: { type: Number, default: 0 },
    convertedLeads: { type: Number, default: 0 },
    lastImportedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "leadSources" },
);

module.exports = mongoose.models.LeadSource || mongoose.model("LeadSource", leadSourceSchema);
